<#
Start-All.ps1
Opens two PowerShell windows: one runs the Express server, the other runs the React dev server.
Usage: Right-click -> Run with PowerShell, or from this folder: .\start-all.ps1
#>

# Get the script folder (project root)
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$clientPath = Join-Path $root 'client'

Write-Host "Opening server window (runs: npm start)"
Start-Process -FilePath 'powershell.exe' -ArgumentList '-NoExit',"-Command Set-Location -Path '$root'; npm install; npm start"

Start-Sleep -Milliseconds 400

Write-Host "Opening client window (runs: npm run dev)"
Start-Process -FilePath 'powershell.exe' -ArgumentList '-NoExit',"-Command Set-Location -Path '$clientPath'; npm install; npm run dev"

Write-Host 'Two windows started. If the client build overwrote `public`, copy Background.avif into `client/public` before building for production.'
