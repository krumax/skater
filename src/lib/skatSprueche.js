/**
 * skatSprueche.js — Skatsprüche Matching-Logik.
 *
 * Sprüche erscheinen nicht bei jeder Runde — nur mit einer
 * Wahrscheinlichkeit von 35%, um Gewöhnungseffekte zu vermeiden.
 * Bei spezifischen Bedingungen (Spaltarsch, Serien, etc.) steigt
 * die Wahrscheinlichkeit auf 70%.
 */

const SPRUECHE = [
  // Sieg — allgemein
  { situation: 'Sieg', bedingung: null,              spruch: 'Well played {{player}}! Der Sack ist zu Leute!' },
  { situation: 'Sieg', bedingung: null,              spruch: 'Glück muss man haben, ne {{player}}?' },
  { situation: 'Sieg', bedingung: null,              spruch: 'Auf das magerste Pferd setzen sich die meisten Fliegen' },
  { situation: 'Sieg', bedingung: null,              spruch: '{{player}} so: Das genügt, sagt der Staatsanwalt' },
  { situation: 'Sieg', bedingung: null,              spruch: 'Die ersten Pflaumen sind immer madig' },
  // Sieg — Spieltyp
  { situation: 'Sieg', bedingung: 'schneider',       spruch: 'Schneider sind auch Menschen' },
  { situation: 'Sieg', bedingung: 'schneider',       spruch: 'Oma-Blatt' },
  { situation: 'Sieg', bedingung: 'schneider',       spruch: 'Alle Gewehre auf\'s Rathaus' },
  { situation: 'Sieg', bedingung: 'schneider',       spruch: 'Der {{player}} hat sich aber warm angezogen' },
  { situation: 'Sieg', bedingung: 'schneider',       spruch: 'Endlich wird die Wiese grün' },
  { situation: 'Sieg', bedingung: 'schwarz',         spruch: '{{player}} spielt mit gezinkten Karten' },
  { situation: 'Sieg', bedingung: 'schwarz',         spruch: 'Schwarz wie die Nacht' },
  { situation: 'Sieg', bedingung: 'club',            spruch: 'Ein Kreuz, ein Leid…' },
  { situation: 'Sieg', bedingung: 'heart',           spruch: 'Herzen mit Schmerzen' },
  { situation: 'Sieg', bedingung: 'spade',           spruch: 'Grün, das scheißen die Gänse' },
  { situation: 'Sieg', bedingung: 'spade',           spruch: 'Also, Pikus der Waldspecht' },
  { situation: 'Sieg', bedingung: 'diamond',         spruch: 'Billig mit Millich still ich das Kind' },
  { situation: 'Sieg', bedingung: 'diamond',         spruch: 'Karo, dieser Hühnerhund' },
  { situation: 'Sieg', bedingung: 'null',            spruch: 'Null auf dem Pferde' },
  { situation: 'Sieg', bedingung: 'mit3',            spruch: 'Wer die Buben hat, hat die Macht! Hart gespielt {{player}}!' },
  { situation: 'Sieg', bedingung: 'mit3',            spruch: 'Das Spiel gewinnt meine Großmutter in der Narkose' },
  // Sieg — Serien
  { situation: 'Sieg', bedingung: 'serie3',          spruch: 'Heute läuft\'s' },
  { situation: 'Sieg', bedingung: 'serie4',          spruch: '{{player}} hat sich dicke vollgesogen! Widerlich' },
  { situation: 'Sieg', bedingung: 'serie5',          spruch: '{{player}} hat sich wohl am Schweinestall gescheuert' },
  // Niederlage — allgemein
  { situation: 'Niederlage', bedingung: null,        spruch: 'Jetzt ist der Drops für {{player}} gelutscht' },
  { situation: 'Niederlage', bedingung: null,        spruch: 'Skat ist wie das Leben - mal hat man Glück, mal nicht' },
  { situation: 'Niederlage', bedingung: null,        spruch: 'Dem Alleinspieler nichts schenken' },
  { situation: 'Niederlage', bedingung: null,        spruch: 'Is wie es is: Manchmal verliert man und manchmal gewinnen die andern' },
  { situation: 'Niederlage', bedingung: null,        spruch: 'Wer zählt, gewinnt' },
  { situation: 'Niederlage', bedingung: null,        spruch: '{{player}}!! Erst denken, dann spielen' },
  { situation: 'Niederlage', bedingung: null,        spruch: '„Einmal genügt", sagt der Staatsanwalt' },
  { situation: 'Niederlage', bedingung: null,        spruch: 'Aber wer sagt denn, dass der Löwe kein Schmalz frisst' },
  { situation: 'Niederlage', bedingung: null,        spruch: 'Aha, sagte die Polizei, jetzt kommt\'s Gewitter von hinten' },
  { situation: 'Niederlage', bedingung: null,        spruch: 'Aus, dein treuer Vater…' },
  { situation: 'Niederlage', bedingung: null,        spruch: 'Die Beerdigung findet vom Trauerhaus aus statt' },
  { situation: 'Niederlage', bedingung: null,        spruch: 'Ein richtiger Skatspieler gewinnt mit 59…' },
  { situation: 'Niederlage', bedingung: null,        spruch: 'Gute Nacht {{player}}' },
  // Niederlage — Spieltyp / Bedingung
  { situation: 'Niederlage', bedingung: 'schneider', spruch: 'Boah! {{player}}!! Abgestochen wie eine Sau' },
  { situation: 'Niederlage', bedingung: 'schneider', spruch: 'Da bist du aber fein davon gekommen' },
  { situation: 'Niederlage', bedingung: 'schneider', spruch: 'Da war kein Blumentopf zu gewinnen' },
  { situation: 'Niederlage', bedingung: 'schneider', spruch: 'Der sitzt im Keller' },
  { situation: 'Niederlage', bedingung: 'ohnetrumpf', spruch: 'Ohne Trumpf kein Kampf' },
  { situation: 'Niederlage', bedingung: 'passed',    spruch: 'Raupenfraß' },
  // Niederlage — Serien
  { situation: 'Niederlage', bedingung: 'serie3',    spruch: 'Das wird aber ein kalter Winter für {{player}}! Man ey!' },
  { situation: 'Niederlage', bedingung: 'serie4',    spruch: 'Jetzt kann {{player}} wohl das Licht ausmachen' },
  { situation: 'Niederlage', bedingung: 'serie5',    spruch: 'Kein Abend für Künstler' },
  { situation: 'Niederlage', bedingung: 'serie5',    spruch: 'Kein Abend für {{player}}' },
  // Spaltarsch
  { situation: 'Niederlage', bedingung: 'spaltarsch', spruch: 'Ehrlich geteilt, Sinnig gespalten!' },
  { situation: 'Niederlage', bedingung: 'spaltarsch', spruch: 'Höhere Gewalten haben ihm den Arsch gespalten' },
  { situation: 'Niederlage', bedingung: 'spaltarsch', spruch: 'Mensch, du hast doch glatt dasselbe wie wir' },
];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Ermittelt einen passenden Skatspruch für die aktuelle Runde.
 *
 * @param {object} round      - Die gerade gespeicherte Runde
 * @param {Array}  allRounds  - Alle Runden (für Serien-Berechnung)
 * @returns {string|null}     - Spruch oder null (kein Toast)
 */
