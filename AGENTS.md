## Cursor Cloud specific instructions

### Overview

Wedding invitation & CRM web app ("Invitación Boda Lis & Juanjo") — React 19 + Vite 7, deployed on Vercel. No TypeScript, no ESLint, no test framework, no linter configured.

### Running locally

- `npm run dev` starts Vite on port 5173 with a built-in mock API (`vite-dev-api-fallback` plugin). No `.env` file or external services needed for local dev.
- The mock API persists data to `.vite-dev-api.json` in the project root.
- `npm run build` runs the production build.
- No `lint` or `test` scripts exist in `package.json`.

### Admin dashboard

- URL: `http://localhost:5173/creador`
- Default password: value of `VITE_CREATOR_PASSWORD` env var, or `chanchitaboda` if unset (see `src/components/CreatorGate.jsx`).

### Key caveats

- Vite 7 requires Node.js ≥ 18. The VM has Node 22 pre-installed.
- The `@vercel/kv` dependency is deprecated but still works; it logs a warning on install.
- Guest invitation pages are accessed via `/<Slug>` (e.g., `/Maria-Garcia1`). The slug is generated from the guest name when creating an invitation in the dashboard.
