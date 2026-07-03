Add-Type -AssemblyName System.Drawing

$srcPath = Join-Path $PSScriptRoot '..\src\assets\images\newFamily\new-family-page-bg-source.png'
$outPath = Join-Path $PSScriptRoot '..\src\assets\images\newFamily\new-family-page-bg.png'

$targetWidth = 576
$targetHeight = 1024

$src = [System.Drawing.Bitmap]::FromFile($srcPath)
$out = New-Object System.Drawing.Bitmap $targetWidth, $targetHeight
$graphics = [System.Drawing.Graphics]::FromImage($out)
$graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality

$graphics.DrawImage(
  $src,
  (New-Object System.Drawing.Rectangle 0, 0, $targetWidth, $targetHeight),
  (New-Object System.Drawing.Rectangle 0, 0, $src.Width, $src.Height),
  [System.Drawing.GraphicsUnit]::Pixel
)

$out.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)

$graphics.Dispose()
$src.Dispose()
$out.Dispose()

Write-Host "Saved ${targetWidth}x${targetHeight} background to $outPath"
