# Tech Stack

## Core
- **React 19** with JSX (`.jsx` files)
- **Vite 8** - build tool and dev server
- **React Router v7** - client-side routing
- **Recharts** - charting library for analytics/statistics pages

## Backend / Data
- **Supabase** (`@supabase/supabase-js`) - PostgreSQL database with anonymous RLS policies
- Session ID stored in `localStorage` under key `skatSessionId`
- DB uses `snake_case` columns; app state uses `camelCase` - mapping happens in `syncService.js`

## Testing
- **Vitest** - test runner (configured in `vite.config.js`, `environment: 'node'`)
- **@testing-library/react** - component testing
- **fast-check** - property-based testing (PBT)
- Test files: `*.test.js`, `*.test.jsx`, `*.property.test.jsx`

## Linting
- ESLint 9 with `eslint-plugin-react-hooks` and `eslint-plugin-react-refresh`
- `no-unused-vars` ignores names matching `^[A-Z_]`

## Environment
- `.env.local` - Supabase URL and anon key (gitignored)
- `.env.local.example` - template

## Common Commands

```bash
npm run dev        # Start dev server (Vite)
npm run build      # Production build → dist/
npm run preview    # Preview production build
npm run lint       # Run ESLint
npm test           # Run all tests once (vitest --run)
```

> For single test runs in CI or scripts, use `npx vitest run` - never use watch mode in automated contexts.
