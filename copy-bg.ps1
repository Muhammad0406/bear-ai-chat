<#
copy-bg.ps1
Copies Background.avif from the project root into both client/public and public
so the background image is available in dev (Vite) and when serving the built app.

Usage:
  Open PowerShell in the project root and run:
    .\copy-bg.ps1
#>

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$src = Join-Path $root 'Background.avif'
$clientDest = Join-Path $root 'client\public\Background.avif'
$serverDest = Join-Path $root 'public\Background.avif'

if (-Not (Test-Path $src)) {
  Write-Error "Source file not found: $src"
  exit 1
}

Write-Host "Copying background from $src"
Copy-Item -Path $src -Destination $clientDest -Force
Write-Host "Copied to $clientDest"

Copy-Item -Path $src -Destination $serverDest -Force
Write-Host "Copied to $serverDest"

Write-Host "Done. Now run your dev server (client) or build the client to include the image."
