-- ============================================================================
-- Mapbloom accounts, cloud save and friends: run this whole file once in the
-- Supabase SQL editor (Project -> SQL Editor -> New query -> paste -> Run).
-- Design: tables are locked down with Row Level Security. The game talks to them
-- almost entirely through the SECURITY DEFINER functions below, so a signed-in
-- player can only ever read what a function chooses to return (their own data,
-- and the shared stats of accepted friends who allow sharing).
-- ============================================================================

-- ---------- tables ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9_]{3,20}$'),
  share_progress boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.saves (
  user_id uuid primary key references auth.users on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.stats (
  user_id uuid primary key references auth.users on delete cascade,
  found int not null default 0,
  studied int not null default 0,
  mastered int not null default 0,
  stamps int not null default 0,
  streak int not null default 0,
  best_streak int not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.records (
  user_id uuid not null references auth.users on delete cascade,
  key text not null check (length(key) <= 80),
  best int not null check (best > 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);

create table if not exists public.daily_results (
  user_id uuid not null references auth.users on delete cascade,
  day date not null,
  kind text not null check (kind in ('ten', 'hot')),
  marks text not null default '' check (length(marks) <= 60),
  score int not null default 0,
  time_ms int,
  primary key (user_id, day, kind)
);

create table if not exists public.friendships (
  requester uuid not null references auth.users on delete cascade,
  addressee uuid not null references auth.users on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  primary key (requester, addressee),
  check (requester <> addressee)
);
create unique index if not exists friendships_pair
  on public.friendships (least(requester, addressee), greatest(requester, addressee));

create table if not exists public.challenges (
  id uuid primary key default gen_random_uuid(),
  from_user uuid not null references auth.users on delete cascade,
  to_user uuid not null references auth.users on delete cascade,
  kind text not null default 'race' check (kind in ('race')),
  config jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists public.challenge_results (
  challenge_id uuid not null references public.challenges on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  time_ms int not null check (time_ms > 0),
  created_at timestamptz not null default now(),
  primary key (challenge_id, user_id)
);

-- ---------- row level security ----------
alter table public.profiles enable row level security;
alter table public.saves enable row level security;
alter table public.stats enable row level security;
alter table public.records enable row level security;
alter table public.daily_results enable row level security;
alter table public.friendships enable row level security;
alter table public.challenges enable row level security;
alter table public.challenge_results enable row level security;

-- A player may read their own profile and their own cloud save, and write the save. Everything else is function-only.
drop policy if exists "own profile read" on public.profiles;
create policy "own profile read" on public.profiles for select to authenticated using (id = auth.uid());
drop policy if exists "own save read" on public.saves;
create policy "own save read" on public.saves for select to authenticated using (user_id = auth.uid());
drop policy if exists "own save insert" on public.saves;
create policy "own save insert" on public.saves for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "own save update" on public.saves;
create policy "own save update" on public.saves for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

revoke all on all tables in schema public from anon, authenticated;
grant select on public.profiles to authenticated;
grant select, insert, update on public.saves to authenticated;

-- ---------- helpers ----------
create or replace function public.is_friend(a uuid, b uuid) returns boolean
language sql security definer set search_path = public stable as $$
  select exists (
    select 1 from public.friendships
    where status = 'accepted'
      and ((requester = a and addressee = b) or (requester = b and addressee = a)));
$$;

-- ---------- accounts ----------
create or replace function public.claim_username(p text) returns text
language plpgsql security definer set search_path = public as $$
declare u text := lower(trim(p));
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  if u !~ '^[a-z0-9_]{3,20}$' then raise exception 'Use 3 to 20 letters, numbers or underscores.'; end if;
  if u ~ '(fuck|shit|cunt|nigg|fag|rape|nazi|whore|bitch|dick)' then raise exception 'Please pick a different name.'; end if;
  begin
    insert into public.profiles (id, username) values (auth.uid(), u)
    on conflict (id) do update set username = excluded.username;
  exception when unique_violation then
    raise exception 'That name is taken.';
  end;
  return u;
end $$;

create or replace function public.set_sharing(p boolean) returns void
language sql security definer set search_path = public as $$
  update public.profiles set share_progress = p where id = auth.uid();
$$;

create or replace function public.delete_account() returns void
language plpgsql security definer set search_path = public, auth as $$
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  delete from auth.users where id = auth.uid();   -- every table above cascades from this
end $$;

-- ---------- friends ----------
create or replace function public.find_user(p text) returns table (id uuid, username text)
language sql security definer set search_path = public stable as $$
  select pr.id, pr.username from public.profiles pr
  where pr.username = lower(trim(p)) and pr.id <> auth.uid() and auth.uid() is not null;
$$;

create or replace function public.send_request(p text) returns text
language plpgsql security definer set search_path = public as $$
declare t uuid; recent int;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  select id into t from public.profiles where username = lower(trim(p));
  if t is null then raise exception 'No player with that username.'; end if;
  if t = auth.uid() then raise exception 'That is you.'; end if;
  select count(*) into recent from public.friendships where requester = auth.uid() and created_at > now() - interval '1 hour';
  if recent >= 20 then raise exception 'Too many requests. Try again later.'; end if;
  if exists (select 1 from public.friendships where requester = t and addressee = auth.uid()) then
    update public.friendships set status = 'accepted' where requester = t and addressee = auth.uid();
    return 'accepted';
  end if;
  if exists (select 1 from public.friendships where requester = auth.uid() and addressee = t) then
    return 'already';
  end if;
  insert into public.friendships (requester, addressee) values (auth.uid(), t);
  return 'sent';
end $$;

create or replace function public.respond_request(p_requester uuid, p_accept boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_accept then
    update public.friendships set status = 'accepted' where requester = p_requester and addressee = auth.uid();
  else
    delete from public.friendships where requester = p_requester and addressee = auth.uid() and status = 'pending';
  end if;
end $$;

create or replace function public.remove_friend(p uuid) returns void
language sql security definer set search_path = public as $$
  delete from public.friendships
  where (requester = auth.uid() and addressee = p) or (requester = p and addressee = auth.uid());
$$;

create or replace function public.my_friends()
returns table (friend_id uuid, username text, shared boolean, found int, studied int, mastered int, stamps int, streak int, best_streak int)
language sql security definer set search_path = public stable as $$
  select pr.id, pr.username, pr.share_progress,
         case when pr.share_progress then s.found end, case when pr.share_progress then s.studied end,
         case when pr.share_progress then s.mastered end, case when pr.share_progress then s.stamps end,
         case when pr.share_progress then s.streak end, case when pr.share_progress then s.best_streak end
  from public.friendships f
  join public.profiles pr on pr.id = case when f.requester = auth.uid() then f.addressee else f.requester end
  left join public.stats s on s.user_id = pr.id
  where f.status = 'accepted' and (f.requester = auth.uid() or f.addressee = auth.uid())
  order by pr.username;
$$;

create or replace function public.my_requests() returns table (user_id uuid, username text, direction text)
language sql security definer set search_path = public stable as $$
  select case when f.requester = auth.uid() then f.addressee else f.requester end,
         pr.username,
         case when f.requester = auth.uid() then 'out' else 'in' end
  from public.friendships f
  join public.profiles pr on pr.id = case when f.requester = auth.uid() then f.addressee else f.requester end
  where f.status = 'pending' and (f.requester = auth.uid() or f.addressee = auth.uid())
  order by f.created_at desc;
$$;

-- ---------- sharing your numbers ----------
create or replace function public.sync_stats(p jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare n int := 0;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  insert into public.stats (user_id, found, studied, mastered, stamps, streak, best_streak, updated_at)
  values (auth.uid(),
    least(greatest(coalesce((p->>'found')::int, 0), 0), 400), least(greatest(coalesce((p->>'studied')::int, 0), 0), 400),
    least(greatest(coalesce((p->>'mastered')::int, 0), 0), 400), least(greatest(coalesce((p->>'stamps')::int, 0), 0), 200),
    least(greatest(coalesce((p->>'streak')::int, 0), 0), 5000), least(greatest(coalesce((p->>'best_streak')::int, 0), 0), 5000), now())
  on conflict (user_id) do update set found = excluded.found, studied = excluded.studied, mastered = excluded.mastered,
    stamps = excluded.stamps, streak = excluded.streak, best_streak = excluded.best_streak, updated_at = now();
end $$;

create or replace function public.sync_daily(p jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare it jsonb; n int := 0;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  for it in select * from jsonb_array_elements(p) loop
    n := n + 1; exit when n > 30;
    if (it->>'kind') in ('ten', 'hot') and (it->>'day')::date between current_date - 14 and current_date + 1 then
      insert into public.daily_results (user_id, day, kind, marks, score, time_ms)
      values (auth.uid(), (it->>'day')::date, it->>'kind', left(coalesce(it->>'marks', ''), 60),
              least(greatest(coalesce((it->>'score')::int, 0), 0), 1000), nullif((it->>'time_ms')::int, 0))
      on conflict (user_id, day, kind) do nothing;   -- a day's result is final
    end if;
  end loop;
end $$;

-- Race bests are kept as the lowest time; Hot & cold as the fewest guesses. Out-of-range values are ignored.
create or replace function public.submit_records(p jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare it jsonb; n int := 0; k text; b int;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  for it in select * from jsonb_array_elements(p) loop
    n := n + 1; exit when n > 80;
    k := left(it->>'key', 80); b := (it->>'best')::int;
    if k like 'race:%' and b between 5000 and 3600000 then null;
    elsif k like 'hot:%' and b between 1 and 200 then null;
    else continue; end if;
    insert into public.records (user_id, key, best) values (auth.uid(), k, b)
    on conflict (user_id, key) do update set best = least(public.records.best, excluded.best), updated_at = now();
  end loop;
end $$;

create or replace function public.leaderboard(p_key text) returns table (username text, best int, is_me boolean)
language sql security definer set search_path = public stable as $$
  select pr.username, r.best, pr.id = auth.uid()
  from public.records r join public.profiles pr on pr.id = r.user_id
  where r.key = p_key and auth.uid() is not null
    and (pr.id = auth.uid() or (pr.share_progress and public.is_friend(auth.uid(), pr.id)))
  order by r.best asc, pr.username
  limit 50;
$$;

create or replace function public.friends_daily(p_day date) returns table (username text, kind text, marks text, score int, time_ms int, is_me boolean)
language sql security definer set search_path = public stable as $$
  select pr.username, d.kind, d.marks, d.score, d.time_ms, pr.id = auth.uid()
  from public.daily_results d join public.profiles pr on pr.id = d.user_id
  where d.day = p_day and auth.uid() is not null
    and (pr.id = auth.uid() or (pr.share_progress and public.is_friend(auth.uid(), pr.id)))
  order by d.kind, d.score desc, d.time_ms nulls last;
$$;

-- ---------- challenges (same race, same order, compare times) ----------
create or replace function public.send_challenge(p_to uuid, p_config jsonb) returns uuid
language plpgsql security definer set search_path = public as $$
declare cid uuid; recent int;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  if not public.is_friend(auth.uid(), p_to) then raise exception 'You can only challenge friends.'; end if;
  if length(p_config::text) > 400 then raise exception 'bad challenge'; end if;
  select count(*) into recent from public.challenges where from_user = auth.uid() and created_at > now() - interval '1 hour';
  if recent >= 20 then raise exception 'Too many challenges. Try again later.'; end if;
  insert into public.challenges (from_user, to_user, config) values (auth.uid(), p_to, p_config) returning id into cid;
  return cid;
end $$;

create or replace function public.my_challenges()
returns table (id uuid, from_name text, to_name text, config jsonb, created_at timestamptz, incoming boolean, mine_ms int, theirs_ms int)
language sql security definer set search_path = public stable as $$
  select c.id, pf.username, pt.username, c.config, c.created_at, c.to_user = auth.uid(),
         (select r.time_ms from public.challenge_results r where r.challenge_id = c.id and r.user_id = auth.uid()),
         (select r.time_ms from public.challenge_results r where r.challenge_id = c.id and r.user_id <> auth.uid())
  from public.challenges c
  join public.profiles pf on pf.id = c.from_user
  join public.profiles pt on pt.id = c.to_user
  where auth.uid() in (c.from_user, c.to_user)
  order by c.created_at desc
  limit 30;
$$;

create or replace function public.submit_challenge_result(p_id uuid, p_ms int) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  if p_ms not between 5000 and 3600000 then raise exception 'bad time'; end if;
  if not exists (select 1 from public.challenges where id = p_id and auth.uid() in (from_user, to_user)) then
    raise exception 'not your challenge';
  end if;
  insert into public.challenge_results (challenge_id, user_id, time_ms) values (p_id, auth.uid(), p_ms)
  on conflict (challenge_id, user_id) do nothing;   -- one attempt each
end $$;

-- ---------- who may call what ----------
revoke all on all functions in schema public from public, anon;
grant execute on function
  public.claim_username(text), public.set_sharing(boolean), public.delete_account(),
  public.find_user(text), public.send_request(text), public.respond_request(uuid, boolean), public.remove_friend(uuid),
  public.my_friends(), public.my_requests(), public.sync_stats(jsonb), public.sync_daily(jsonb), public.submit_records(jsonb),
  public.leaderboard(text), public.friends_daily(date), public.send_challenge(uuid, jsonb), public.my_challenges(),
  public.submit_challenge_result(uuid, int)
to authenticated;
