# Skatastrophe - Product Overview

Skatastrophe is a German-language PWA for tracking Skat card game sessions at the table. It replaces pen-and-paper scorekeeping with automated, rule-compliant scoring and cloud sync.

## Core Purpose
- Record Skat rounds with full rule support (all game types, modifiers, Seeger-Fabian tournament scoring)
- Manage table sessions with 3–4 players, automatic role rotation (Geber/Hören/Sagen)
- Sync session data to Supabase so all devices at the table stay in sync
- Installable as a PWA with offline-capable service worker

## Key Features
- **Scoring engine**: Handles Kreuz/Pik/Herz/Karo/Grand/Null, Spitzen, Hand, Schneider, Schwarz, Ouvert, Bockrunden
- **Seeger-Fabian system**: Tournament bonus scoring (+50/-50 for declarer, +40 for opponents)
- **Player analytics**: Win rates, streaks, game type distribution, Brot/Baguette counters, heatmaps, boxplots, histograms
- **Achievements**: Matrix of unlockable combinations (attack + defense), level system, live celebration UI
- **Trophy showcase (Vitrine)**: Dedicated page displaying earned trophies and accomplishments
- **Player identity (Claim)**: Players can claim a slot to link their identity across sessions and tables
- **Personal profile (Mein Profil)**: Player-specific profile page with cross-session stats
- **Spiellisten**: Game list feature with progress tracking
- **Iconset selection**: Altenburg card suit icons in simple and detailed variants
- **Session management**: Create/switch/reset sessions, edit/delete past rounds, rename players
- **Auth gate**: Password protection for app access

## Architecture
- **Landing page** at root `/` - static HTML/CSS/JS marketing page
- **React app** at `/app/` - the full SPA with all features above
- **PWA** with service worker and update prompts

## Language
UI text, comments, and user-facing strings are in **German**. Code identifiers and technical docs are in English.
