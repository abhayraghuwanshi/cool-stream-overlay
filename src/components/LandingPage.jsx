import { useEffect, useState } from 'react';
import { scoresUrl, usageUrl } from '../config';

// Flag value → image: a feed crest URL passes through; a 2-letter code → flagcdn.
const flagSrc = (v) => {
    const s = String(v || '').trim();
    if (/^https?:\/\//i.test(s)) return s;
    const c = s.toLowerCase();
    return /^[a-z]{2}(-[a-z]{2,3})?$/.test(c) ? `https://flagcdn.com/w40/${c}.png` : null;
};

// in-play → upcoming (soonest) → finished (most recent), same as the editor picker.
const matchRank = (m) => (m.status === 'LIVE' || m.status === 'HT') ? 0 : m.status === 'SCHED' ? 1 : 2;
const sortMatches = (a, b) => {
    const pa = matchRank(a), pb = matchRank(b);
    if (pa !== pb) return pa - pb;
    const ta = +new Date(a.utcDate), tb = +new Date(b.utcDate);
    return pa === 2 ? tb - ta : ta - tb;
};
const matchWhen = (m) => {
    if (m.status === 'LIVE') return `${m.minute ?? 0}'`;
    if (m.status === 'HT') return 'HT';
    if (m.status === 'FT') return 'FT';
    try { return new Date(m.utcDate).toLocaleString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' }); }
    catch { return 'Soon'; }
};

const FEATURES = [
    { icon: '🎛️', title: 'Drag-and-drop editor', desc: 'Place cams, text and widgets on a live 16:9 canvas. No code, no installs.' },
    { icon: '📺', title: 'OBS browser source', desc: 'One link drops the overlay straight into OBS. Your edits sync to it live.' },
    { icon: '⚽', title: 'Live World Cup scoreboard', desc: 'Search a match, pick it, and the score auto-updates on stream by itself.' },
    { icon: '🐾', title: 'Channel pets & mood ring', desc: 'Cute mascots that roam and react to the vibe of your stream.' },
    { icon: '🎯', title: 'Goals, timers & widgets', desc: 'Follower/sub goals, countdowns, pomodoro, tickers, sticky notes, a spin wheel.' },
    { icon: '🎨', title: 'One-click themes + recording', desc: 'Re-skin the entire overlay instantly, and record your stream in-browser.' },
];

const C = {
    accent: '#6366f1', accent2: '#a855f7', green: '#34d399', gold: '#facc15',
    text: '#f4f4f8', dim: 'rgba(255,255,255,0.55)', faint: 'rgba(255,255,255,0.32)',
    panel: 'rgba(255,255,255,0.04)', border: 'rgba(255,255,255,0.08)',
};

const Stat = ({ value, label }) => (
    <div style={{ flex: '1 1 140px', background: C.panel, border: `1px solid ${C.border}`, borderRadius: 14, padding: '18px 20px', textAlign: 'center' }}>
        <div style={{ fontSize: 30, fontWeight: 900, color: C.text, fontFamily: 'monospace', lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: 11, color: C.faint, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: 1.5, marginTop: 6 }}>{label}</div>
    </div>
);

const MatchCard = ({ m }) => {
    const live = m.status === 'LIVE' || m.status === 'HT';
    const fa = flagSrc(m.home.flag), fb = flagSrc(m.away.flag);
    const Flag = ({ src }) => src ? <img src={src} alt="" style={{ width: 22, height: 15, objectFit: 'cover', borderRadius: 2, flexShrink: 0 }} onError={e => e.currentTarget.style.display = 'none'} /> : null;
    return (
        <div style={{ background: C.panel, border: `1px solid ${live ? 'rgba(255,90,90,0.4)' : C.border}`, borderRadius: 12, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 10, fontFamily: 'monospace', letterSpacing: 1 }}>
                <span style={{ color: C.faint, textTransform: 'uppercase' }}>{m.stage || 'World Cup'}</span>
                <span style={{ color: live ? '#ff6b6b' : C.dim, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                    {live && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#ff3b3b', boxShadow: '0 0 6px #ff3b3b', animation: 'pulse 1.4s ease-in-out infinite' }} />}
                    {matchWhen(m)}
                </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 }}>
                    <Flag src={fa} /><span style={{ fontSize: 13, fontWeight: 700, color: C.text, fontFamily: 'monospace' }}>{m.home.name}</span>
                </div>
                <span style={{ fontSize: 18, fontWeight: 900, color: C.gold, fontFamily: 'monospace', fontVariantNumeric: 'tabular-nums' }}>{m.score.home}–{m.score.away}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 0, justifyContent: 'flex-end' }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: C.text, fontFamily: 'monospace' }}>{m.away.name}</span><Flag src={fb} />
                </div>
            </div>
        </div>
    );
};

