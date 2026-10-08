# Rebuilds ..\Mapbloom.html from the parts in this folder.
#   -Debug    also writes Mapbloom.debug.html with a window.__tw test hook
#   -Release  leaves the temporary dev menu (dev.js) out
param([switch]$Debug,[switch]$Release)
$d=$PSScriptRoot; $u=New-Object Text.UTF8Encoding $false
function ReadPart($n){[IO.File]::ReadAllText("$d\$n",[Text.Encoding]::UTF8)}
$main=ReadPart "main.html"
# source parts: a marker line  /*@include name.js*/  in main.html is replaced by that file, so the single-file output is unchanged
$main=[regex]::Replace($main,'/\*@include (\S+?)\*/\r?\n',{param($m)ReadPart $m.Groups[1].Value})
if(Test-Path "$d\glglobe.js"){ $gl=ReadPart "glglobe.js"; $main=$main.Replace("`n})();`n</script>","`n$gl`n})();`n</script>") }
if(-not $Release -and (Test-Path "$d\dev.js")){ $dev=ReadPart "dev.js"; $main=$main.Replace("`n})();`n</script>","`n$dev`n})();`n</script>") }
$parts={param($m)(ReadPart "head.html")+(ReadPart "data.html")+"`n<script>`n/* real flag images (flagcdn.com), embedded so the game works offline */`n"+(ReadPart "flags.js")+"`n</script>`n<script>`n/* country reading pages: text adapted from Wikipedia (CC BY-SA 4.0); population etc. from Wikidata (CC0) */`n"+(ReadPart "learn.js")+"`n</script>`n<script>`n/* authored quiz facts */`n"+(((@("quiz.js")+@(Get-ChildItem "$d\quiz_*.js" | Sort-Object Name | ForEach-Object Name)) | ForEach-Object { ReadPart $_ }) -join "`n")+"`n</script>`n"+$m}
$root=Split-Path $d
[IO.File]::WriteAllText("$root\Mapbloom.html",(& $parts $main),$u)
"built "+(Get-Item "$root\Mapbloom.html").Length+" bytes"+$(if($Release){" (release, no dev menu)"}else{""})
if($Debug){
  $hook="window.__tw={get GP(){return typeof GP!=='undefined'?GP:null},get GLX(){return GLX},get prof(){return renderNow.prof},get CANVAS(){return CANVAS},hitCountry,S,R,D,REC,features,playable,byId,paths,projection,get zoomK(){return zoomK},setMode,speedGuess,guess,tap,startRace,showCard,renderStamps,renderSettings,paint,render,flyTo,stopDrift,renderLearn,AC:()=>actx,MUS,FACTS,LEARN,FLAGS,get drifting(){return drifting},pathC,projC,get lodLvl(){return lodLvl},get moving(){return moving},buildMid,BEACON,doReset,markMoving,requestRender,focusFor,onScreen,outlineFig,get topo10(){return topo10},load10,artCanvas,artSpec,ensureArt,FX,warmArt,startReveal,nextRound,get animating(){return animating},setPeek,toast,checkAch,renderMastery,qBuild,qCapital,qFlag,showResults,qExam,exMatch,exYear,QT,QZ,mqStart,get mq(){return mq},jrQSecs,jrMark,jrLevel,jrDone,jrTotal,C,nbPath,startChain,chainGuess,chainStep,get introState(){return introState},confetti,csOf,hotDailyTarget,buzz,HOT,HC,hotStart,hotGuess,hotDist,hotResolve,hotEnter};"
  $dm=$main.Replace("`n})();`n</script>","`n$hook`n})();`n</script>")
  $dbg=(& $parts $dm).Replace('<script src="https://cdnjs.cloudflare.com/ajax/libs/d3','<script>if(/raf=timeout/.test(location.search)){window.requestAnimationFrame=function(cb){return setTimeout(function(){cb(performance.now())},16)}}</script><script src="https://cdnjs.cloudflare.com/ajax/libs/d3')
  [IO.File]::WriteAllText("$root\Mapbloom.debug.html",$dbg,$u)
  "debug build written"
}