$sourceRoot = Join-Path $PSScriptRoot '..\mini-app\assets\frog'
$outputRoot = Join-Path $sourceRoot 'doubled'
New-Item -ItemType Directory -Force -Path $outputRoot | Out-Null

$ffmpeg = (Get-Command ffmpeg -ErrorAction Stop).Source
$states = 'idle', 'drink', 'read', 'smoke', 'sleep'
$transitions = 'idle-to-drink', 'drink-to-read', 'read-to-smoke', 'smoke-to-sleep', 'sleep-to-idle'

# Each 11-frame state becomes 22 motion-interpolated frames.
$stateFilter = "crop=443:591:x='mod(n,11)*443':y=0,minterpolate=fps=24:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1,tile=22x1"
foreach ($state in $states) {
  & $ffmpeg -hide_banner -loglevel error -y -loop 1 -framerate 12 -t 0.916667 `
    -i (Join-Path $sourceRoot "smooth\$state-smooth.png") `
    -vf $stateFilter -frames:v 1 (Join-Path $outputRoot "$state-22.png")
  if ($LASTEXITCODE -ne 0) { throw "Motion interpolation failed for $state" }
}

# Each 3x2 transition grid becomes one horizontal 12-frame strip.
$transitionFilter = "crop=443:591:x='mod(n,3)*443':y='floor(mod(n,6)/3)*591',minterpolate=fps=24:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1,tile=12x1"
foreach ($transition in $transitions) {
  & $ffmpeg -hide_banner -loglevel error -y -loop 1 -framerate 12 -t 0.5 `
    -i (Join-Path $sourceRoot "transitions\final\$transition.png") `
    -vf $transitionFilter -frames:v 1 (Join-Path $outputRoot "$transition-12.png")
  if ($LASTEXITCODE -ne 0) { throw "Motion interpolation failed for $transition" }
}

Get-ChildItem $outputRoot -Filter '*.png' | ForEach-Object {
  $webpPath = [System.IO.Path]::ChangeExtension($_.FullName, '.webp')
  & $ffmpeg -hide_banner -loglevel error -y -i $_.FullName -c:v libwebp -quality 86 $webpPath
  if ($LASTEXITCODE -ne 0) { throw "WebP conversion failed for $($_.Name)" }
}

Write-Output "Motion-interpolated sprite sheets written to $outputRoot"