export default function LandingPage() {
    const [matches, setMatches] = useState(null);
    const [stats, setStats] = useState(null);

    useEffect(() => {
        document.title = 'Overlay Studio — custom stream overlays in your browser';
        let alive = true;
        fetch(scoresUrl()).then(r => r.ok ? r.json() : null).then(d => { if (alive) setMatches(d?.matches || []); }).catch(() => { if (alive) setMatches([]); });
        fetch(`${usageUrl()}?summary=1&days=14`).then(r => r.ok ? r.json() : null).then(d => { if (alive && d) setStats(d); }).catch(() => {});
        return () => { alive = false; };
    }, []);

    const topMatches = (matches || []).slice().sort(sortMatches).slice(0, 6);
    const num = (n) => n == null ? '—' : Intl.NumberFormat().format(n);

    const wrap = { maxWidth: 1080, margin: '0 auto', padding: '0 24px', boxSizing: 'border-box' };
    const sectionLabel = { fontSize: 11, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: 3, color: C.accent2, marginBottom: 10 };

    return (
        <div style={{ minHeight: '100vh', background: 'radial-gradient(1200px 600px at 50% -10%, rgba(99,102,241,0.18), transparent), #08080d', color: C.text, fontFamily: 'inter, system-ui, sans-serif' }}>
            {/* Nav */}
            <div style={{ ...wrap, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9, fontWeight: 800, letterSpacing: 0.5 }}>
                    <span style={{ width: 12, height: 12, borderRadius: 4, background: `linear-gradient(135deg, ${C.accent}, ${C.accent2})`, display: 'inline-block' }} />
                    Overlay Studio
                </div>
                <a href="/" style={{ textDecoration: 'none', fontSize: 13, fontWeight: 700, color: '#fff', background: `linear-gradient(135deg, ${C.accent}, ${C.accent2})`, padding: '9px 18px', borderRadius: 9 }}>Open Studio →</a>
            </div>

            {/* Hero */}
            <div style={{ ...wrap, textAlign: 'center', paddingTop: 64, paddingBottom: 40 }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 11, fontFamily: 'monospace', color: C.green, border: `1px solid ${C.border}`, borderRadius: 99, padding: '5px 12px', marginBottom: 22 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.green, boxShadow: `0 0 6px ${C.green}` }} />
                    Now with a live World Cup scoreboard
                </div>
                <h1 style={{ fontSize: 'clamp(34px, 6vw, 60px)', fontWeight: 900, lineHeight: 1.05, margin: 0, letterSpacing: -1 }}>
                    Your stream overlay,<br /><span style={{ background: `linear-gradient(135deg, ${C.accent}, ${C.accent2})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>built in the browser</span>
                </h1>
                <p style={{ fontSize: 'clamp(15px, 2.4vw, 19px)', color: C.dim, maxWidth: 600, margin: '20px auto 0', lineHeight: 1.55 }}>
                    Drag, drop, and theme a custom overlay — then drop one link into OBS. Cameras, live scores, goals, pets, timers, and recording, no installs.
                </p>
                <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginTop: 30 }}>
                    <a href="/" style={{ textDecoration: 'none', fontSize: 15, fontWeight: 800, color: '#fff', background: `linear-gradient(135deg, ${C.accent}, ${C.accent2})`, padding: '13px 26px', borderRadius: 11 }}>Open Studio →</a>
                    <a href="#features" style={{ textDecoration: 'none', fontSize: 15, fontWeight: 700, color: C.text, background: C.panel, border: `1px solid ${C.border}`, padding: '13px 26px', borderRadius: 11 }}>See features</a>
                </div>
            </div>

            {/* Stats */}
            <div style={{ ...wrap, paddingTop: 16, paddingBottom: 40 }}>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    <Stat value={num(stats?.rooms)} label="Overlays created" />
                    <Stat value={num(stats?.today?.uniques)} label="Visitors today" />
                    <Stat value={num(stats?.totalLoads)} label="Loads · 14 days" />
                </div>
            </div>

            {/* Live World Cup */}
            {topMatches.length > 0 && (
                <div style={{ ...wrap, paddingBottom: 48 }}>
                    <div style={sectionLabel}>⚽ Live from the World Cup</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
                        {topMatches.map(m => <MatchCard key={m.id} m={m} />)}
                    </div>
                    <div style={{ fontSize: 11, color: C.faint, fontFamily: 'monospace', marginTop: 12 }}>
                        The same feed powers the in-overlay scoreboard. Pick a match in the studio and it tracks the score for you.
                    </div>
                </div>
            )}

            {/* Features */}
            <div id="features" style={{ ...wrap, paddingBottom: 56 }}>
                <div style={sectionLabel}>What's inside</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
                    {FEATURES.map(f => (
                        <div key={f.title} style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 14, padding: '20px' }}>
                            <div style={{ fontSize: 26, marginBottom: 10 }}>{f.icon}</div>
                            <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 6 }}>{f.title}</div>
                            <div style={{ fontSize: 13.5, color: C.dim, lineHeight: 1.5 }}>{f.desc}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Footer CTA */}
            <div style={{ ...wrap, textAlign: 'center', paddingBottom: 72 }}>
                <div style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(168,85,247,0.12))', border: `1px solid ${C.border}`, borderRadius: 20, padding: '40px 24px' }}>
                    <h2 style={{ fontSize: 'clamp(24px, 4vw, 34px)', fontWeight: 900, margin: 0 }}>Ready to build your overlay?</h2>
                    <p style={{ color: C.dim, marginTop: 10, marginBottom: 24 }}>It's free, runs in your browser, and works with OBS.</p>
                    <a href="/" style={{ textDecoration: 'none', fontSize: 15, fontWeight: 800, color: '#fff', background: `linear-gradient(135deg, ${C.accent}, ${C.accent2})`, padding: '14px 30px', borderRadius: 11 }}>Open Studio →</a>
                </div>
                <div style={{ fontSize: 12, color: C.faint, marginTop: 28 }}>Overlay Studio · runs as an OBS browser source</div>
            </div>
        </div>
    );
}
