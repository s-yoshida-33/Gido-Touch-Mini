# Media compression and S3 upload script for Gido-Touch-Mini
# Usage: powershell -ExecutionPolicy Bypass -File .\build\compress-media.ps1 -MallId "sendaikamisugi" -MediaType "all"
#
# MediaType options:
#   assets  - Compress medias/{MallId}/assets/
#   maps    - Compress medias/{MallId}/maps/{hostname}/ for each hostname dir
#   all     - Both of the above
#
# S3 upload paths:
#   s3://tti-distribution/public/gido-touch-mini/medias/{MallId}/assets/
#   s3://tti-distribution/public/gido-touch-mini/medias/{MallId}/maps/{hostname}/
#
# Local source layout:
#   medias/{MallId}/assets/                   <- asset files (genres, open-times, pictos, ...)
#   medias/{MallId}/maps/{hostname}/          <- map files per hostname (auto-scanned)
#
# Release output:
#   release/{MallId}/assets/assets-{timestamp}.zip + latest.json
#   release/{MallId}/maps/{hostname}/maps-{timestamp}.zip + latest.json

param(
    [string]$MallId = "",
    [string]$MediaType = ""
)

chcp 65001 | Out-Null
$OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::InputEncoding  = [System.Text.Encoding]::UTF8

$ErrorActionPreference = "Stop"

# Require MallId
if ([string]::IsNullOrWhiteSpace($MallId)) {
    Write-Host "Mall ID (e.g. sendaikamisugi, suzaka): " -NoNewline
    $MallId = Read-Host
    if ([string]::IsNullOrWhiteSpace($MallId)) {
        Write-Host "Error: Mall ID is required." -ForegroundColor Red
        exit 1
    }
}

# Require MediaType
$validMediaTypes = @("assets", "maps", "all")
if ([string]::IsNullOrWhiteSpace($MediaType) -or $validMediaTypes -notcontains $MediaType) {
    Write-Host "Media type [assets / maps / all]: " -NoNewline
    $MediaType = Read-Host
    if ([string]::IsNullOrWhiteSpace($MediaType) -or $validMediaTypes -notcontains $MediaType) {
        Write-Host "Error: MediaType must be one of: $($validMediaTypes -join ', ')." -ForegroundColor Red
        exit 1
    }
}

Write-Host "Processing media for mall: $MallId (type: $MediaType)" -ForegroundColor Cyan

$rootDir    = Split-Path -Parent $PSScriptRoot
$mediasRoot = Join-Path $rootDir "medias"
$today      = Get-Date -Format "yyyy-MM-dd-HH-mm-ss"

