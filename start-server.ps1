Write-Host "BearBrain.ai helper: prompt for OpenAI API key (leave blank to use fallback)."
$key = Read-Host -Prompt 'Enter OPENAI_API_KEY (or press Enter to skip)'
if ($key -and $key.Trim() -ne '') {
  Write-Host 'Setting OPENAI_API_KEY for this session.'
  $env:OPENAI_API_KEY = $key
} else {
  Write-Host 'No API key provided — server will use the built-in fallback responses.'
}

Write-Host 'Starting server...'
node server.js
