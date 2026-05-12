# Implementation Plan: Spieleridentität und tischübergreifende Statistiken

## Overview

Implements optional player identity by introducing a `session_players` table and a `claim_tokens` table, extending `syncService.js` with six new functions, adding `computeProfileStats` / `computePerSessionStats` to `playerStats.js`, creating the `useProfileData` hook, and building the `MeinProfil` page at `/mein-profil`. All changes are strictly additive — anonymous sessions are unaffected.

## Tasks

- [x] 1. DB migration: `session_players` and `claim_tokens` tables
  - Create `supabase/migrations/008_player_identity.sql`
  - Define `session_players` table with columns `id`, `session_id` (FK → sessions), `slot_index` (0–3), `display_name`, `user_id` (nullable FK → auth.users), `created_at`; add `UNIQUE (session_id, slot_index)` and `UNIQUE (session_id, user_id)` constraints
  - Define `claim_tokens` table with columns `id`, `session_id` (FK → sessions), `slot_index`, `token` (UNIQUE), `expires_at`, `used` (default false), `created_by` (nullable FK → auth.users), `created_at`
  - Add indexes on `session_players(session_id)`, `session_players(user_id)`, `claim_tokens(token)`, `claim_tokens(session_id)`
  - Add RLS policies: authenticated users can read all `session_players` rows; can insert/update only rows where `user_id = auth.uid()` or where the session's slot 0 has `user_id = auth.uid()`; for `claim_tokens`: read for session creators, update (mark used) for the targeted user
  - _Requirements: 1.1, 1.2, 2.1, 2.2, 3.1, 3.6_

- [x] 2. Extend `syncService.js` — session creation and slot preassignment
  - [x] 2.1 Extend `createSession` to insert a `session_players` row for `slot_index = 0`
    - After the existing `sessions` insert succeeds, call `supabase.from('session_players').insert(...)` with `session_id`, `slot_index: 0`, `display_name: seating[0]`, and `user_id` from `getUserId()` (null if unauthenticated)
    - Wrap the `session_players` insert in try/catch; on failure log the error and return the successfully created session (graceful degradation)
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [x] 2.2 Write property test for `createSession` slot-0 identity (Property 1)
    - **Property 1: Session creator slot always gets the correct user_id**
    - Add to `src/lib/syncService.property.test.js`
    - Use `fc.record` with arbitrary `seating` arrays and arbitrary `userId` (uuid or null); simulate the insert payload and assert `slot_index === 0`, `user_id === userId`, `display_name === seating[0]`
    - **Validates: Requirements 1.1, 1.3**

  - [x] 2.3 Implement `preassignSlot(sessionId, slotIndex, userId)` in `syncService.js`
    - Validate that `userId` is not null, empty string, or whitespace; return `{ error: { message: 'Ungültige user_id.' } }` if invalid
    - Query `session_players` for an existing row with the same `session_id` and `user_id`; if found return `{ error: { message: 'Diese user_id ist in dieser Session bereits vergeben.' } }` without touching the DB
    - On success, upsert a `session_players` row with the given `sessionId`, `slotIndex`, and `userId`; return `{ error }`
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [x] 2.4 Write property tests for `preassignSlot` (Properties 2 and 3)
    - Add to `src/lib/syncService.property.test.js`
    - **Property 2: Slot user_id uniqueness within a session** — for any session with an existing slot assignment, a second preassign with the same `user_id` must be rejected and existing rows must remain unchanged; **Validates: Requirements 2.2, 2.4**
    - **Property 3: Empty/null user_id is always rejected** — for any value that is null, `''`, or whitespace-only, `preassignSlot` must return an error; **Validates: Requirement 2.6**

- [x] 3. Extend `syncService.js` — claim token generation and slot claiming
  - [x] 3.1 Implement `generateClaimToken(sessionId, slotIndex)` in `syncService.js`
    - Verify the caller (`getUserId()`) is the `user_id` at `slot_index = 0` for the session; return an authorization error if not
    - Generate a random token string (e.g. `crypto.randomUUID()`), set `expires_at` to 72 hours from now
    - Insert into `claim_tokens`; return `{ data: { inviteUrl, token }, error }` where `inviteUrl` is constructed from the app's base URL + token query param
    - _Requirements: 3.1, 3.7_

  - [x] 3.2 Write property test for `generateClaimToken` (Properties 4 and 7)
    - Add to `src/lib/syncService.property.test.js`
    - **Property 4: Claim token encodes correct session and slot** — for any `sessionId` (uuid) and `slotIndex` (0–3), the inserted `claim_tokens` row must have matching `session_id` and `slot_index`, and `expires_at` must be within ±60 s of `now + 72 h`; **Validates: Requirement 3.1**
    - **Property 7: Only the session creator can generate claim tokens** — for any caller whose `user_id` does not match the slot-0 `user_id`, `generateClaimToken` must return an authorization error; **Validates: Requirement 3.7**

  - [x] 3.3 Implement `claimSlot(token, userId)` in `syncService.js`
    - Validate the token in sequence: not found → `'Ungültiger Einladungslink.'`; expired → `'Dieser Einladungslink ist abgelaufen.'`; already used → `'Dieser Einladungslink wurde bereits verwendet.'`; slot already has a `user_id` → `'Dieser Slot ist bereits vergeben.'`; caller is session creator (slot 0) → `'Du bist bereits der Tischersteller.'`
    - On success: `UPDATE session_players SET user_id = userId` for the matching `(session_id, slot_index)` row; `UPDATE claim_tokens SET used = true` for the token row; return `{ error: null }`
    - _Requirements: 3.2, 3.3, 3.4, 3.5, 3.6_

  - [x] 3.4 Write property tests for `claimSlot` (Properties 5 and 6)
    - Add to `src/lib/syncService.property.test.js`
    - **Property 5: Claim succeeds only when all preconditions hold simultaneously** — enumerate all combinations of (expired, used, slot-claimed, is-creator) and assert success iff all four conditions are false; **Validates: Requirements 3.2, 3.3, 3.4**
    - **Property 6: Successful claim invalidates the token** — after a successful `claimSlot`, any subsequent call with the same token must be rejected; **Validates: Requirement 3.6**

