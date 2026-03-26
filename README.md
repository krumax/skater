# Skat Scorer

A minimal React/Vite app for tracking Skat card game scores at the table. Supports multiple players, tracks rounds with full game details (Spitzen, Hand, Schneider, Schwarz, Ouvert), calculates Seeger-Fabian scores, and persists everything to a shared Supabase database so any device can pick up where another left off.

## Features

- Score entry for each round with all relevant game modifiers
- Automatic Seeger-Fabian point calculation
- Player management (add, remove, rename, reorder)
- Persistent storage via Supabase — reload or switch devices without losing data
- Manual refresh button to sync the latest state from the database
- Sync status indicator (cloud icon) in the sidebar

---

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure Supabase

#### 2.1 Create a Supabase project

Go to [supabase.com](https://supabase.com), create a free project, and note your **Project URL** and **anon public key** (found under *Project Settings → API*).

#### 2.2 Run the database migration

Open the **SQL Editor** in your Supabase dashboard and run the following script:

```sql
-- sessions
CREATE TABLE sessions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seating       jsonb NOT NULL,
  geber_index   integer NOT NULL DEFAULT 0,
  current_round integer NOT NULL DEFAULT 1,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- rounds
CREATE TABLE rounds (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id   uuid NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  round_number integer NOT NULL,
  player       text NOT NULL,
  game_type    text NOT NULL,
  type_label   text NOT NULL,
  game_value   integer NOT NULL,
  base_value   integer NOT NULL,
  multiplier   integer NOT NULL,
  won          boolean NOT NULL,
  eye_count    integer NOT NULL DEFAULT 0,
  spitzen      integer NOT NULL DEFAULT 1,
  hand         boolean NOT NULL DEFAULT false,
  schneider    boolean NOT NULL DEFAULT false,
  schwarz      boolean NOT NULL DEFAULT false,
  ouvert       boolean NOT NULL DEFAULT false,
  roles        jsonb,
  seeger_scores jsonb,
  timestamp    timestamptz NOT NULL DEFAULT now()
);

-- Row Level Security — allow anonymous read/write
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE rounds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anon read/write sessions" ON sessions FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Anon read/write rounds" ON rounds FOR ALL TO anon USING (true) WITH CHECK (true);
```

#### 2.3 Import historical data (optional)

If you want to load the existing game history (352 rounds for Konrad, Max and Oma), run the second migration in the Supabase SQL editor after the schema migration:

```
supabase/migrations/002_historical_import.sql
```

This creates a dedicated session with a fixed ID (`a0000000-0000-0000-0000-000000000001`) and inserts all historical rounds. To connect the app to that session, set the following key in your browser's `localStorage` after opening the app:

```js
localStorage.setItem('skatSessionId', 'a0000000-0000-0000-0000-000000000001')
```

Then hit the refresh button in the sidebar to load the data.

> Note: historical rounds have `game_type = 'unknown'` since only scores were available — no game type details. All future rounds recorded through the app will have full detail.

#### 2.4 Set environment variables

Copy the example file and fill in your credentials:

```bash
cp .env.local.example .env.local
```

Then edit `.env.local` with your actual values (see the example file for details).

> `.env.local` is listed in `.gitignore` and will never be committed.

### 3. Run the app

```bash
npm run dev
```

---

## Running tests

```bash
npm test
```

Or for a single non-watch run:

```bash
npx vitest run
```
