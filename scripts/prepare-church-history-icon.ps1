Add-Type -AssemblyName System.Drawing

$srcPath = Join-Path $PSScriptRoot '..\src\assets\images\about\church-history-icon-source.png'
$outPath = Join-Path $PSScriptRoot '..\src\assets\images\about\church-history-icon.png'

function Test-TransparentPixel {
  param([System.Drawing.Color]$Color)
  if ($Color.A -lt 16) { return $true }

  $min = [Math]::Min($Color.R, [Math]::Min($Color.G, $Color.B))
  $max = [Math]::Max($Color.R, [Math]::Max($Color.G, $Color.B))
  $spread = $max - $min

  if ($Color.R -gt 232 -and $Color.G -gt 232 -and $Color.B -gt 232) { return $true }
  if ($spread -lt 18 -and $min -gt 168 -and $max -lt 235) { return $true }
  if ($spread -lt 20 -and $min -ge 35 -and $max -le 110) { return $true }

  return $false
}

$src = [System.Drawing.Bitmap]::FromFile($srcPath)
$minX = $src.Width
$minY = $src.Height
$maxX = 0
$maxY = 0

for ($x = 0; $x -lt $src.Width; $x++) {
  for ($y = 0; $y -lt $src.Height; $y++) {
    $pixel = $src.GetPixel($x, $y)
    if (-not (Test-TransparentPixel $pixel)) {
      if ($x -lt $minX) { $minX = $x }
      if ($y -lt $minY) { $minY = $y }
      if ($x -gt $maxX) { $maxX = $x }
      if ($y -gt $maxY) { $maxY = $y }
    }
  }
}

$pad = 2
$minX = [Math]::Max(0, $minX - $pad)
$minY = [Math]::Max(0, $minY - $pad)
$maxX = [Math]::Min($src.Width - 1, $maxX + $pad)
$maxY = [Math]::Min($src.Height - 1, $maxY + $pad)
$cropWidth = $maxX - $minX + 1
$cropHeight = $maxY - $minY + 1

$out = New-Object System.Drawing.Bitmap $cropWidth, $cropHeight, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)

for ($x = 0; $x -lt $cropWidth; $x++) {
  for ($y = 0; $y -lt $cropHeight; $y++) {
    $pixel = $src.GetPixel($minX + $x, $minY + $y)
    if (Test-TransparentPixel $pixel) {
      $out.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(0, 0, 0, 0))
    } else {
      $out.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(255, $pixel.R, $pixel.G, $pixel.B))
    }
  }
}

$out.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
$src.Dispose()
$out.Dispose()

Write-Host "Saved transparent icon ${cropWidth}x${cropHeight} to $outPath"