- [x] 4. Checkpoint — syncService new functions
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Extend `syncService.js` — cross-table round loading and rename sync
  - [x] 5.1 Implement `loadMyRoundsAcrossSessions(userId)` in `syncService.js`
    - Query `session_players` for all rows where `user_id = userId`; if none found return `{ data: [], error: null }`
    - For each linked session, load all rounds from `rounds` joined with the `session_players` row; map each round to the existing camelCase shape plus `sessionId` and `playerName` (from `session_players.display_name`)
    - Return `{ data: CrossTableRound[], error }`; on any Supabase error re-throw (no partial data)
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

  - [x] 5.2 Write property tests for `loadMyRoundsAcrossSessions` (Properties 8, 9, 12, and 13)
    - Add to `src/lib/syncService.property.test.js`
    - **Property 8: Cross-table load returns all rounds from all linked sessions** — for any set of sessions with at least one linked slot, the returned array must contain every round from every linked session and no rounds from unlinked sessions; **Validates: Requirements 4.1, 4.3**
    - **Property 9: Cross-table rounds carry correct playerName and sessionId** — for any returned round, `playerName` must equal the `display_name` of the linking `session_players` row and `sessionId` must equal the round's session; **Validates: Requirements 4.2, 4.3**
    - **Property 12: Old-name rounds still returned after rename** — after a rename, all rounds recorded under the old name are still returned because the slot's `user_id` link is preserved; **Validates: Requirements 7.3, 7.4**
    - **Property 13: Anonymous sessions load without errors** — sessions where all `session_players` rows have `user_id = null` must load successfully and return all rounds; **Validates: Requirements 8.1, 8.2**

  - [x] 5.3 Implement `updateSessionPlayerName(sessionId, oldName, newName)` in `syncService.js`
    - `UPDATE session_players SET display_name = newName WHERE session_id = sessionId AND display_name = oldName`; return `{ error }`
    - Do not touch the `user_id` column
    - _Requirements: 7.1, 7.2, 7.5_

  - [x] 5.4 Write property test for `updateSessionPlayerName` (Property 11)
    - Add to `src/lib/syncService.property.test.js`
    - **Property 11: Rename preserves user_id in session_players** — for any rename (any old name, any new name), the `user_id` in the `session_players` row must be identical before and after the rename; **Validates: Requirement 7.2**

  - [x] 5.5 Extend `renamePlayer` in `useSyncActions.js` to call `updateSessionPlayerName`
    - After the existing `renamePlayerInRounds` call, call `syncService.updateSessionPlayerName(sessionId, oldName, newName)`
    - Log the error on failure but do not roll back the already-completed `renamePlayerInRounds` call
    - _Requirements: 7.1, 7.2, 7.5_

- [x] 6. Add `computeProfileStats` and `computePerSessionStats` to `playerStats.js`
  - [x] 6.1 Implement `computeProfileStats(rounds)` as a pure function in `src/lib/playerStats.js`
    - Filter `rounds` to declarer rounds (where `round.player === round.playerName`); compute `totalDeclarerGames`, `totalPoints` (sum of `gameValue`), `winRate` (`wins / totalDeclarerGames * 100` rounded to 1 decimal, `"0.0"` when no declarer rounds)
    - Compute `typeDistribution` (same shape as `computePlayerStats`) and `pointsOverTime` (cumulative `gameValue` sorted by `timestamp`)
    - Return a `ProfileStats` object
    - _Requirements: 5.1, 5.2_

  - [x] 6.2 Write property test for `computeProfileStats` (Property 10)
    - Add to `src/lib/playerStats.property.test.js` (new file)
    - **Property 10: Profile stats win rate is correctly computed** — for any non-empty array of declarer rounds, `winRate` must equal `(wins / totalDeclarerGames * 100)` rounded to one decimal place and `totalPoints` must equal the sum of all `gameValue` fields; **Validates: Requirement 5.2**

  - [x] 6.3 Implement `computePerSessionStats(rounds)` as a pure function in `src/lib/playerStats.js`
    - Group `rounds` by `sessionId`; for each group compute `roundCount` (declarer rounds), `winRate`, and carry through `tableName` and `displayName` from the round objects
    - Return `SessionSummary[]`
    - _Requirements: 5.3_

  - [x] 6.4 Write unit tests for `computeProfileStats` and `computePerSessionStats`
    - Add to `src/lib/playerStats.test.js`
    - `computeProfileStats` returns `winRate = "0.0"` when no declarer rounds
    - `computeProfileStats` returns correct values for a known input
    - `computePerSessionStats` groups rounds by `sessionId` correctly
    - _Requirements: 5.2, 5.3_

