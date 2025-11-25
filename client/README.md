# BearBrain Client (React + Vite)

Development

1. Install dependencies inside the `client` folder:

```powershell
cd "C:\Users\muhammad\Downloads\PBL AI 2\client"
npm install
```

2a. Run dev server (proxies `/api` to `http://localhost:3000`):

```powershell
npm run dev
```

2b. Or build static files into the server `public` folder and run the server:

```powershell
npm run build
cd "C:\Users\muhammad\Downloads\PBL AI 2"
npm start
```

The build output is configured to go into `../public` so the existing Express server will serve the app.

Background image
- If you want the built client to include the `Background.avif` image you added at the repository root, copy it into the client `public` folder before building:

```powershell
Copy-Item -Path ..\Background.avif -Destination .\public\Background.avif -Force
npm run build
```

This ensures the built files reference the background image correctly when served from Express.
