# BearBrain.ai

Simple local tutor chatbot UI and server. Uses `Background.avif` from the project root as the page background.

Features
- Static frontend chat UI with subject buttons (Math, Science, Physics, Chemistry)
- Server endpoint `/api/chat` that proxies to OpenAI when `OPENAI_API_KEY` is set
- Fallback built-in tutor behavior when no API key is provided

Quick start

1. Install dependencies

```powershell
cd "C:\Users\muhammad\Downloads\PBL AI 2"
npm install
```

2. (Optional) Use an OpenAI API key to enable real AI responses

Option A — quick for one session (PowerShell):

```powershell
cd "C:\Users\muhammad\Downloads\PBL AI 2"
$env:OPENAI_API_KEY = "sk-..."
npm start
```

Option B — helper that prompts you and starts server:

```powershell
cd "C:\Users\muhammad\Downloads\PBL AI 2"
.\start-server.ps1
```

Option C — permanent for your Windows user (new terminals):

```powershell
setx OPENAI_API_KEY "sk-..."
# then open a new PowerShell and run:
npm start
```

If you don't set `OPENAI_API_KEY`, the app will still run and use a built-in tutor to answer.

3. Open http://localhost:3000 in your browser.

Notes
- The server is small and intended for local development.
- To deploy or expose to the Internet, secure the API key and add authentication.

Using a Google API key (Google Gemini / Generative models)
- If you have a Google API key (looks like `AIza...`) you can also use it with this server. Set the key as `GOOGLE_API_KEY` in your environment instead of `OPENAI_API_KEY`:

```powershell
$env:GOOGLE_API_KEY = "AIza..."
npm start
```

- Notes: Google generative models often require proper API/key configuration and may require enabling the Generative Models API in Google Cloud Console. If the HTTP endpoint or payload shape is different for your account, you may need to update `server.js` to match the exact Google API endpoint and request format.

Security reminder
- Do NOT paste API keys into public chats or commit them to your repo. If you believe a key was exposed, rotate or restrict it immediately in the provider console (Google Cloud Console or OpenAI dashboard).

Files added
- `server.js` — Express server + /api/chat endpoint
- `public/index.html` — Frontend UI
- `public/styles.css` — Styles and uses `Background.avif`
- `public/app.js` — Frontend logic
- `package.json` — Node metadata

Enjoy BearBrain.ai! If you want, I can:
- Add a way to persist full chat transcripts on the server
- Add support for user-supplied API keys in the browser session (not recommended)
- Improve the UI and add icons and animations
