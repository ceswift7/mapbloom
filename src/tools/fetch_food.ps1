# One-time helper: finds the Wikipedia "cuisine" article for each country and keeps its intro (CC BY-SA 4.0).
#   step 1 (default)  : writes food_candidates.txt  (country -> search hits that look like cuisine articles) for manual review
#   step 2 (-Build)   : reads food_picks.txt (id<TAB>article title, edited by hand) and writes food.json + the FOOD block for learn.js
# Run from this folder:  .\fetch_food.ps1   then   .\fetch_food.ps1 -Build
param([switch]$Build)
$ErrorActionPreference='Stop'
[Console]::OutputEncoding=[Text.Encoding]::UTF8
$d=$PSScriptRoot; $u=New-Object Text.UTF8Encoding $false
$learn=[IO.File]::ReadAllText("$d\..\learn.js",[Text.Encoding]::UTF8)
$names=[ordered]@{}
[regex]::Matches($learn,'"(\d{3})":\{"t":"([^"]*)"') | ForEach-Object { $names[$_.Groups[1].Value]=$_.Groups[2].Value }
$api="https://en.wikipedia.org/w/api.php"
$hdr=@{"User-Agent"="Mapbloom-food-fetch/1.0 (https://github.com/ceswift7/mapbloom)"}
function Api($q){ Invoke-RestMethod -Uri ($api+"?format=json&formatversion=2&"+$q) -Headers $hdr }

if(-not $Build){
  $lines=@()
  foreach($id in $names.Keys){
    $nm=($names[$id] -replace '\s*\(.*\)$','') -replace '^The ',''
    $r=Api ("action=query&list=search&srnamespace=0&srlimit=8&srsearch="+[uri]::EscapeDataString("$nm cuisine"))
    $hits=@($r.query.search | Where-Object { $_.title -match 'cuisine' } | ForEach-Object { $_.title })
    $lines+=("{0}`t{1}`t{2}" -f $id,$names[$id],($hits -join " | "))
    Start-Sleep -Milliseconds 120
  }
  [IO.File]::WriteAllLines("$d\food_candidates.txt",$lines,$u)
  "wrote food_candidates.txt ("+$lines.Count+" rows)"
  return
}

# ---- build: intro text of each picked article, trimmed at a sentence boundary (~700 chars, at most two paragraphs)
$picks=@{}
Get-Content "$d\food_picks.txt" -Encoding UTF8 | Where-Object { $_ -and -not $_.StartsWith('#') } | ForEach-Object { $p=$_ -split "`t"; if($p.Count -ge 2 -and $p[1].Trim()){ $picks[$p[0]]=$p[1].Trim() } }
function Trim-Intro($t){
  $t=($t -replace '\[\d+\]','' -replace '\r','')
  for($n=0;$n -lt 3;$n++){ $t=[regex]::Replace($t,'\s*\(\s*[A-Z][A-Za-z\- ]*:[^()]*\)','') }   # language-label parentheses: (Arabic: ...), (UK: , US: )
  $t=[regex]::Replace($t,'\s*\([^()]*[^\x00-\u024F\u2000-\u206F][^()]*\)','') -replace '  +',' '
  $paras=@($t -split "`n+" | ForEach-Object { $_.Trim() } | Where-Object { $_ })
  $out=''
  foreach($p in $paras){
    if($out.Length -ge 420){break}
    if($out){$out+="`n"}
    $out+=$p
    if($out.Length -ge 900){break}
  }
  if($out.Length -gt 760){
    $cut=$out.Substring(0,760); $i=[Math]::Max($cut.LastIndexOf('. '),$cut.LastIndexOf(".`n"))
    if($i -gt 300){$out=$cut.Substring(0,$i+1)}
  }
  $out
}
$res=[ordered]@{}
foreach($id in $names.Keys){
  if(-not $picks.ContainsKey($id)){continue}
  $r=Api ("action=query&prop=extracts&exintro=1&explaintext=1&redirects=1&titles="+[uri]::EscapeDataString($picks[$id]))
  $pg=$r.query.pages[0]
  if($pg.missing -or -not $pg.extract){ "no extract for $id $($picks[$id])"; continue }
  $x=Trim-Intro $pg.extract
  if($pg.title -notmatch 'cuisine'){ "skipped (not a cuisine article) $id -> $($pg.title)"; continue }
  $res[$id]=@{t=$pg.title;x=$x}
  Start-Sleep -Milliseconds 120
}
$json=$res | ConvertTo-Json -Depth 4
[IO.File]::WriteAllText("$d\food.json",$json,$u)
"food entries: "+$res.Count

# ---- merge into learn.js as a separate FOOD block (id -> {t: article title, x: text}); LEARN itself is left untouched
$skip=@('020')   # Andorra: the only cuisine article found is Catalonia's
$parts=@()
foreach($id in $res.Keys){ if($skip -contains $id){continue}; $parts+=('"{0}":{{"t":{1},"x":{2}}}' -f $id,(ConvertTo-Json $res[$id].t -Compress),(ConvertTo-Json $res[$id].x -Compress)) }
$block="`nconst FOOD={"+($parts -join ",")+"};`n"
$lj=[IO.File]::ReadAllText("$d\..\learn.js",[Text.Encoding]::UTF8)
$k=$lj.IndexOf("`nconst FOOD=")
if($k -ge 0){$lj=$lj.Substring(0,$k)}
$lj=$lj.TrimEnd("`r","`n")+"`n"+$block.TrimStart("`n")
[IO.File]::WriteAllText("$d\..\learn.js",$lj,$u)
"FOOD block written: "+$parts.Count+" countries"