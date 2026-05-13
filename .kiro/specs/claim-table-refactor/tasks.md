# Implementation Plan: Claim Table Refactor

## Overview

Refactor the claim system to use `display_name` as the stable identity key instead of `slot_index`, add rename cascading, and upgrade the profile page to give claimed players full read-only access to linked session data. Implementation proceeds from database migrations → pure validation logic → sync service refactoring → profile UI.

## Tasks

- [x] 1. Database migrations and schema changes
  - [x] 1.1 Create migration `012_claim_tokens_display_name.sql`
    - Add `display_name` text column (nullable, max 50 chars) to `claim_tokens`
    - Alter `slot_index` to nullable
    - Add CHECK constraint ensuring at least one of `display_name` or `slot_index` is non-null
    - Add length CHECK constraint on `display_name`
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

  - [x] 1.2 Create migration `013_session_players_unique_display_name.sql`
    - Add `UNIQUE(session_id, display_name)` constraint to `session_players`
    - Add index `idx_session_players_display_name` on `(session_id, display_name)`
    - _Requirements: 2.1, 2.4_

  - [x] 1.3 Create RLS policy for `spiellisten` read access by claimed players
    - Add policy allowing authenticated users with a `session_players` row to SELECT from `spiellisten`
    - Verify existing RLS policies on `rounds` and `sessions` already grant SELECT to claimed players
    - _Requirements: 5.5, 8.4_

- [x] 2. Implement pure validation module `src/lib/claimValidation.js`
  - [x] 2.1 Implement `resolveTokenTarget(tokenRow, seating)`
    - If `display_name` is set, return it directly
    - If only `slot_index` is set (legacy), return `seating[slot_index]`
    - Return error if neither resolves to a valid name
    - _Requirements: 9.2, 9.3_

  - [x] 2.2 Implement `validateDisplayName(name, options)`
    - Reject empty strings, whitespace-only strings, strings exceeding `maxLength`
    - Default `maxLength` is 30 (rename context)
    - _Requirements: 2.7, 7.5_

  - [x] 2.3 Implement `isNameAvailable(name, seating, excludeName)`
    - Return false if `name` exists in `seating` (case-sensitive) and is not `excludeName`
    - _Requirements: 7.4_

  - [x] 2.4 Write property tests for `claimValidation.js`
    - **Property 6: Display_name validation rejects invalid names**
    - **Property 14: Backward compatibility — old-style tokens resolve via seating index**
    - **Validates: Requirements 2.7, 7.5, 9.2, 9.3**

- [x] 3. Checkpoint - Ensure validation tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Refactor `syncService.js` — token generation and claim operations
  - [x] 4.1 Refactor `generateClaimToken(sessionId, slotIndex)`
    - Resolve `display_name` from `seating[slotIndex]`
    - Validate name exists in seating and is not already claimed
    - Verify caller is the host
    - Insert token with `display_name` set and `slot_index` null
    - Return `{ inviteUrl, token }` on success or `{ error }` on failure
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 9.4_

  - [x] 4.2 Refactor `claimSlot(token, userId)`
    - Fetch token row, validate not expired/used/invalid
    - Use `resolveTokenTarget` to get `display_name` (handles both legacy and new tokens)
    - Validate name still in seating, not already claimed, user not already linked, user is not host
    - Upsert `session_players` row with resolved `display_name` and `user_id`
    - Mark token as `used = true`
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10_

  - [x] 4.3 Write property tests for token generation and claim
    - **Property 1: Token generation resolves display_name correctly**
    - **Property 7: Successful claim creates correct link and marks token used**
    - **Validates: Requirements 1.1, 1.2, 3.1, 3.6, 9.4**

- [x] 5. Refactor `syncService.js` — rename and delete operations
  - [x] 5.1 Implement `renamePlayerInSession(sessionId, oldName, newName)`
    - Validate caller is host
    - Validate new name with `validateDisplayName` and `isNameAvailable`
    - Update `session_players.display_name` from `oldName` to `newName`
    - Update `seating` array at the same index
    - Cascade to pending (unused, unexpired) `claim_tokens` with old `display_name`
    - Update `rounds.player` and `rounds.roles` where applicable
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.7_

  - [x] 5.2 Implement `deletePlayerFromSession(sessionId, displayName)`
    - Remove name from `seating` array
    - Delete corresponding `session_players` row
    - _Requirements: 2.6_

  - [x] 5.3 Write property tests for rename and delete
    - **Property 4: Seating reorder preserves session_players**
    - **Property 5: Player deletion cascades to session_players**
    - **Property 11: Rename preserves identity link and updates seating**
    - **Property 12: Rename cascades to pending claim tokens**
    - **Validates: Requirements 2.3, 2.6, 7.1, 7.2, 7.3**

