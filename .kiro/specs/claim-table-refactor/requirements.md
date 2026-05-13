# Requirements Document

## Introduction

The current "Claim Table" feature links a user account to a table position (`slot_index`) via `claim_tokens`. This is problematic because seating positions change constantly through drag-and-drop reordering — the `slot_index` is volatile and semantically meaningless for identity purposes.

What actually matters is the **player name** (`display_name`). When Max generates a claim link for "Konrad", the intent is to link Konrad's user account to the name "Konrad" in that session — regardless of what seat position Konrad occupies.

Additionally, the current "Mein Profil" page only shows a claimed player's own declarer rounds (`player === playerName`). After claiming, a player should have **read-only access to the full table data** (all rounds, the complete Skatliste, table statistics) — the same view the host sees, but without write permissions.

This refactor addresses both issues while preserving the existing `UNIQUE(session_id, user_id)` constraint and maintaining backward compatibility with anonymous sessions.

## Glossary

- **Session**: A Skat table with 3–4 player slots, stored in the `sessions` table. Contains a `seating` array (e.g. `["Konrad", "Max", "Oma"]`).
- **Session_Player**: A row in `session_players` linking a `display_name` within a session to an optional `user_id`.
- **Host**: The authenticated user who created the session (`sessions.user_id`). Has full read/write access to the table.
- **Claimed_Player**: An authenticated user whose account is linked to a `display_name` in a session via `session_players`. Has read-only access to the full table data.
- **Claim_Token**: A short-lived token stored in `claim_tokens` that identifies a specific `display_name` in a session and authorizes a user to claim it.
- **Display_Name**: The player name as it appears in the `seating` array and in `rounds.player` (e.g. "Konrad", "Max").
- **Sync_Service**: The module `syncService.js` — the single source of truth for all Supabase database operations.
- **Profil_Seite**: The personal profile page at `/mein-profil` showing cross-table statistics and linked table views.
- **Skatliste**: The complete list of all rounds played at a table, regardless of who was declarer.
- **Round**: A single Skat round stored in the `rounds` table, with a `player` field indicating the declarer's name.

---

## Requirements

### Requirement 1: Replace slot_index with display_name in claim_tokens

**User Story:** As a host, I want claim links to target a player name instead of a seat position, so that the link remains valid even when I reorder players at the table.

#### Acceptance Criteria

1. WHEN the Host generates a claim link by specifying a seat position, THE Sync_Service SHALL resolve the `display_name` from the session's `seating` array at that position and create a Claim_Token that stores the `session_id` and the resolved `display_name` (not `slot_index`), with an `expires_at` timestamp set to 72 hours from creation and `used` set to false.
2. WHEN the Sync_Service successfully creates a Claim_Token, THE Sync_Service SHALL return an invite URL containing the generated token and the token value itself, so the Host can share the link with the target player.
3. IF the Host attempts to generate a claim link for a `display_name` that does not exist in the session's `seating` array, THEN THE Sync_Service SHALL reject the operation and return a validation error without creating a token.
4. IF the Host attempts to generate a claim link for a `display_name` that is already linked to a `user_id` in `session_players`, THEN THE Sync_Service SHALL reject the operation and return an error indicating the name is already claimed.
5. IF an unauthenticated user or a user who is not the Host (where Host is identified by `sessions.user_id`) attempts to generate a claim link, THEN THE Sync_Service SHALL reject the operation and return an authorization error without creating a token.
6. IF the session specified by `session_id` does not exist, THEN THE Sync_Service SHALL reject the operation and return a validation error.

---

### Requirement 2: Replace slot_index with display_name in session_players

**User Story:** As a developer, I want `session_players` to link users to player names rather than seat positions, so that the identity link survives seating reorders.

#### Acceptance Criteria

1. THE database SHALL enforce a `UNIQUE(session_id, display_name)` constraint on `session_players` so that each player name maps to at most one row per session, and THE Sync_Service SHALL use `display_name` (not array position) as the lookup key when resolving the identity link for a player in a session.
2. WHEN a session is created by an authenticated user, THE Sync_Service SHALL insert a `session_players` row with `session_id` set to the new session's ID, `display_name` set to `seating[0]`, and `user_id` set to the creator's ID.
3. WHEN the seating order is changed (drag-and-drop reorder), THE Sync_Service SHALL update only the session's `seating` array and SHALL NOT insert, update, or delete any `session_players` rows.
4. THE database SHALL maintain the `UNIQUE(session_id, user_id)` constraint to ensure one user account maps to at most one player name per session.
5. IF a `session_players` row exists for a given `session_id` and `display_name`, THEN THE Sync_Service SHALL treat that row as the identity link for that player name, regardless of the player's current index in the `seating` array.
6. IF a player name is removed from the session's `seating` array (player deleted), THEN THE Sync_Service SHALL delete the corresponding `session_players` row for that `session_id` and `display_name`, unlinking any associated user account.
7. THE Sync_Service SHALL store `display_name` values in `session_players` with a maximum length of 50 characters, matching the maximum player name length enforced by the session's seating input.