export function getSkatSpruch(round, allRounds) {
  const isWon    = round.won;
  const gameType = round.gameType;
  const player   = round.player;

  // Bedingungen ermitteln
  const isSpaltarsch  = !isWon && gameType !== 'null' && gameType !== 'passed' && round.eyeCount === 60;
  const isSchneider   = round.schneider || (round.eyeCount !== undefined && (isWon ? round.eyeCount >= 90 : round.eyeCount <= 30));
  const isSchwarz     = round.schwarz   || (round.eyeCount !== undefined && (isWon ? round.eyeCount >= 120 : round.eyeCount === 0));
  const isPassed      = gameType === 'passed';
  const isOhnetrumpf  = !isWon && round.mitOhne === 'ohne' && round.spitzen >= 3;
  const isMit3        = isWon && round.mitOhne === 'mit' && round.spitzen >= 3;

  // Aktuelle Serie berechnen
  const playerRounds = allRounds.filter(r => r.player === player);
  let serie = 0;
  for (let i = playerRounds.length - 1; i >= 0; i--) {
    if (playerRounds[i].won === isWon) serie++;
    else break;
  }

  // Spezifische Bedingungen sammeln (Priorität: spezifisch > allgemein)
  const situation = isWon ? 'Sieg' : 'Niederlage';
  const candidates = [];

  // Spaltarsch hat höchste Priorität
  if (isSpaltarsch) {
    candidates.push(...SPRUECHE.filter(s => s.bedingung === 'spaltarsch'));
  }

  // Serien (ab 5, 4, 3 — höchste zuerst)
  if (serie >= 5) candidates.push(...SPRUECHE.filter(s => s.situation === situation && s.bedingung === 'serie5'));
  if (serie >= 4) candidates.push(...SPRUECHE.filter(s => s.situation === situation && s.bedingung === 'serie4'));
  if (serie >= 3) candidates.push(...SPRUECHE.filter(s => s.situation === situation && s.bedingung === 'serie3'));

  // Spieltyp-spezifisch
  if (isSchwarz)    candidates.push(...SPRUECHE.filter(s => s.situation === situation && s.bedingung === 'schwarz'));
  if (isSchneider)  candidates.push(...SPRUECHE.filter(s => s.situation === situation && s.bedingung === 'schneider'));
  if (isMit3)       candidates.push(...SPRUECHE.filter(s => s.situation === situation && s.bedingung === 'mit3'));
  if (isOhnetrumpf) candidates.push(...SPRUECHE.filter(s => s.situation === situation && s.bedingung === 'ohnetrumpf'));
  if (isPassed)     candidates.push(...SPRUECHE.filter(s => s.situation === situation && s.bedingung === 'passed'));
  if (['club','spade','heart','diamond','null'].includes(gameType)) {
    candidates.push(...SPRUECHE.filter(s => s.situation === situation && s.bedingung === gameType));
  }

  // Allgemeine Fallbacks
  candidates.push(...SPRUECHE.filter(s => s.situation === situation && s.bedingung === null));

  if (candidates.length === 0) return null;

  // Wahrscheinlichkeit: spezifische Bedingung → 70%, sonst → 35%
  const hasSpecific = isSpaltarsch || serie >= 3 || isSchwarz || isSchneider || isMit3 || isOhnetrumpf || isPassed;
  const probability = hasSpecific ? 0.70 : 0.35;

  if (Math.random() > probability) return null;

  return pick(candidates).spruch.replace('{{player}}', player);
}