- [x] 6. Checkpoint - Ensure sync service tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Implement profile data loading in `syncService.js`
  - [x] 7.1 Implement `loadLinkedSessions(userId)`
    - Query `session_players` joined with `sessions` and round counts
    - Return list of `{ sessionId, tableName, displayName, totalRounds, lastPlayedAt }`
    - Order by most recent round descending
    - Use "Unbenannter Tisch" fallback for null table names in the UI layer
    - _Requirements: 6.1, 6.2_

  - [x] 7.2 Implement `loadSessionForClaimedPlayer(sessionId, userId)`
    - Verify user has a `session_players` row for this session
    - Call existing `loadSession` to fetch full session data
    - Return session data with `isReadOnly: true` flag
    - Handle RLS denial gracefully
    - _Requirements: 5.1, 5.2, 5.5, 5.6_

  - [x] 7.3 Write property tests for profile data loading
    - **Property 9: Linked session list is ordered by most recent round and contains correct metadata**
    - **Property 13: After rename, loadMyRoundsAcrossSessions returns all session rounds**
    - **Validates: Requirements 6.1, 6.2, 7.6**

- [x] 8. Implement `useProfileData` hook updates in `src/hooks/useProfileData.js`
  - [x] 8.1 Add `linkedSessions` state and fetch via `loadLinkedSessions`
    - Load on mount for authenticated users
    - Handle loading, error, and empty states
    - _Requirements: 6.1, 6.5, 6.6_

  - [x] 8.2 Add `loadSessionDetail(sessionId)` function
    - Call `loadSessionForClaimedPlayer`
    - Store result in state for the detail view
    - Handle access denied and network errors
    - _Requirements: 5.5, 5.6, 5.7_

  - [x] 8.3 Write property tests for cross-table stats
    - **Property 10: Cross-table profile stats aggregate only declarer rounds**
    - **Validates: Requirements 6.4**

- [x] 9. Update profile page UI in `src/pages/MeinProfil.jsx`
  - [x] 9.1 Add linked session list view
    - Render list of sessions with table name, display_name, total rounds
    - Show "Unbenannter Tisch" for sessions without a table name
    - Show onboarding hint when no sessions are linked
    - Show error state with retry button on load failure
    - _Requirements: 6.1, 6.2, 6.5, 6.6_

  - [x] 9.2 Add session detail view (read-only)
    - Navigate into a session to show full Skatliste and table statistics
    - Reuse existing scoring/stats components (Seeger-Fabian, rankings, round history)
    - Suppress all edit/delete/add controls and session settings controls
    - Handle access denied by showing error and navigating back
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.6, 5.7_

  - [x] 9.3 Write unit tests for MeinProfil read-only view
    - Verify no edit controls rendered for claimed players
    - Verify onboarding hint shown when no sessions linked
    - Verify error state renders retry button
    - _Requirements: 5.3, 6.5, 6.6_

- [x] 10. Wire session creation to auto-link creator
  - [x] 10.1 Verify `createSession` inserts `session_players` row with `display_name: seating[0]`
    - Confirm existing behavior or add the insert if missing
    - Ensure `user_id` is set to the creator's ID
    - _Requirements: 2.2_

  - [x] 10.2 Write property test for session creation auto-link
    - **Property 3: Session creation auto-links creator**
    - **Validates: Requirements 2.2**

- [x] 11. Integration verification and final wiring
  - [x] 11.1 Verify `updateSeating` does NOT modify `session_players`
    - Confirm existing behavior: only updates `sessions.seating` array
    - Add a guard comment if needed for future maintainability
    - _Requirements: 2.3, 2.5_

  - [x] 11.2 Wire claim flow end-to-end
    - Ensure claim page calls refactored `claimSlot`
    - Ensure invite generation UI calls refactored `generateClaimToken`
    - Verify error messages display correctly in German
    - _Requirements: 1.1, 3.1, 8.1, 8.2, 8.3, 8.5_

  - [x] 11.3 Write property test for display_name position-independence
    - **Property 2: Display_name lookup is position-independent**
    - **Validates: Requirements 2.1, 2.5**

  - [x] 11.4 Write property test for claimed player session view
    - **Property 8: Claimed player sees all session rounds with correct stats**
    - **Validates: Requirements 5.1, 5.2**

- [x] 12. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- All error messages are in German as per project conventions
- Migration files are applied manually via Supabase dashboard (not automated)
- `syncService.js` remains the single source of truth for all DB operations and camelCase ↔ snake_case mapping

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "1.3", "2.1", "2.2", "2.3"] },
    { "id": 1, "tasks": ["2.4", "4.1", "4.2", "5.2", "10.1"] },
    { "id": 2, "tasks": ["4.3", "5.1", "10.2", "11.1"] },
    { "id": 3, "tasks": ["5.3", "7.1", "7.2"] },
    { "id": 4, "tasks": ["7.3", "8.1", "8.2"] },
    { "id": 5, "tasks": ["8.3", "9.1", "9.2"] },
    { "id": 6, "tasks": ["9.3", "11.2", "11.3", "11.4"] }
  ]
}
```