---

### Requirement 3: Claim operation uses display_name

**User Story:** As a player receiving a claim link, I want the link to connect my account to my player name at the table, so that my identity is tied to my name and not to a seat number.

#### Acceptance Criteria

1. WHEN a logged-in user opens a valid claim link, THE Sync_Service SHALL link the user's `user_id` to the `display_name` encoded in the Claim_Token by upserting a `session_players` row with that `session_id`, `display_name`, and `user_id`.
2. IF the Claim_Token is expired (older than 72 hours), THEN THE Sync_Service SHALL reject the claim and return an expiration error message.
3. IF the Claim_Token has already been used (`used = true`), THEN THE Sync_Service SHALL reject the claim and return an error message indicating the token was already used.
4. IF the `display_name` in the token is already linked to a different `user_id` in `session_players`, THEN THE Sync_Service SHALL reject the claim and return an error message indicating the name is already claimed.
5. IF the claiming user's `user_id` is already linked to a different `display_name` in the same session, THEN THE Sync_Service SHALL reject the claim and return an error message indicating the user is already linked in this session.
6. WHEN a claim succeeds, THE Sync_Service SHALL mark the Claim_Token as `used = true` so it cannot be reused.
7. IF the claiming user is the Host of the session, THEN THE Sync_Service SHALL reject the claim and return an error message indicating the host is already linked.
8. IF the user opening the claim link is not authenticated, THEN THE Sync_Service SHALL reject the claim and return an authentication error message without modifying any data.
9. IF the token string does not match any row in `claim_tokens`, THEN THE Sync_Service SHALL reject the claim and return an error message indicating the link is invalid.
10. IF the `display_name` encoded in the Claim_Token no longer exists in the session's `seating` array, THEN THE Sync_Service SHALL reject the claim and return an error message indicating the player name is no longer valid for this session.

---

### Requirement 4: DB migration for claim_tokens schema change

**User Story:** As a developer, I want the `claim_tokens` table to store `display_name` instead of `slot_index`, so that the schema reflects the new name-based linking approach.

#### Acceptance Criteria

1. THE migration SHALL add a `display_name` column of type `text` (nullable, maximum 50 characters) to the `claim_tokens` table.
2. THE migration SHALL alter the `slot_index` column in `claim_tokens` from `NOT NULL` to nullable, so that existing rows with a non-null `slot_index` remain unchanged and new rows may omit it.
3. THE migration SHALL add a CHECK constraint ensuring that each row in `claim_tokens` has at least one of `display_name` or `slot_index` set to a non-null value.
4. WHEN the migration is applied, THE database SHALL allow new tokens to be created with `display_name` set and `slot_index` set to null, and the insert SHALL succeed without constraint violations.
5. THE migration SHALL NOT delete or modify existing rows in `claim_tokens`, preserving any previously generated tokens and their current column values.
6. WHEN the migration is applied, THE existing RLS policies and indexes on `claim_tokens` SHALL remain functional without modification.

---

### Requirement 5: Read-only full table view for claimed players

**User Story:** As a claimed player, I want to see the complete Skatliste and table statistics for tables I'm linked to, so that I can review all rounds played — not just my own declarer rounds.

#### Acceptance Criteria

1. WHEN a Claimed_Player views a linked session in their profile, THE Profil_Seite SHALL display ALL rounds from that session (the full Skatliste), not only rounds where the player was declarer.
2. WHEN a Claimed_Player views a linked session, THE Profil_Seite SHALL display the full table statistics — Seeger-Fabian scores, player rankings, and round history — for that session, using the same data and calculations as the Host's view.
3. THE Profil_Seite SHALL indicate that the view is read-only by not rendering any edit, delete, or add-round controls, and by not rendering any session settings controls (seating reorder, table name, geber_index) for Claimed_Players.
4. WHILE a Claimed_Player views a linked session, THE Profil_Seite SHALL NOT allow the player to modify rounds, change settings, rename players, or perform any write operation on the session.
5. WHEN a Claimed_Player navigates to a linked session's detail view, THE Sync_Service SHALL load the full session data (all rounds, seating, spiellisten) using the existing `loadSession` function, authorized by the RLS policy that grants read access to claimed players.
6. IF the RLS policy denies access to a session's data, THEN THE Profil_Seite SHALL display an error message indicating access was denied and SHALL NOT render partial session data.
7. IF a Claimed_Player's link to a session is removed (session_players row deleted or session deleted by Host) while the player is viewing that session, THEN THE Profil_Seite SHALL display an error message indicating the session is no longer accessible and SHALL navigate the user back to the profile session list.

