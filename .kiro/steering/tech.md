# Tech Stack

## Core
- **React 19** with JSX (`.jsx` files)
- **Vite 8** - build tool and dev server
- **React Router v7** (`react-router-dom`) - client-side routing, app served under `/app/` base path
- **Recharts 3** - charting library for analytics/statistics pages

## PWA
- **vite-plugin-pwa** - service worker generation, installable app, `registerType: 'prompt'`
- **vite-plugin-webfont-dl** - downloads Google Fonts (Manrope, Work Sans, Material Symbols Outlined) at build time
- `UpdatePrompt` component handles SW update notifications

## Backend / Data
- **Supabase** (`@supabase/supabase-js`) - PostgreSQL database with anonymous RLS policies
- Session ID stored in `localStorage` under key `skatSessionId`
- DB uses `snake_case` columns; app state uses `camelCase` - mapping happens in `syncService.js`

## Testing
- **Vitest 4** - test runner (configured in `vite.config.js`, `environment: 'node'`, `globals: true`)
- **@testing-library/react** - component testing (with `jsdom`)
- **fast-check** - property-based testing (PBT)
- **@vitest/coverage-v8** - code coverage
- Test files: `*.test.js`, `*.test.jsx`, `*.property.test.js`, `*.property.test.jsx`

## Linting & Git Hooks
- ESLint 9 (flat config `eslint.config.js`) with `eslint-plugin-react-hooks` and `eslint-plugin-react-refresh`
- `no-unused-vars` ignores names matching `^[A-Z_]`
- **Husky 9** - pre-commit hook for linting

## Build
- Output: `dist/app/` (Vite `base: '/app/'`, `outDir: 'dist/app'`)
- `postbuild` script copies static landing page into `dist/`
- `__APP_VERSION__` global defined from `package.json` version

## Environment
- `.env.local` - Supabase URL and anon key (gitignored)
- `.env.local.example` - template

## Common Commands

```bash
npm run dev        # Start dev server (Vite)
npm run build      # Production build → dist/app/ + landing page copy
npm run preview    # Preview production build
npm run lint       # Run ESLint
npm test           # Run all tests once (vitest --run)
```

> For single test runs in CI or scripts, use `npx vitest run` - never use watch mode in automated contexts.
