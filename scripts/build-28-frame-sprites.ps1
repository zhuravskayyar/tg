Add-Type -AssemblyName System.Drawing

$frogRoot = Join-Path $PSScriptRoot '..\mini-app\assets\frog'
$generatedRoot = Join-Path $frogRoot 'generated-six'
$outputRoot = Join-Path $frogRoot 'final-28'
New-Item -ItemType Directory -Force -Path $outputRoot | Out-Null

function Get-AlphaBounds {
  param([System.Drawing.Bitmap]$Bitmap)
  $minX = $Bitmap.Width
  $minY = $Bitmap.Height
  $maxX = -1
  $maxY = -1
  for ($y = 0; $y -lt $Bitmap.Height; $y += 2) {
    for ($x = 0; $x -lt $Bitmap.Width; $x += 2) {
      if ($Bitmap.GetPixel($x, $y).A -gt 18) {
        if ($x -lt $minX) { $minX = $x }
        if ($y -lt $minY) { $minY = $y }
        if ($x -gt $maxX) { $maxX = $x }
        if ($y -gt $maxY) { $maxY = $y }
      }
    }
  }
  if ($maxX -lt 0) { throw 'No opaque subject found in generated cell' }
  return New-Object System.Drawing.Rectangle $minX, $minY, ($maxX - $minX + 2), ($maxY - $minY + 2)
}

function New-NormalizedFrame {
  param(
    [System.Drawing.Bitmap]$Cell,
    [System.Drawing.Rectangle]$TargetBounds
  )
  $sourceBounds = Get-AlphaBounds $Cell
  $scaleX = $TargetBounds.Width / $sourceBounds.Width
  $scaleY = $TargetBounds.Height / $sourceBounds.Height
  $scale = [Math]::Min($scaleX, $scaleY)
  $width = [int][Math]::Round($sourceBounds.Width * $scale)
  $height = [int][Math]::Round($sourceBounds.Height * $scale)
  $x = [int][Math]::Round(($TargetBounds.X + ($TargetBounds.Width / 2)) - ($width / 2))
  $y = $TargetBounds.Bottom - $height

  $frame = New-Object System.Drawing.Bitmap 443, 591, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $graphics = [System.Drawing.Graphics]::FromImage($frame)
  $graphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceCopy
  $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
  $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $destination = New-Object System.Drawing.Rectangle $x, $y, $width, $height
  $graphics.DrawImage($Cell, $destination, $sourceBounds.X, $sourceBounds.Y, $sourceBounds.Width, $sourceBounds.Height, [System.Drawing.GraphicsUnit]::Pixel)
  $graphics.Dispose()
  return $frame
}

$states = 'idle', 'drink', 'read', 'smoke', 'sleep'
foreach ($state in $states) {
  $baseSheet = [System.Drawing.Bitmap]::FromFile((Join-Path $frogRoot "doubled\$state-22.png"))
  $referenceFrame = $baseSheet.Clone((New-Object System.Drawing.Rectangle 0, 0, 443, 591), [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $targetBounds = Get-AlphaBounds $referenceFrame
  $referenceFrame.Dispose()

  $generatedSheet = [System.Drawing.Bitmap]::FromFile((Join-Path $generatedRoot "$state-keyed.png"))
  $finalSheet = New-Object System.Drawing.Bitmap (443 * 28), 591, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $canvas = [System.Drawing.Graphics]::FromImage($finalSheet)
  $canvas.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceCopy
  $canvas.DrawImageUnscaled($baseSheet, 0, 0)

  for ($index = 0; $index -lt 6; $index++) {
    $cellX = ($index % 3) * 512
    $cellY = [Math]::Floor($index / 3) * 512
    $cell = $generatedSheet.Clone((New-Object System.Drawing.Rectangle $cellX, $cellY, 512, 512), [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $frame = New-NormalizedFrame $cell $targetBounds
    $canvas.DrawImageUnscaled($frame, ((22 + $index) * 443), 0)
    $frame.Dispose()
    $cell.Dispose()
  }

  $canvas.Dispose()
  $finalSheet.Save((Join-Path $outputRoot "$state-28.png"), [System.Drawing.Imaging.ImageFormat]::Png)
  $finalSheet.Dispose()
  $generatedSheet.Dispose()
  $baseSheet.Dispose()
}

Write-Output "28-frame PNG sprite sheets written to $outputRoot"