---

### Requirement 6: Profile page shows linked sessions with full access

**User Story:** As a claimed player, I want my profile page to list all sessions I'm linked to and let me navigate into each one to see the full table, so that I have a central hub for all my Skat tables.

#### Acceptance Criteria

1. WHEN a logged-in user opens `/mein-profil`, THE Profil_Seite SHALL list all sessions where the user has a `session_players` row with their `user_id`, ordered by most recently played round first.
2. THE Profil_Seite SHALL display each linked session with its table name (or "Unbenannter Tisch" if none is set), the user's `display_name` in that session, and the total number of rounds played across all players in that session.
3. WHEN the user clicks on a linked session entry, THE Profil_Seite SHALL navigate to a read-only detail view (a separate route or expanded in-page panel) showing the full Skatliste and table statistics (Seeger-Fabian scores, player rankings, round history) for that session.
4. THE Profil_Seite SHALL display the aggregated cross-table statistics — total declarer rounds, win rate, and cumulative points over time — computed from all rounds where the user's `display_name` matches the `player` field.
5. IF the user has no linked sessions, THEN THE Profil_Seite SHALL display an onboarding hint that instructs the user to request an invite link from the table host in order to claim their player slot.
6. IF the session list fails to load due to a network or database error, THEN THE Profil_Seite SHALL display an error message and a retry control, without rendering partial or stale session data.

---

### Requirement 7: Rename consistency with name-based linking

**User Story:** As a host, I want player renames to update the claim link correctly, so that the claimed player's identity follows the new name.

#### Acceptance Criteria

1. WHEN the Host renames a player from an old `display_name` to a new `display_name`, THE Sync_Service SHALL update the `display_name` in the corresponding `session_players` row to the new name while preserving the `user_id` unchanged.
2. WHEN the Host renames a player, THE Sync_Service SHALL update the session's `seating` array to reflect the new name at the same position.
3. WHEN a player is renamed and a Claim_Token exists for the old `display_name` with `used = false` and a non-expired `expires_at`, THE Sync_Service SHALL update that token's `display_name` to the new name so that pending invite links remain valid.
4. IF the new `display_name` already exists in the session's `seating` array or in `session_players` for the same session, THEN THE Sync_Service SHALL reject the rename and return a conflict error indicating the name is already in use.
5. IF the new `display_name` is empty, contains only whitespace, or exceeds 30 characters, THEN THE Sync_Service SHALL reject the rename and return a validation error.
6. WHEN `loadMyRoundsAcrossSessions` is called after a rename, THE Sync_Service SHALL return all rounds from the linked session (both those recorded under the old name and the new name), because the link is based on `user_id` and the full session's rounds are loaded.
7. IF a user who is not the Host attempts to rename a player, THEN THE Sync_Service SHALL reject the operation and return an authorization error.

---

### Requirement 8: Host retains exclusive write access

**User Story:** As a host, I want to remain the only person who can edit rounds, change settings, and manage the table, so that claimed players cannot accidentally modify the game data.

#### Acceptance Criteria

1. THE Sync_Service SHALL enforce that only the Host (`sessions.user_id`) can insert, update, or delete rounds in a session.
2. THE Sync_Service SHALL enforce that only the Host can update session settings (seating order, table name, geber_index).
3. THE Sync_Service SHALL enforce that only the Host can create, close, or modify Spiellisten.
4. WHILE a Claimed_Player accesses session data, THE RLS policies SHALL grant SELECT-only access to `rounds`, `sessions`, `spiellisten`, and `session_players` for that session.
5. IF a Claimed_Player attempts a write operation on a session they do not own, THEN THE database SHALL reject the operation via RLS policy and the Sync_Service SHALL return an authorization error to the caller.
6. IF an unauthenticated request attempts a write operation on any session, THEN THE database SHALL reject the operation via RLS policy.

---

### Requirement 9: Backward compatibility

**User Story:** As an existing user, I want my current sessions and claim tokens to continue working after the migration, so that no data is lost.

#### Acceptance Criteria

1. THE migration SHALL NOT break existing `session_players` rows that use `slot_index` for their identity link.
2. WHEN the application encounters a `claim_tokens` row with `slot_index` set and `display_name` null, THE Sync_Service SHALL fall back to resolving the target player via `seating[slot_index]` from the session.
3. THE Sync_Service SHALL handle both old-style tokens (with `slot_index`) and new-style tokens (with `display_name`) in the `claimSlot` function.
4. WHEN a new claim token is generated after the migration, THE Sync_Service SHALL always use `display_name` and set `slot_index` to null.
