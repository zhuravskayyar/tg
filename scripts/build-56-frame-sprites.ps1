Add-Type -AssemblyName System.Drawing

$frogRoot = Join-Path $PSScriptRoot '..\mini-app\assets\frog'
$generatedRoot = Join-Path $frogRoot 'generated-28'
$outputRoot = Join-Path $frogRoot 'final-56'
New-Item -ItemType Directory -Force -Path $outputRoot | Out-Null

function Get-AlphaBounds {
  param([System.Drawing.Bitmap]$Bitmap)
  $minX = $Bitmap.Width; $minY = $Bitmap.Height; $maxX = -1; $maxY = -1
  for ($y = 0; $y -lt $Bitmap.Height; $y += 2) {
    for ($x = 0; $x -lt $Bitmap.Width; $x += 2) {
      if ($Bitmap.GetPixel($x, $y).A -gt 18) {
        if ($x -lt $minX) { $minX = $x }; if ($y -lt $minY) { $minY = $y }
        if ($x -gt $maxX) { $maxX = $x }; if ($y -gt $maxY) { $maxY = $y }
      }
    }
  }
  if ($maxX -lt 0) { throw 'No opaque subject found in generated cell' }
  New-Object System.Drawing.Rectangle $minX, $minY, ($maxX - $minX + 2), ($maxY - $minY + 2)
}

function New-NormalizedFrame {
  param([System.Drawing.Bitmap]$Cell, [System.Drawing.Rectangle]$TargetBounds)
  $sourceBounds = Get-AlphaBounds $Cell
  $scale = [Math]::Min($TargetBounds.Width / $sourceBounds.Width, $TargetBounds.Height / $sourceBounds.Height)
  $width = [int][Math]::Round($sourceBounds.Width * $scale)
  $height = [int][Math]::Round($sourceBounds.Height * $scale)
  $x = [int][Math]::Round(($TargetBounds.X + $TargetBounds.Width / 2) - $width / 2)
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
  $frame
}

$states = 'idle', 'drink', 'read', 'smoke', 'sleep'
$generatedColumns = @{ idle = 7; drink = 7; read = 8; smoke = 8; sleep = 8 }
$generatedFrameOrder = @{
  idle = @(0..27); drink = @(0..27); read = @(0..27); sleep = @(0..27)
  smoke = @((0..16) + (19..29))
}
foreach ($state in $states) {
  $stateOutput = Join-Path $outputRoot $state
  New-Item -ItemType Directory -Force -Path $stateOutput | Out-Null
  $baseSheet = [System.Drawing.Bitmap]::FromFile((Join-Path $frogRoot "final-28\$state-28.png"))
  $reference = $baseSheet.Clone((New-Object System.Drawing.Rectangle 0, 0, 443, 591), [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $targetBounds = Get-AlphaBounds $reference
  $reference.Dispose()
  $generated = [System.Drawing.Bitmap]::FromFile((Join-Path $generatedRoot "$state-keyed.png"))

  for ($part = 0; $part -lt 4; $part++) {
    $partSheet = New-Object System.Drawing.Bitmap (443 * 14), 591, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $canvas = [System.Drawing.Graphics]::FromImage($partSheet)
    $canvas.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceCopy
    for ($slot = 0; $slot -lt 14; $slot++) {
      $frameIndex = $part * 14 + $slot
      if ($frameIndex -lt 28) {
        $source = New-Object System.Drawing.Rectangle ($frameIndex * 443), 0, 443, 591
        $destination = New-Object System.Drawing.Rectangle ($slot * 443), 0, 443, 591
        $canvas.DrawImage($baseSheet, $destination, $source.X, 0, 443, 591, [System.Drawing.GraphicsUnit]::Pixel)
      } else {
        $generatedIndex = $frameIndex - 28
        $sourceGeneratedIndex = $generatedFrameOrder[$state][$generatedIndex]
        $columns = $generatedColumns[$state]
        $column = $sourceGeneratedIndex % $columns
        $row = [Math]::Floor($sourceGeneratedIndex / $columns)
        $left = [int][Math]::Round($column * $generated.Width / $columns)
        $right = [int][Math]::Round(($column + 1) * $generated.Width / $columns)
        $top = [int][Math]::Round($row * $generated.Height / 4)
        $bottom = [int][Math]::Round(($row + 1) * $generated.Height / 4)
        $cell = $generated.Clone((New-Object System.Drawing.Rectangle $left, $top, ($right - $left), ($bottom - $top)), [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
        $frame = New-NormalizedFrame $cell $targetBounds
        $canvas.DrawImageUnscaled($frame, ($slot * 443), 0)
        $frame.Dispose(); $cell.Dispose()
      }
    }
    $canvas.Dispose()
    $partSheet.Save((Join-Path $stateOutput "$state-part-$($part + 1).png"), [System.Drawing.Imaging.ImageFormat]::Png)
    $partSheet.Dispose()
  }
  $generated.Dispose(); $baseSheet.Dispose()
}

Write-Output "56 generated frames per state split into safe 14-frame sheets at $outputRoot"