# ---------------------------------------------------------------------------
# Helper: Compress a source dir into a ZIP and generate latest.json, then upload
# ---------------------------------------------------------------------------
function Compress-And-Upload {
    param(
        [string]$SourceDir,
        [string]$OutputDir,
        [string]$ZipPrefix,
        [string]$S3Base,
        [string[]]$FileExtensions = @()  # empty = all files
    )

    # Validate source
    if (-not (Test-Path $SourceDir)) {
        Write-Host "  Error: Source directory not found: $SourceDir" -ForegroundColor Red
        return $false
    }

    # Get files to compress (recursive to handle subdirectories)
    if ($FileExtensions.Count -gt 0) {
        $extPattern = ($FileExtensions | ForEach-Object { "\.$_" }) -join '|'
        $files = Get-ChildItem -Path $SourceDir -File -Recurse | Where-Object { $_.Extension -match $extPattern }
    } else {
        $files = Get-ChildItem -Path $SourceDir -File -Recurse | Where-Object { $_.Name -notmatch '^\.' }
    }

    if ($files.Count -eq 0) {
        Write-Host "  Error: No files found in $SourceDir" -ForegroundColor Red
        return $false
    }

    Write-Host "  Found $($files.Count) file(s):" -ForegroundColor Green
    $files | ForEach-Object {
        $rel = $_.FullName.Substring($SourceDir.Length).TrimStart('\', '/')
        Write-Host "    - $rel" -ForegroundColor Gray
    }

    # Prepare output dir
    if (-not (Test-Path $OutputDir)) {
        New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
        Write-Host "  Created output directory: $OutputDir" -ForegroundColor Green
    }

    $zipFileName = "$ZipPrefix-$today.zip"
    $zipPath     = Join-Path $OutputDir $zipFileName
    $versionPath = Join-Path $OutputDir "latest.json"

    # Remove existing zip if present
    if (Test-Path $zipPath) {
        Remove-Item $zipPath -Force
    }

    # Compress
    try {
        Write-Host "  Compressing to ZIP file..." -ForegroundColor Cyan
        Compress-Archive -Path "$SourceDir\*" -DestinationPath $zipPath -Force

        $fileSize   = (Get-Item $zipPath).Length
        $fileSizeMB = [Math]::Round($fileSize / 1MB, 2)
        Write-Host "  Compressed: $zipPath ($fileSizeMB MB)" -ForegroundColor Green
    } catch {
        Write-Host "  Error during compression: $_" -ForegroundColor Red
        return $false
    }

    # Generate latest.json
    $updatedAt   = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
    $versionJson = @{ zip = $zipFileName; updated_at = $updatedAt } | ConvertTo-Json -Compress
    [System.IO.File]::WriteAllText($versionPath, $versionJson, [System.Text.Encoding]::UTF8)

    Write-Host "  Generated latest.json: zip=$zipFileName, updated_at=$updatedAt" -ForegroundColor Green
    Write-Host "  -> https://dl.tti.ninja/public/gido-touch-mini/medias/$($S3Base -replace 's3://tti-distribution/public/gido-touch-mini/medias/', '')/" -ForegroundColor Gray

    # Upload if AWS CLI available
    if (Get-Command aws -ErrorAction SilentlyContinue) {
        # Archive existing S3 ZIPs before uploading
        $archiveDir = Join-Path $OutputDir "archive"
        if (-not (Test-Path $archiveDir)) {
            New-Item -ItemType Directory -Path $archiveDir -Force | Out-Null
        }

        aws s3 sync "$S3Base/" $archiveDir --exclude "latest.json" 2>&1 | Out-Null

        $archivedFiles = Get-ChildItem -Path $archiveDir -File -ErrorAction SilentlyContinue
        if ($archivedFiles.Count -gt 0) {
            Write-Host "  Archived $($archivedFiles.Count) existing ZIP(s) to: $archiveDir" -ForegroundColor Green
            $archivedFiles | ForEach-Object { Write-Host "    - $($_.Name)" -ForegroundColor Gray }

            Write-Host "  Cleaning up old ZIPs from S3..." -ForegroundColor Cyan
            aws s3 rm "$S3Base/" --recursive --exclude "latest.json"
            Write-Host "  S3 cleanup complete." -ForegroundColor Green
        } else {
            Write-Host "  No existing ZIPs on S3 (first upload)." -ForegroundColor Gray
            Remove-Item $archiveDir -Force -Recurse -ErrorAction SilentlyContinue
        }

        try {
            aws s3 cp $zipPath "$S3Base/$zipFileName" --content-type "application/zip"
            Write-Host "  Uploaded: $zipFileName" -ForegroundColor Green

            aws s3 cp $versionPath "$S3Base/latest.json" `
                --content-type "application/json" `
                --cache-control "no-cache, no-store"
            Write-Host "  Uploaded: latest.json (Cache-Control: no-cache)" -ForegroundColor Green
        } catch {
            Write-Host "  Upload failed: $_" -ForegroundColor Red
            Write-Host "  Please upload manually:" -ForegroundColor Yellow
            Write-Host "    aws s3 cp `"$zipPath`" `"$S3Base/$zipFileName`" --content-type application/zip" -ForegroundColor Gray
            Write-Host "    aws s3 cp `"$versionPath`" `"$S3Base/latest.json`" --content-type application/json --cache-control no-cache,no-store" -ForegroundColor Gray
        }
    } else {
        Write-Host "  [INFO] AWS CLI not found. Upload manually:" -ForegroundColor Yellow
        Write-Host "    aws s3 cp `"$zipPath`" `"$S3Base/$zipFileName`" --content-type application/zip" -ForegroundColor Gray
        Write-Host "    aws s3 cp `"$versionPath`" `"$S3Base/latest.json`" --content-type application/json --cache-control no-cache,no-store" -ForegroundColor Gray
    }

    return $true
}

# ---------------------------------------------------------------------------
# Assets
# ---------------------------------------------------------------------------
function Process-Assets {
    Write-Host "`n[ASSETS]" -ForegroundColor Magenta

    $sourceDir = Join-Path $mediasRoot "$MallId\assets"
    $outputDir = Join-Path $rootDir "release\$MallId\assets"
    $s3Base    = "s3://tti-distribution/public/gido-touch-mini/medias/$MallId/assets"

    Compress-And-Upload -SourceDir $sourceDir -OutputDir $outputDir -ZipPrefix "assets" -S3Base $s3Base
}

# ---------------------------------------------------------------------------
# Maps (auto-scan hostname dirs)
# ---------------------------------------------------------------------------
function Process-Maps {
    Write-Host "`n[MAPS]" -ForegroundColor Magenta

    $mapsBaseDir = Join-Path $mediasRoot "$MallId\maps"

    if (-not (Test-Path $mapsBaseDir)) {
        Write-Host "  Maps directory not found: $mapsBaseDir" -ForegroundColor Yellow
        return
    }

    $hostnameDirs = Get-ChildItem -Path $mapsBaseDir -Directory -ErrorAction SilentlyContinue

    if ($hostnameDirs.Count -eq 0) {
        Write-Host "  No hostname directories found under: $mapsBaseDir" -ForegroundColor Yellow
        return
    }

    Write-Host "  Found $($hostnameDirs.Count) hostname dir(s): $($hostnameDirs.Name -join ', ')" -ForegroundColor Green

    foreach ($hostnameDir in $hostnameDirs) {
        $hn        = $hostnameDir.Name
        $sourceDir = $hostnameDir.FullName
        $outputDir = Join-Path $rootDir "release\$MallId\maps\$hn"
        $s3Base    = "s3://tti-distribution/public/gido-touch-mini/medias/$MallId/maps/$hn"

        Write-Host "  Processing hostname: $hn" -ForegroundColor Cyan
        Compress-And-Upload -SourceDir $sourceDir -OutputDir $outputDir -ZipPrefix "maps" -S3Base $s3Base
    }
}

# ---------------------------------------------------------------------------
# Run selected media type(s)
# ---------------------------------------------------------------------------
switch ($MediaType) {
    "assets" { Process-Assets }
    "maps"   { Process-Maps }
    "all" {
        Process-Assets
        Process-Maps
    }
}

Write-Host "`nDone!" -ForegroundColor Green
