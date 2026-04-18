-- Migration: 20260418_spiellisten
-- Fügt die spiellisten-Tabelle hinzu und erweitert rounds um spielliste_id.

-- Neue Tabelle: spiellisten
CREATE TABLE spiellisten (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  name            TEXT NOT NULL CHECK (char_length(name) <= 40),
  round_count     INTEGER NOT NULL CHECK (round_count >= 3 AND round_count <= 36 AND round_count % 3 = 0),
  status          TEXT NOT NULL DEFAULT 'aktiv' CHECK (status IN ('aktiv', 'abgeschlossen')),
  winner          TEXT[] DEFAULT NULL,
  last_touched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id         UUID REFERENCES auth.users(id)
);

-- Erweiterung der rounds-Tabelle
ALTER TABLE rounds ADD COLUMN spielliste_id UUID REFERENCES spiellisten(id) ON DELETE SET NULL;

-- Indizes für häufige Abfragen
CREATE INDEX idx_spiellisten_session_id ON spiellisten(session_id);
CREATE INDEX idx_rounds_spielliste_id ON rounds(spielliste_id);

-- RLS aktivieren
ALTER TABLE spiellisten ENABLE ROW LEVEL SECURITY;

-- Policies für anonymen und authentifizierten Lese-/Schreibzugriff
CREATE POLICY "Anon read/write spiellisten"
  ON spiellisten FOR ALL TO anon
  USING (true) WITH CHECK (true);

CREATE POLICY "Auth read/write spiellisten"
  ON spiellisten FOR ALL TO authenticated
  USING (true) WITH CHECK (true);
