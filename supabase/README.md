# Turning on accounts and friends

Mapbloom ships with accounts **switched off**: until you fill in two values, the Account and Friends rows do not appear and nothing leaves the device.

## 1. Create the Supabase project (about 10 minutes)
1. Sign up at supabase.com and create a project (any region near your players; keep the database password somewhere safe).
2. **SQL Editor -> New query**: paste all of `schema.sql` and press **Run**. It should finish with "Success". It creates the tables, locks them down with row level security, and adds the database functions the game calls. (Safe to run again.)
3. **Authentication -> Providers -> Email**: keep it enabled (the one-time code is what proves the address).
4. **Authentication -> URL Configuration**: set **Site URL** to your GitHub Pages address (for example `https://ceswift7.github.io/mapbloom/`) and add the same address under **Redirect URLs**.
5. **Authentication -> Email Templates -> Magic Link**: make sure the body contains the code as well as the link, for example:
   `Your Mapbloom code is {{ .Token }}` followed by `<a href="{{ .ConfirmationURL }}">or tap here to sign in</a>`.
6. **Email delivery:** Supabase's built-in sender only allows a handful of emails per hour, which is fine for testing but not for real players. Under **Authentication -> SMTP Settings** connect a free provider (Resend, Brevo, Mailgun...) and set a sender address you control.

## 2. Give the game the two public values
**Project Settings -> API**: copy the **Project URL** and the **anon public** key into `config.js`:

```js
const MB_CLOUD={url:"https://YOURPROJECT.supabase.co",key:"eyJ...the anon key..."};
```
The anon key is meant to be public. **Never** put the `service_role` key anywhere in the game.
Then run `build.ps1 -Release` and publish as usual.

## 3. What the database lets a player do
- Read and write **their own** cloud save; read their own profile.
- Everything else (friends, stats, records, daily results, challenges) is reachable **only through the functions** in `schema.sql`, which return a friend's numbers only when you are accepted friends and they allow sharing. Usernames cannot be listed or searched, only looked up exactly.
- Race times are bounds-checked (5 s to 1 h) and Hot & cold bests (1 to 200 guesses) before they are stored, and a challenge result can be sent once per player.

## 4. Checking it works
Sign in with two different emails in two browsers, give each a username, add each other, finish a Race, and look at Friends -> Leaderboard. The tables themselves refuse direct reads of other players' rows, so a signed-in player cannot browse anyone else's data.
