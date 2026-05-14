# SVG map optimization script for Gido-Touch-Mini
# Converts <mask style="mask-type:luminance"> elements to <clipPath> elements with deduplication.
# This eliminates per-frame offscreen buffer allocation, significantly improving FPS during
# zoom/pan animations on kiosk hardware.
#
# Usage: powershell -ExecutionPolicy Bypass -File .\build\optimize-maps.ps1 -MallId "sendaikamisugi"
#
# Source layout:
#   medias/maps/{MallId}/{hostname}/*.svg
#
# After optimization, run: npm run media:compress
# to re-package and upload to S3.

param(
    [string]$MallId = ""
)

chcp 65001 | Out-Null
$OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::InputEncoding  = [System.Text.Encoding]::UTF8

$ErrorActionPreference = "Stop"

# ---- Require MallId --------------------------------------------------------
if ([string]::IsNullOrWhiteSpace($MallId)) {
    Write-Host "Mall ID (e.g. sendaikamisugi, suzaka): " -NoNewline
    $MallId = Read-Host
    if ([string]::IsNullOrWhiteSpace($MallId)) {
        Write-Host "Error: Mall ID is required." -ForegroundColor Red
        exit 1
    }
}

$rootDir     = Split-Path -Parent $PSScriptRoot
$mapsBaseDir = Join-Path $rootDir "medias\maps\$MallId"

if (-not (Test-Path $mapsBaseDir)) {
    Write-Host "Error: Directory not found: $mapsBaseDir" -ForegroundColor Red
    exit 1
}

# ---- Collect SVG files -----------------------------------------------------
$svgFiles = Get-ChildItem -Path $mapsBaseDir -Recurse -Filter "*.svg" -File

if ($svgFiles.Count -eq 0) {
    Write-Host "No SVG files found in: $mapsBaseDir" -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "Optimizing SVG maps for mall: $MallId" -ForegroundColor Cyan
Write-Host "  Source: $mapsBaseDir"
Write-Host "  Files : $($svgFiles.Count) SVG file(s) found"
Write-Host ""

$maskBodyPattern = [regex]::new(
    '<mask([^>]*)>(.*?)</mask>',
    [System.Text.RegularExpressions.RegexOptions]::Singleline
)
$pathDPattern = [regex]'<path d="([^"]+)"'
$refPattern   = [regex]'mask="url\(#([^"]+)\)"'

$totalMasks      = 0
$totalClipPaths  = 0
$totalDuplicates = 0
$totalSkipped    = 0

foreach ($file in $svgFiles) {
    $rel     = $file.FullName.Substring($rootDir.Length).TrimStart('\', '/')
    $content = [System.IO.File]::ReadAllText($file.FullName, [System.Text.Encoding]::UTF8)

    $maskMatches = $maskBodyPattern.Matches($content)

    if ($maskMatches.Count -eq 0) {
        Write-Host "  [skip] $rel  (no <mask> elements)" -ForegroundColor DarkGray
        $totalSkipped++
        continue
    }

    # ---- Build mask-id -> path-d mapping -----------------------------------
    $maskPathMap = [ordered]@{}
    foreach ($m in $maskMatches) {
        $attrs = $m.Groups[1].Value
        $body  = $m.Groups[2].Value
        $idM   = [regex]::Match($attrs, 'id="([^"]+)"')
        if (-not $idM.Success) { continue }
        $mid   = $idM.Groups[1].Value
        $pdM   = $pathDPattern.Match($body)
        $maskPathMap[$mid] = if ($pdM.Success) { $pdM.Groups[1].Value.Trim() } else { $body }
    }

    # ---- Deduplication -----------------------------------------------------
    $pathToCanonical = @{}
    $idToCanonical   = @{}
    foreach ($mid in $maskPathMap.Keys) {
        $pathD = $maskPathMap[$mid]
        if (-not $pathToCanonical.ContainsKey($pathD)) {
            $pathToCanonical[$pathD] = $mid
        }
        $idToCanonical[$mid] = $pathToCanonical[$pathD]
    }

    $uniqueCount = $pathToCanonical.Count
    $dupeCount   = $maskPathMap.Count - $uniqueCount

    # ---- Replace <mask> with <clipPath> ------------------------------------
    $sb        = [System.Text.StringBuilder]::new($content.Length)
    $lastIndex = 0

    foreach ($m in $maskMatches) {
        $sb.Append($content.Substring($lastIndex, $m.Index - $lastIndex)) | Out-Null

        $attrs = $m.Groups[1].Value
        $body  = $m.Groups[2].Value
        $idM   = [regex]::Match($attrs, 'id="([^"]+)"')

        if (-not $idM.Success) {
            $sb.Append($m.Value) | Out-Null
        } else {
            $mid      = $idM.Groups[1].Value
            $canonical = if ($idToCanonical.ContainsKey($mid)) { $idToCanonical[$mid] } else { $mid }

            if ($mid -ne $canonical) {
                # Duplicate — omit entirely
            } else {
                $cleanBody = $body -replace ' fill="white"', ''
                $sb.Append("<clipPath id=`"$mid`" clipPathUnits=`"userSpaceOnUse`">$cleanBody</clipPath>") | Out-Null
            }
        }

        $lastIndex = $m.Index + $m.Length
    }

    $sb.Append($content.Substring($lastIndex)) | Out-Null
    $content = $sb.ToString()

    # ---- Update mask="url(#X)" references ----------------------------------
    $sb2       = [System.Text.StringBuilder]::new($content.Length)
    $lastIndex = 0

    foreach ($m in $refPattern.Matches($content)) {
        $sb2.Append($content.Substring($lastIndex, $m.Index - $lastIndex)) | Out-Null
        $oldId     = $m.Groups[1].Value
        $canonical = if ($idToCanonical.ContainsKey($oldId)) { $idToCanonical[$oldId] } else { $oldId }
        $sb2.Append("clip-path=`"url(#$canonical)`"") | Out-Null
        $lastIndex = $m.Index + $m.Length
    }

    $sb2.Append($content.Substring($lastIndex)) | Out-Null
    $content = $sb2.ToString()

    # ---- Write back --------------------------------------------------------
    [System.IO.File]::WriteAllText($file.FullName, $content, [System.Text.Encoding]::UTF8)

    $saved = $maskPathMap.Count - $uniqueCount
    Write-Host ("  [ok]   {0,-50}  {1} masks -> {2} clipPaths  ({3} dupes removed)" -f `
        $rel, $maskPathMap.Count, $uniqueCount, $dupeCount) -ForegroundColor Green

    $totalMasks      += $maskPathMap.Count
    $totalClipPaths  += $uniqueCount
    $totalDuplicates += $dupeCount
}

# ---- Summary ---------------------------------------------------------------
Write-Host ""
Write-Host "Optimization complete!" -ForegroundColor Green
Write-Host ("  Total masks converted : {0}" -f $totalMasks)    -ForegroundColor Cyan
Write-Host ("  Unique clipPaths      : {0}" -f $totalClipPaths) -ForegroundColor Cyan
Write-Host ("  Duplicates removed    : {0}" -f $totalDuplicates) -ForegroundColor Cyan
if ($totalSkipped -gt 0) {
    Write-Host ("  Files skipped         : {0}  (no masks)" -f $totalSkipped) -ForegroundColor DarkGray
}
Write-Host ""
Write-Host "Next step: npm run media:compress" -ForegroundColor Yellow