- [x] 7. Checkpoint — pure logic layer
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Create `useProfileData` hook
  - [x] 8.1 Create `src/hooks/useProfileData.js`
    - Get `userId` from `supabase.auth.getSession()`; if no user, set `userId = null` and return early with empty state
    - Call `syncService.loadMyRoundsAcrossSessions(userId)` on mount and on `reload()`; set `loading` state during the call
    - On success call `computeProfileStats(rounds)` and `computePerSessionStats(rounds)`; expose `{ stats, sessionSummaries, loading, error, reload }`
    - On error set `error` state (string message); expose a `reload` callback that re-triggers the fetch
    - _Requirements: 5.1, 5.5, 5.8_

  - [x] 8.2 Write unit tests for `useProfileData`
    - Add `src/hooks/useProfileData.test.js`
    - Test loading state is set during fetch
    - Test error state is set when `loadMyRoundsAcrossSessions` rejects
    - Test `reload` triggers a new fetch
    - Test returns empty stats when `userId` is null
    - _Requirements: 5.5, 5.8_

- [x] 9. Build `MeinProfil` page and wire routing
  - [x] 9.1 Create `src/pages/MeinProfil.jsx`
    - Use `useProfileData()` to get `{ stats, sessionSummaries, loading, error, reload }`
    - Render loading spinner while `loading === true` (reuse the spinner pattern from `AppShell`)
    - Render error card with retry button when `error !== null`
    - Render empty state with onboarding hint text when `stats.totalDeclarerGames === 0` (explain how to claim slots)
    - Render KPI cards: Gesamtrunden als Ansager, Gesamtpunkte, Gewinnrate
    - Render per-session collapsible cards using `sessionSummaries` (Tischname, Rundenanzahl, Gewinnrate)
    - Render `<GameTypePieChart>` (reuse from `src/components/analytics/`) for type distribution
    - Render a Recharts `<LineChart>` for `stats.pointsOverTime` (cumulative points over time)
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8_

  - [x] 9.2 Write component tests for `MeinProfil`
    - Add `src/pages/MeinProfil.test.jsx`
    - Renders loading state when `useProfileData` returns `loading: true`
    - Renders empty state with hint text when `stats.totalDeclarerGames === 0`
    - Renders error card with retry button when `error` is set
    - Renders KPI cards when data is loaded
    - _Requirements: 5.2, 5.5, 5.6, 5.8_

  - [x] 9.3 Add `/mein-profil` route to `App.jsx`
    - Import `MeinProfil` from `./pages/MeinProfil`
    - Add `<Route path="/mein-profil" element={<MeinProfil />} />` inside the existing `<Routes>` block in `AppShell`
    - _Requirements: 5.7_

  - [x] 9.4 Add "Mein Profil" `NavLink` to `Sidebar.jsx`
    - Add a `<NavLink>` entry with `to="/mein-profil"`, icon `person_pin` from `material-symbols-outlined`, and label `Mein Profil`
    - Apply the same CSS classes as existing nav items; apply the active class when the route matches
    - Add the same entry to the mobile bottom nav section
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x] 10. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- The DB migration (`tasks 1`) must be applied in the Supabase dashboard before any runtime testing; it is a prerequisite for all syncService functions
- `computeProfileStats` and `computePerSessionStats` are pure functions — they can be developed and tested entirely without a DB connection
- Property tests follow the existing pattern in `syncService.property.test.js`: mock the Supabase client via `vi.mock`, simulate the DB payloads as pure data, and assert invariants with `fc.assert(fc.property(...), { numRuns: 100 })`
- Tag format for property test comments: `// Feature: player-identity-cross-table-stats, Property N: <title>`
- All user-visible strings are in German; code identifiers and comments are in English

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1"] },
    { "id": 1, "tasks": ["2.1", "2.3"] },
    { "id": 2, "tasks": ["2.2", "2.4", "3.1", "3.3"] },
    { "id": 3, "tasks": ["3.2", "3.4", "5.1", "5.3", "6.1", "6.3"] },
    { "id": 4, "tasks": ["5.2", "5.4", "5.5", "6.2", "6.4"] },
    { "id": 5, "tasks": ["8.1"] },
    { "id": 6, "tasks": ["8.2", "9.1"] },
    { "id": 7, "tasks": ["9.2", "9.3", "9.4"] }
  ]
}
```
