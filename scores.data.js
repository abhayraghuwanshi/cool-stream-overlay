// Shared score-feed helpers — imported by both the Vercel function (api/scores.js)
// and the dev middleware (vite.config.js) so the match list behaves the same in
// production and in `npm run dev`. Pure Node (uses global fetch); never imported
// by client code, which talks to /api/scores instead.

// Football-data.org match status → the compact status the scoreboard uses.
export const mapStatus = (s) =>
    ({ IN_PLAY: 'LIVE', PAUSED: 'HT', FINISHED: 'FT' })[s] || 'SCHED';

// Trim a football-data v4 match down to the fields the overlay needs. National
// teams expose a `crest` image (their flag) which we use directly as the flag
// URL; team name prefers the 3-letter code (BRA) for the compact scoreboard.
export function normalizeMatch(m) {
    return {
        id: m.id,
        utcDate: m.utcDate,
        status: mapStatus(m.status),
        minute: m.minute ?? null,
        stage: m.stage ? String(m.stage).replace(/_/g, ' ') : (m.group || ''),
        home: { name: m.homeTeam?.tla || m.homeTeam?.shortName || m.homeTeam?.name || 'TBD', flag: m.homeTeam?.crest || '' },
        away: { name: m.awayTeam?.tla || m.awayTeam?.shortName || m.awayTeam?.name || 'TBD', flag: m.awayTeam?.crest || '' },
        score: { home: m.score?.fullTime?.home ?? 0, away: m.score?.fullTime?.away ?? 0 },
    };
}

// Fetch + normalize the competition's matches. `competition` is a football-data
// code (WC = World Cup). Throws on a non-OK response so the caller can fall back.
export async function fetchMatches(token, competition = 'WC') {
    const r = await fetch(`https://api.football-data.org/v4/competitions/${competition}/matches`, {
        headers: { 'X-Auth-Token': token },
    });
    if (!r.ok) throw new Error(`feed ${r.status}`);
    const data = await r.json();
    return (data.matches || []).map(normalizeMatch);
}

// Shown when no FOOTBALL_DATA_TOKEN is set, so the match picker is usable and
// demoable without an API key. Flags here are 2-letter ISO codes (flagcdn);
// real feed data uses crest image URLs. Replaced entirely once a token exists.
export const SAMPLE_MATCHES = [
    { id: 's-bra-arg', utcDate: '2026-06-23T22:30:00Z', status: 'LIVE', minute: 67, stage: 'Group G', home: { name: 'BRA', flag: 'br' }, away: { name: 'ARG', flag: 'ar' }, score: { home: 2, away: 1 } },
    { id: 's-fra-mex', utcDate: '2026-06-22T19:00:00Z', status: 'FT',   minute: null, stage: 'Group F', home: { name: 'FRA', flag: 'fr' }, away: { name: 'MEX', flag: 'mx' }, score: { home: 3, away: 1 } },
    { id: 's-ger-jpn', utcDate: '2026-06-22T16:00:00Z', status: 'FT',   minute: null, stage: 'Group E', home: { name: 'GER', flag: 'de' }, away: { name: 'JPN', flag: 'jp' }, score: { home: 1, away: 2 } },
    { id: 's-por-uzb', utcDate: '2026-06-23T17:00:00Z', status: 'SCHED', minute: null, stage: 'Group K', home: { name: 'POR', flag: 'pt' }, away: { name: 'UZB', flag: 'uz' }, score: { home: 0, away: 0 } },
    { id: 's-eng-gha', utcDate: '2026-06-24T20:00:00Z', status: 'SCHED', minute: null, stage: 'Group L', home: { name: 'ENG', flag: 'gb-eng' }, away: { name: 'GHA', flag: 'gh' }, score: { home: 0, away: 0 } },
    { id: 's-esp-uru', utcDate: '2026-06-24T22:30:00Z', status: 'SCHED', minute: null, stage: 'Group H', home: { name: 'ESP', flag: 'es' }, away: { name: 'URU', flag: 'uy' }, score: { home: 0, away: 0 } },
];
