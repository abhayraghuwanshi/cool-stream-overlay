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
const tidy = (s) => s ? String(s).replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase()) : '';
const team = (t) => ({
    name: t?.tla || t?.shortName || t?.name || 'TBD',   // compact label for the scoreboard
    full: t?.name || t?.shortName || '',                 // full country name
    flag: t?.crest || '',
});

export function normalizeMatch(m) {
    const ref = (m.referees || []).find(r => r.type === 'REFEREE') || (m.referees || [])[0];
    return {
        id: m.id,
        utcDate: m.utcDate,
        status: mapStatus(m.status),
        minute: m.minute ?? null,
        stage: tidy(m.stage),
        group: tidy(m.group),
        matchday: m.matchday ?? null,
        referee: ref ? { name: ref.name, nationality: ref.nationality || '' } : null,
        home: team(m.homeTeam),
        away: team(m.awayTeam),
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
const sTeam = (name, full, flag) => ({ name, full, flag });
export const SAMPLE_MATCHES = [
    { id: 's-bra-arg', utcDate: '2026-06-23T22:30:00Z', status: 'LIVE', minute: 67, stage: 'Group Stage', group: 'Group G', matchday: 2, referee: { name: 'Daniele Orsato', nationality: 'Italy' }, home: sTeam('BRA', 'Brazil', 'br'), away: sTeam('ARG', 'Argentina', 'ar'), score: { home: 2, away: 1 } },
    { id: 's-fra-mex', utcDate: '2026-06-22T19:00:00Z', status: 'FT',   minute: null, stage: 'Group Stage', group: 'Group F', matchday: 2, referee: { name: 'Wilton Sampaio', nationality: 'Brazil' }, home: sTeam('FRA', 'France', 'fr'), away: sTeam('MEX', 'Mexico', 'mx'), score: { home: 3, away: 1 } },
    { id: 's-ger-jpn', utcDate: '2026-06-22T16:00:00Z', status: 'FT',   minute: null, stage: 'Group Stage', group: 'Group E', matchday: 2, referee: null, home: sTeam('GER', 'Germany', 'de'), away: sTeam('JPN', 'Japan', 'jp'), score: { home: 1, away: 2 } },
    { id: 's-por-uzb', utcDate: '2026-06-23T17:00:00Z', status: 'SCHED', minute: null, stage: 'Group Stage', group: 'Group K', matchday: 2, referee: null, home: sTeam('POR', 'Portugal', 'pt'), away: sTeam('UZB', 'Uzbekistan', 'uz'), score: { home: 0, away: 0 } },
    { id: 's-eng-gha', utcDate: '2026-06-24T20:00:00Z', status: 'SCHED', minute: null, stage: 'Group Stage', group: 'Group L', matchday: 2, referee: null, home: sTeam('ENG', 'England', 'gb-eng'), away: sTeam('GHA', 'Ghana', 'gh'), score: { home: 0, away: 0 } },
    { id: 's-esp-uru', utcDate: '2026-06-24T22:30:00Z', status: 'SCHED', minute: null, stage: 'Group Stage', group: 'Group H', matchday: 2, referee: null, home: sTeam('ESP', 'Spain', 'es'), away: sTeam('URU', 'Uruguay', 'uy'), score: { home: 0, away: 0 } },
];
