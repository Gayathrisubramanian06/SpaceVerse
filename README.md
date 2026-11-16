# SpaceVerse 🌌

**SpaceVerse** is an interactive web application that lets you explore a virtual space ecosystem. Built with modern web technologies, it showcases:

- **React 19** for UI components
- **Vite** for fast development and build tooling
- **Three.js** for 3‑D visualisations of spacecraft, planets and missions
- **Firebase** for authentication, storage and real‑time data
- **Tailwind CSS** for utility‑first styling
- **Google GenAI SDK** for AI‑powered features (e.g., mission assistance)

The repo you just cloned contains the full source code, assets, and configuration needed to run the app locally or deploy it to a hosting service.

---

## Table of Contents

- [Quick Start](#quick-start)
- [Development](#development)
- [Building for Production](#building-for-production)
- [Running the Server](#running-the-server)
- [Configuration](#configuration)
- [Project Structure](#project-structure)
- [Contributing](#contributing)
- [License](#license)

---

## Quick Start

```bash
# 1️⃣ Clone the repository (already done)
# 2️⃣ Install dependencies
pnpm install   # or npm install / yarn install

# 3️⃣ Copy the example environment file and fill in your values
cp .env.example .env
#   → Edit .env with your Firebase and Google GenAI credentials

# 4️⃣ Start the development server
pnpm dev       # runs `tsx server.ts`
```

Open your browser at `http://localhost:3000` (or the port you configured) to see SpaceVerse in action.

---

## Development

- **Hot‑module reloading**: Vite automatically refreshes the page when you edit source files.
- **Type‑checking**: Run `pnpm lint` (which executes `tsc --noEmit`) to ensure type safety.
- **Styling**: Tailwind utilities are pre‑configured. Modify `tailwind.config.cjs` to extend the design system.
- **3‑D assets**: All models and textures live under `src/three/` and `src/assets/images/`.

### Common scripts

| Script | Description |
|--------|-------------|
| `dev`   | Starts the Express server (`server.ts`) with hot reload. |
| `start` | Runs the compiled server (`node server.js`). |
| `build` | Bundles the client with Vite (`vite build`). |
| `preview`| Serves the built files locally (`vite preview`). |
| `clean` | Removes `dist/` and compiled server files. |
| `lint`  | Type‑checks the TypeScript sources. |

---

## Building for Production

```bash
pnpm build      # Creates a production‑ready bundle in the `dist/` folder.
pnpm preview    # Optionally preview the production build locally.
```

Deploy the contents of `dist/` (and the compiled `server.js` if you need a backend) to your favourite static‑host or cloud provider (e.g., Netlify, Vercel, Railway).

---

## Running the Server

The app runs an Express server that serves the Vite‑built assets and also provides API endpoints for Firebase authentication and any custom back‑end logic.

```bash
# Development (auto‑restarts on changes)
pnpm dev

# Production (after `pnpm build`)
pnpm start
```

---

## Configuration

All configurable values are stored in a `.env` file based on the provided `.env.example`. Typical keys include:

```text
VITE_FIREBASE_API_KEY=your-firebase-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_GOOGLE_GENAI_API_KEY=your-genai-key
PORT=3000
```

Make sure to **never commit** the real `.env` file; it is listed in `.gitignore`.

---

## Project Structure

```
repo_root/
├─ .aistudio/            # Antigravity internal files (ignore)
├─ .data/                # Local data / mock DB files
├─ public/               # Static assets served as‑is
│   └─ assets/...        # Images, icons, etc.
├─ src/                  # Application source code
│   ├─ assets/           # 3‑D textures & images
│   ├─ components/       # React UI components
│   ├─ data/             # Static JSON data sets
│   ├─ three/            # Three.js models & utilities
│   ├─ utils/            # Helper functions
│   ├─ firebase.ts       # Firebase initialisation
│   ├─ App.tsx            # Root React component
│   ├─ main.tsx           # React entry point
│   └─ index.css          # Global Tailwind styles
├─ server.ts             # Express server entry point
├─ vite.config.ts        # Vite configuration
├─ tsconfig.json         # TypeScript compiler options
├─ package.json          # Scripts & dependencies
└─ README.md             # ← This file
```

---

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository.
2. Create a feature branch (`git checkout -b feature/awesome‑feature`).
3. Make your changes and ensure the project still builds (`pnpm lint && pnpm build`).
4. Open a pull request with a clear description of the change.

---

## License

This project is licensed under the **MIT License** – see the `LICENSE` file for details.

---

*Happy exploring the SpaceVerse!*
