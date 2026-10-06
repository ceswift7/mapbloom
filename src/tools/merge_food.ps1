# Merges food.json (made by fetch_food.ps1 -Build) into ..\learn.js as the FOOD block, without calling Wikipedia again.
$ErrorActionPreference='Stop'
$d=$PSScriptRoot; $u=New-Object Text.UTF8Encoding $false
$j=Get-Content "$d\food.json" -Raw -Encoding UTF8 | ConvertFrom-Json
$skip=@('020')   # Andorra: the only cuisine article found is Catalonia's
$parts=@()
foreach($p in $j.PSObject.Properties){ if($skip -contains $p.Name){continue}; $parts+=('"{0}":{{"t":{1},"x":{2}}}' -f $p.Name,(ConvertTo-Json $p.Value.t -Compress),(ConvertTo-Json $p.Value.x -Compress)) }
$lj=[IO.File]::ReadAllText("$d\..\learn.js",[Text.Encoding]::UTF8)
$k=$lj.IndexOf("`nconst FOOD="); if($k -ge 0){$lj=$lj.Substring(0,$k)}
$lj=$lj.TrimEnd("`r","`n")+"`nconst FOOD={"+($parts -join ",")+"};`n"
[IO.File]::WriteAllText("$d\..\learn.js",$lj,$u)
"FOOD block written: "+$parts.Count+" countries"