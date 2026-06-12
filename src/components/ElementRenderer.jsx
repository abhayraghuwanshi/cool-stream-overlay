import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AtSign, Globe, Instagram, MessageCircle, Music2, Twitch, Twitter, Youtube } from 'lucide-react';
import { DEFAULT_THEME, resolveElement } from '../theme/themes';
import { getMood } from '../theme/moods';
import { DEFAULT_PET, PetMascot, WalkingPet } from './pets';

// Social platforms surfaced by the `social` chip element. Each maps to a lucide
// icon and a brand tint; platforms lucide doesn't ship (discord/tiktok/kick) use
// the closest stand-in glyph. `null` colour falls back to the element fontColor.
const SOCIAL_ICONS = {
    twitch: Twitch, youtube: Youtube, x: Twitter, instagram: Instagram,
    discord: MessageCircle, tiktok: Music2, kick: Globe, web: Globe,
};
const SOCIAL_COLORS = {
    twitch: '#9146ff', youtube: '#ff0000', x: null, instagram: '#e1306c',
    discord: '#5865f2', tiktok: '#ff0050', kick: '#53fc18', web: null,
};

// Clip-path polygons for the filled-primitive shapes. Each renders like `shape`
// (bgColor + bgOpacity) but with the div clipped to the outline.
const CLIP_PATHS = {
    triangle: 'polygon(50% 0%, 100% 100%, 0% 100%)',
    diamond:  'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
    hexagon:  'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)',
    star:     'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)',
};

// Converts #rrggbb + alpha → rgba string
export const hexToRgba = (hex = '#000000', alpha = 1) => {
    const h = hex.replace('#', '');
    const r = parseInt(h.slice(0, 2), 16) || 0;
    const g = parseInt(h.slice(2, 4), 16) || 0;
    const b = parseInt(h.slice(4, 6), 16) || 0;
    return `rgba(${r},${g},${b},${alpha})`;
};

// Default values for each element type. New elements adopt the active theme's
// palette (accent fills, text color, corner radius) so they fit the look the
// streamer picked. Users can still override any value via the editor.
export const defaultElement = (type, theme = DEFAULT_THEME) => {
    const T = theme ?? DEFAULT_THEME;
    const base = {
        id: `el_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        type,
        hidden: false,
        box: { x: 35, y: 38, w: 30, h: 10 },
        opacity: 1,
        borderRadius: 0,
        bgColor: '#000000',
        bgOpacity: 0,
        // text
        content: 'New Title',
        subContent: 'Role / Subtitle',
        fontSize: 32,
        subFontSize: 13,
        fontColor: T.textColor,
        subFontColor: '#aaaaaa',
        bold: true,
        italic: false,
        align: 'center',
        letterSpacing: 0,
        // logo
        src: null,
        objectFit: 'contain',
        imgPadding: 0,
    };

    const overrides = {
        text:       { content: 'Title Text', fontSize: 36, bold: true },
        lowerthird: {
            content: 'Your Name', subContent: 'Role / Subtitle',
            fontSize: 20, subFontSize: 13,
            bgColor: T.panelColor, bgOpacity: 0.75, borderRadius: T.cornerRadius,
            bold: true, align: 'left',
            box: { x: 2, y: 74, w: 38, h: 12 },
        },
        shape: {
            bgColor: T.accent, bgOpacity: 0.85, borderRadius: T.cornerRadius,
            box: { x: 35, y: 35, w: 30, h: 20 },
        },
        divider: {
            bgColor: T.textColor, bgOpacity: 0.25,
            box: { x: 15, y: 48, w: 70, h: 1.2 },
        },
        circle: {
            bgColor: T.accent, bgOpacity: 0.85,
            box: { x: 42, y: 36, w: 16, h: 28 },
        },
        triangle: { bgColor: T.accent, bgOpacity: 0.85, box: { x: 40, y: 35, w: 20, h: 20 } },
        diamond:  { bgColor: T.accent, bgOpacity: 0.85, box: { x: 40, y: 35, w: 20, h: 20 } },
        hexagon:  { bgColor: T.accent, bgOpacity: 0.85, box: { x: 40, y: 35, w: 22, h: 20 } },
        star:     { bgColor: T.accent, bgOpacity: 0.85, box: { x: 40, y: 35, w: 20, h: 20 } },
        frame: {
            // Decorative border to sit over a cam box — transparent centre.
            bgColor: '@accent',        // token: re-skins with the theme
            bgOpacity: 0,
            borderRadius: '@radius',
            borderWidth: 4,
            frameStyle: T.frameStyle,  // none | solid | glow | gradient
            box: { x: 49, y: 6, w: 22, h: 32 },
        },
        logo: {
            bgOpacity: 0, objectFit: 'contain', imgPadding: 8,
            box: { x: 38, y: 35, w: 24, h: 18 },
        },
        clock: {
            content: '', fontSize: 28, fontColor: T.textColor,
            bold: false, align: 'center',
            box: { x: 38, y: 2, w: 24, h: 8 },
        },
        countdown: {
            content: '', fontSize: 48, fontColor: T.textColor,
            bold: true, align: 'center',
            durationSec: 300,   // counts down from this on mount (e.g. 5:00)
            box: { x: 38, y: 44, w: 24, h: 12 },
        },
        live: {
            content: 'LIVE', fontSize: 16, fontColor: '#ffffff',
            bold: true, align: 'center',
            bgColor: '#000000', bgOpacity: 0.55, borderRadius: 99,
            dotColor: '#ef4444', pulse: true,
            box: { x: 2, y: 3, w: 12, h: 6 },
        },
        social: {
            platform: 'twitch', content: '@yourhandle',
            fontSize: 15, fontColor: '#ffffff', bold: true, align: 'left',
            bgColor: '#000000', bgOpacity: 0.55, borderRadius: 99,
            box: { x: 2, y: 90, w: 22, h: 7 },
        },
        goal: {
            content: 'Follower Goal', current: 38, target: 50,
            fontSize: 13, fontColor: '#ffffff', bold: true,
            fillColor: '@accent',                 // token: tracks the theme accent
            bgColor: '#ffffff', bgOpacity: 0.12,  // the bar track
            borderRadius: 99,
            box: { x: 2, y: 88, w: 30, h: 9 },
        },
        liquidgoal: {
            content: 'Sub Goal', current: 7, target: 20,
            fontSize: 15, fontColor: '#ffffff', bold: true,
            fillColor: '@accent',                 // the liquid
            bgColor: '#ffffff', bgOpacity: 0.08,  // the empty container
            borderRadius: 18,
            box: { x: 4, y: 56, w: 13, h: 30 },   // tall jar
        },
        pomodoro: {
            content: '', workMin: 25, breakMin: 5,
            fontSize: 40, fontColor: T.textColor, bold: true, align: 'center',
            bgColor: '#000000', bgOpacity: 0.5, borderRadius: T.cornerRadius,
            box: { x: 38, y: 40, w: 24, h: 20 },
        },
        moodring: {
            mood: 'chill', auto: false, cycleSec: 20,
            box: { x: 2, y: 58, w: 11, h: 20 },
        },
        pet: {
            species: DEFAULT_PET, walk: false, speed: 'medium',
            box: { x: 78, y: 70, w: 16, h: 16 },
        },
        wheel: {
            options: ['Yes', 'No', 'Maybe', 'Ask chat'],
            spinSec: 4, auto: false, cycleSec: 30,
            fontColor: '#ffffff',
            box: { x: 70, y: 30, w: 18, h: 32 },   // square on a 16:9 canvas
        },
        note: {
            content: 'Stream notes…\n• say hi to new follows\n• water break @ 1h',
            paperColor: '#fde68a', fontColor: '#3a2f10',
            fontSize: 16, tilt: -3,
            box: { x: 74, y: 8, w: 20, h: 26 },
        },
        daycounter: {
            content: '#100DaysOfCode', day: 1, prefix: 'DAY',
            fontSize: 52, fontColor: T.textColor, bold: true,
            bgColor: '#000000', bgOpacity: 0,
            box: { x: 3, y: 4, w: 13, h: 18 },
        },
        ticker: {
            content: 'Welcome to the stream!\nDrop a follow if you like the vibe\n!discord to hang out',
            fontSize: 18, fontColor: T.textColor, bold: false,
            speed: 'medium',
            bgColor: T.panelColor, bgOpacity: 0.75,
            box: { x: 0, y: 93, w: 100, h: 7 },
        },
    };

    return { ...base, ...(overrides[type] ?? {}) };
};

// ── Clock sub-component (self-updating) ────────────────────────────────────
const ClockElement = ({ element }) => {
    const [now, setNow] = useState(new Date());
    useEffect(() => {
        const t = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(t);
    }, []);

    const time = now.toLocaleTimeString('en-US', {
        hour: '2-digit', minute: '2-digit', second: '2-digit',
    });

    // Boxes are %-based but fontSize is fixed px, so the same clock occupies a
    // different fraction of its box depending on canvas pixel width (editor panel
    // vs full-width OBS browser source) — and would clip. Measure the natural
    // single-line width against the box and scale down to fit. scrollWidth is the
    // pre-transform layout width, so the ratio stays stable as we scale.
    const wrapRef = useRef(null);
    const textRef = useRef(null);
    const [scale, setScale] = useState(1);
    useLayoutEffect(() => {
        const fit = () => {
            const wrap = wrapRef.current, txt = textRef.current;
            if (!wrap || !txt) return;
            // scrollWidth under-reports the painted width slightly (trailing
            // letter-spacing, the narrow no-break space before AM/PM, text-shadow
            // blur), so reserve a font-proportional slop or the last glyph clips.
            const slop = Math.max(8, (element.fontSize || 28) * 0.6);
            const avail = wrap.clientWidth - slop, natural = txt.scrollWidth;
            setScale(natural > avail && natural > 0 ? avail / natural : 1);
        };
        fit();
        const ro = new ResizeObserver(fit);
        if (wrapRef.current) ro.observe(wrapRef.current);
        return () => ro.disconnect();
    }, [time, element.fontSize, element.bold]);

    return (
        <span ref={wrapRef} style={{ width: '100%', display: 'block', textAlign: 'center', overflow: 'hidden' }}>
            <span ref={textRef} style={{
                display: 'inline-block',
                fontSize: element.fontSize,
                color: element.fontColor,
                fontWeight: element.bold ? 'bold' : 'normal',
                fontFamily: 'monospace',
                textShadow: '0 2px 8px rgba(0,0,0,0.6)',
                letterSpacing: 2,
                whiteSpace: 'nowrap',
                transform: scale < 1 ? `scale(${scale})` : 'none',
                transformOrigin: 'center',
            }}>
                {time}
            </span>
        </span>
    );
};

// ── Countdown sub-component (self-updating) ────────────────────────────────
// Counts down from `durationSec` when it mounts (and resets if the duration
// changes). On an OBS browser source that means it starts when the page loads
// / the scene is applied — the common "starting in 5:00" use case.
const fmtCountdown = (s) => {
    const safe = Math.max(0, s);
    const h = Math.floor(safe / 3600);
    const m = Math.floor((safe % 3600) / 60);
    const sec = safe % 60;
    const pad = (n) => String(n).padStart(2, '0');
    return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
};

const CountdownElement = ({ element }) => {
    const total = element.durationSec ?? 300;
    const [remaining, setRemaining] = useState(total);

    useEffect(() => {
        setRemaining(total);
        const t = setInterval(() => setRemaining(r => (r <= 0 ? 0 : r - 1)), 1000);
        return () => clearInterval(t);
    }, [total]);

    return (
        <span style={{
            fontSize: element.fontSize,
            color: element.fontColor,
            fontWeight: element.bold ? 'bold' : 'normal',
            fontFamily: 'monospace',
            textShadow: '0 2px 8px rgba(0,0,0,0.6)',
            letterSpacing: 2,
        }}>
            {fmtCountdown(remaining)}
        </span>
    );
};

// ── Pomodoro sub-component (self-cycling) ──────────────────────────────────
// Runs work → break → work… from mount, counting completed focus sessions.
// On an OBS browser source it begins when the scene/page loads.
const PomodoroElement = ({ element }) => {
    const work = Math.max(1, element.workMin ?? 25) * 60;
    const brk  = Math.max(1, element.breakMin ?? 5) * 60;
    const [phase, setPhase] = useState('work');
    const [remaining, setRemaining] = useState(work);
    const [count, setCount] = useState(0);
    // Authoritative tick state in a ref so the interval never reads stale values.
    const state = useRef({ phase: 'work', remaining: work, count: 0 });

    useEffect(() => {
        state.current = { phase: 'work', remaining: work, count: 0 };
        setPhase('work'); setRemaining(work); setCount(0);
        const id = setInterval(() => {
            const s = state.current;
            if (s.remaining > 1) {
                s.remaining -= 1;
            } else if (s.phase === 'work') {
                s.count += 1; s.phase = 'break'; s.remaining = brk;
            } else {
                s.phase = 'work'; s.remaining = work;
            }
            setPhase(s.phase); setRemaining(s.remaining); setCount(s.count);
        }, 1000);
        return () => clearInterval(id);
    }, [work, brk]);

    const isWork = phase === 'work';
    const m = Math.floor(remaining / 60);
    const sec = remaining % 60;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <span style={{
                fontSize: Math.max(9, (element.fontSize ?? 40) * 0.28),
                fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: 2, fontWeight: 'bold',
                color: isWork ? '#f87171' : '#34d399',
            }}>
                {isWork ? '● Focus' : '○ Break'}
            </span>
            <span style={{
                fontSize: element.fontSize,
                color: element.fontColor,
                fontWeight: element.bold ? 'bold' : 'normal',
                fontFamily: 'monospace', letterSpacing: 2,
                textShadow: '0 2px 8px rgba(0,0,0,0.6)', lineHeight: 1,
            }}>
                {`${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`}
            </span>
            <span style={{ fontSize: Math.max(9, (element.fontSize ?? 40) * 0.3), letterSpacing: 1 }}>
                {count > 0 ? '🍅'.repeat(Math.min(count, 8)) + (count > 8 ? ` ${count}` : '') : ''}
            </span>
        </div>
    );
};

// ── Scrolling ticker sub-component (self-animating) ────────────────────────
// A news-style marquee. Each line of `content` is one message; messages are
// joined with a dot separator, repeated enough times to cover the box, and the
// whole strip is duplicated so a -50% translate loops seamlessly (same trick
// as the liquid-goal waves). Duration derives from the measured unit width so
// the px/sec speed stays constant across box sizes and canvas widths (editor
// panel vs full-width OBS browser source).
const TICKER_SPEEDS = { slow: 45, medium: 90, fast: 160 };   // px per second

const TickerElement = ({ element, T }) => {
    const msgs = String(element.content || 'Your message here')
        .split('\n').map(s => s.trim()).filter(Boolean);
    const pxPerSec = TICKER_SPEEDS[element.speed] ?? TICKER_SPEEDS.medium;

    const wrapRef = useRef(null);
    const unitRef = useRef(null);
    const [repeat, setRepeat] = useState(1);
    const [duration, setDuration] = useState(0);

    useLayoutEffect(() => {
        const fit = () => {
            const wrap = wrapRef.current, unit = unitRef.current;
            if (!wrap || !unit) return;
            const unitW = unit.scrollWidth, boxW = wrap.clientWidth;
            if (unitW <= 0 || boxW <= 0) return;
            // Enough units to cover the box, plus one spare so the wrap point
            // is never on screen.
            const n = Math.ceil(boxW / unitW) + 1;
            setRepeat(n);
            setDuration((unitW * n) / pxPerSec);
        };
        fit();
        const ro = new ResizeObserver(fit);
        if (wrapRef.current) ro.observe(wrapRef.current);
        return () => ro.disconnect();
    }, [element.content, element.fontSize, element.bold, element.italic, element.letterSpacing, pxPerSec]);

    const unit = msgs.map((m, i) => (
        <span key={i}>
            {m}
            <span style={{ margin: '0 0.9em', opacity: 0.45 }}>•</span>
        </span>
    ));

    const copyStyle = {
        display: 'inline-flex', alignItems: 'center', flexShrink: 0,
        whiteSpace: 'pre',
        fontSize: element.fontSize,
        color: element.fontColor,
        fontWeight: element.bold ? 'bold' : 'normal',
        fontStyle: element.italic ? 'italic' : 'normal',
        letterSpacing: element.letterSpacing || 0,
        fontFamily: T.fontFamily,
        textShadow: (element.bgOpacity ?? 0) > 0 ? 'none' : '0 2px 8px rgba(0,0,0,0.6)',
    };

    return (
        <div ref={wrapRef} style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
            <div style={{ display: 'flex', flexShrink: 0, animation: duration > 0 ? `tickerScroll ${duration}s linear infinite` : 'none', willChange: 'transform' }}>
                {[0, 1].map(copy => (
                    <span key={copy} style={copyStyle}>
                        {Array.from({ length: repeat }, (_, i) => (
                            <span key={i} ref={copy === 0 && i === 0 ? unitRef : undefined} style={{ display: 'inline-flex', alignItems: 'center' }}>
                                {unit}
                            </span>
                        ))}
                    </span>
                ))}
            </div>
        </div>
    );
};

// ── Decision Wheel sub-component (spin-to-pick) ────────────────────────────
// A segmented wheel the streamer spins to randomly pick an option — great for
// "chat decides" moments. Click the centre hub to spin; or enable auto-spin to
// fire every N seconds (handy on an OBS browser source with no clicks). The
// winning slice stays lit and its label shows in the hub when the wheel stops.
const WHEEL_COLORS = ['#ef4444', '#f59e0b', '#22c55e', '#0ea5e9', '#8b5cf6', '#ec4899', '#14b8a6', '#eab308'];

// Point on a circle of radius `r` centred at (50,50), angle measured clockwise
// from 12 o'clock (so 0° is straight up, under the pointer).
const wheelXY = (r, angleDeg) => {
    const a = (angleDeg - 90) * Math.PI / 180;
    return [50 + r * Math.cos(a), 50 + r * Math.sin(a)];
};
const wheelSlice = (r, startA, endA) => {
    const [x1, y1] = wheelXY(r, startA);
    const [x2, y2] = wheelXY(r, endA);
    const large = endA - startA > 180 ? 1 : 0;
    return `M50,50 L${x1.toFixed(2)},${y1.toFixed(2)} A${r},${r} 0 ${large} 1 ${x2.toFixed(2)},${y2.toFixed(2)} Z`;
};
const clip = (s, n) => (String(s).length > n ? String(s).slice(0, n - 1) + '…' : String(s));

const WheelElement = ({ element, T, onUpdate }) => {
    const opts = (Array.isArray(element.options) && element.options.length >= 2) ? element.options : ['Yes', 'No'];
    const n = opts.length;
    const seg = 360 / n;
    const r = 46;
    const fs = Math.max(3.2, Math.min(6.5, 26 / n));
    const fontColor = element.fontColor || '#ffffff';
    const spinSec = element.spinSec ?? 4;

    const [rotation, setRotation] = useState(0);
    const [spinning, setSpinning] = useState(false);
    const [winnerIdx, setWinnerIdx] = useState(null);
    // Animation duration of the spin in flight — shorter than spinSec when this
    // instance picked the spin up late (e.g. the OBS source polled mid-spin).
    const [animSec, setAnimSec] = useState(spinSec);
    const timer = useRef(null);
    const lastSpinAt = useRef(0);

    // Animate slice `idx` under the pointer over `durSec` seconds. A stale event
    // (page just loaded, or the poll arrived after the spin already finished)
    // skips the animation and just shows the result.
    const runSpin = useCallback((idx, durSec) => {
        setWinnerIdx(null);
        clearTimeout(timer.current);
        const center = idx * seg + seg / 2;               // angle of the winning slice's middle
        // offset that brings the winning slice under the pointer
        const align = (prev) => (((360 - center - (prev % 360)) % 360) + 360) % 360;
        if (durSec < 0.25) {
            setSpinning(false);
            setRotation(prev => prev + align(prev));
            setWinnerIdx(idx);
            return;
        }
        setSpinning(true);
        setAnimSec(durSec);
        setRotation(prev => prev + align(prev) + 360 * 5); // extra turns + alignment
        timer.current = setTimeout(() => { setSpinning(false); setWinnerIdx(idx); }, durSec * 1000);
    }, [seg]);

    // The editor window and the OBS browser source are separate app instances
    // that only share state through the hosted layout store. So a spin is not
    // run directly: the click publishes { idx, at } onto the element, and every
    // instance (this one immediately, viewers via their poll) animates it from
    // this effect. Late joiners animate the remaining time, or snap to the
    // result if the spin already ended.
    const spinEvt = element.spin;
    useEffect(() => {
        if (!spinEvt || typeof spinEvt.at !== 'number') return;
        if (spinEvt.at <= lastSpinAt.current) return;     // already played
        lastSpinAt.current = spinEvt.at;
        const idx = Math.min(n - 1, Math.max(0, spinEvt.idx | 0));
        runSpin(idx, spinSec - (Date.now() - spinEvt.at) / 1000);
    }, [spinEvt, n, spinSec, runSpin]);

    const spin = () => {
        if (spinning) return;                             // ignore clicks mid-spin
        const idx = Math.floor(Math.random() * n);
        if (onUpdate) onUpdate({ spin: { idx, at: Date.now() } });
        else runSpin(idx, spinSec);                       // no write path (e.g. a preview) — spin locally
    };

    // Optional hands-free auto-spin. Fires at wall-clock slot boundaries with a
    // winner derived from the slot number, so every instance (editor, OBS)
    // spins at the same moment to the same result without any store writes.
    useEffect(() => {
        if (!element.auto) return;
        const everyMs = Math.max(5, element.cycleSec ?? 30) * 1000;
        let t;
        const arm = () => {
            const now = Date.now();
            const slot = Math.floor(now / everyMs) + 1;
            t = setTimeout(() => {
                runSpin((Math.imul(slot, 2654435761) >>> 13) % n, spinSec);
                arm();
            }, slot * everyMs - now);
        };
        arm();
        return () => clearTimeout(t);
    }, [element.auto, element.cycleSec, n, spinSec, runSpin]);

    useEffect(() => () => clearTimeout(timer.current), []);

    const winner = winnerIdx != null ? opts[winnerIdx] : null;

    return (
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: element.opacity ?? 1 }}>
            <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', overflow: 'visible', filter: 'drop-shadow(0 4px 14px rgba(0,0,0,0.5))' }}>
                {/* Spinning body */}
                <g style={{
                    transform: `rotate(${rotation}deg)`, transformBox: 'fill-box', transformOrigin: 'center',
                    transition: spinning ? `transform ${animSec}s cubic-bezier(0.16,0.84,0.20,1)` : 'none',
                }}>
                    {opts.map((label, i) => {
                        const startA = i * seg, mid = startA + seg / 2;
                        const [lx, ly] = wheelXY(r * 0.62, mid);
                        const textRot = (mid > 90 && mid < 270) ? mid + 180 : mid;   // keep labels upright-ish
                        return (
                            <g key={i}>
                                <path d={wheelSlice(r, startA, startA + seg)}
                                    fill={WHEEL_COLORS[i % WHEEL_COLORS.length]}
                                    stroke="rgba(0,0,0,0.25)" strokeWidth="0.5"
                                    opacity={winnerIdx == null || winnerIdx === i ? 1 : 0.4} />
                                <text x={lx.toFixed(2)} y={ly.toFixed(2)} fill={fontColor}
                                    fontSize={fs} fontWeight="700" textAnchor="middle" dominantBaseline="middle"
                                    transform={`rotate(${textRot.toFixed(1)} ${lx.toFixed(2)} ${ly.toFixed(2)})`}
                                    style={{ fontFamily: T.fontFamily, pointerEvents: 'none', userSelect: 'none' }}>
                                    {clip(label, 12)}
                                </text>
                            </g>
                        );
                    })}
                    <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
                </g>

                {/* Fixed pointer at the top, dipping into the rim */}
                <polygon points="50,12 44.5,1 55.5,1" fill={fontColor} stroke="rgba(0,0,0,0.35)" strokeWidth="0.5" />

                {/* Centre hub — click to spin; shows the winner when it stops */}
                <g onClick={(e) => { e.stopPropagation(); spin(); }} onMouseDown={(e) => e.stopPropagation()} style={{ cursor: 'pointer' }}>
                    <circle cx="50" cy="50" r="13" fill="rgba(10,10,22,0.92)"
                        stroke={winner ? '#fff' : 'rgba(255,255,255,0.5)'} strokeWidth="1.5"
                        style={winner ? { filter: 'drop-shadow(0 0 5px rgba(255,255,255,0.85))' } : undefined} />
                    <text x="50" y="50" fill={fontColor} fontWeight="800" textAnchor="middle" dominantBaseline="middle"
                        fontSize={winner ? Math.max(3, Math.min(5, 20 / String(winner).length)) : 5}
                        style={{ fontFamily: T.fontFamily, pointerEvents: 'none', userSelect: 'none', letterSpacing: winner ? 0 : 1 }}>
                        {winner ? clip(winner, 10) : (spinning ? '•••' : 'SPIN')}
                    </text>
                </g>
            </svg>
        </div>
    );
};

// ── Main renderer ──────────────────────────────────────────────────────────
const ElementRenderer = ({ element, onUploadLogo, onElementUpdate, editMode, theme = DEFAULT_THEME, mood = 'chill' }) => {
    const T = theme ?? DEFAULT_THEME;
    // Resolve any theme tokens (@accent, @text, @radius…) to concrete values.
    const resolved = resolveElement(element, T);
    const {
        type, opacity = 1, borderRadius = 0,
        bgColor, bgOpacity = 0,
        content, subContent,
        fontSize, subFontSize,
        fontColor, subFontColor,
        bold, italic, align, letterSpacing = 0,
        src, objectFit = 'contain', imgPadding = 0,
        fillColor,
    } = resolved;

    const bg = bgOpacity > 0 ? hexToRgba(bgColor, bgOpacity) : 'transparent';

    const outerStyle = {
        width: '100%', height: '100%',
        background: bg,
        borderRadius,
        overflow: 'hidden',
        opacity,
        boxSizing: 'border-box',
    };

    const textStyle = {
        fontSize,
        color: fontColor,
        fontWeight: bold ? 'bold' : 'normal',
        fontStyle: italic ? 'italic' : 'normal',
        textAlign: align,
        letterSpacing,
        lineHeight: 1.2,
        textShadow: bgOpacity > 0 ? 'none' : '0 2px 10px rgba(0,0,0,0.7)',
        fontFamily: T.fontFamily,
        wordBreak: 'break-word',
    };

    // ── Text ──
    if (type === 'text') {
        return (
            <div style={{ ...outerStyle, display: 'flex', alignItems: 'center', justifyContent: align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center', padding: '4px 12px' }}>
                <span style={{ ...textStyle, width: '100%' }}>{content || 'Title Text'}</span>
            </div>
        );
    }

    // ── Lower Third ──
    if (type === 'lowerthird') {
        return (
            <div style={{ ...outerStyle, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '6px 14px', gap: 2 }}>
                <div style={{ ...textStyle, marginBottom: 0 }}>{content || 'Your Name'}</div>
                <div style={{ fontSize: subFontSize, color: subFontColor, fontFamily: T.fontFamily, lineHeight: 1.2, letterSpacing: 0.5 }}>
                    {subContent || 'Role / Subtitle'}
                </div>
            </div>
        );
    }

    // ── Shape ──
    if (type === 'shape') {
        return <div style={outerStyle} />;
    }

    // ── Circle / Ellipse ──
    if (type === 'circle') {
        return <div style={{ ...outerStyle, borderRadius: '50%' }} />;
    }

    // ── Clip-path shapes (triangle / diamond / hexagon / star) ──
    if (CLIP_PATHS[type]) {
        const fill = bgOpacity > 0 ? hexToRgba(bgColor, bgOpacity) : bgColor;
        return <div style={{ width: '100%', height: '100%', background: fill, clipPath: CLIP_PATHS[type], opacity }} />;
    }

    // ── Cam frame ── decorative border over a cam box; transparent centre.
    if (type === 'frame') {
        const fs = element.frameStyle ?? T.frameStyle ?? 'solid';
        if (fs === 'none') return null;
        const color = bgColor;           // resolved frame colour (defaults to @accent)
        const w = element.borderWidth ?? 4;
        if (fs === 'gradient') {
            return (
                <div style={{ width: '100%', height: '100%', borderRadius, padding: w, opacity, boxSizing: 'border-box', background: `linear-gradient(135deg, ${color}, ${T.accent2})` }}>
                    <div style={{ width: '100%', height: '100%', borderRadius: Math.max(0, borderRadius - w), background: 'transparent' }} />
                </div>
            );
        }
        return (
            <div style={{
                width: '100%', height: '100%', borderRadius, boxSizing: 'border-box', opacity,
                background: 'transparent',
                border: `${w}px solid ${color}`,
                boxShadow: fs === 'glow' ? `0 0 ${w * 4}px ${color}, inset 0 0 ${w * 2}px ${color}55` : 'none',
            }} />
        );
    }

    // ── Divider ──
    if (type === 'divider') {
        return (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center' }}>
                <div style={{
                    width: '100%',
                    height: Math.max(1, fontSize ? fontSize / 16 : 2),
                    background: bgOpacity > 0 ? hexToRgba(bgColor, bgOpacity) : hexToRgba(fontColor || '#ffffff', opacity),
                    borderRadius: 99,
                    opacity,
                }} />
            </div>
        );
    }

    // ── Logo / Image ──
    if (type === 'logo') {
        if (!src) {
            return (
                <div
                    onClick={editMode ? onUploadLogo : undefined}
                    style={{
                        ...outerStyle,
                        display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center',
                        background: editMode ? 'rgba(255,255,255,0.04)' : 'transparent',
                        border: editMode ? '1px dashed rgba(255,255,255,0.15)' : 'none',
                        cursor: editMode ? 'pointer' : 'default',
                        gap: 4,
                    }}
                >
                    {editMode && <>
                        <span style={{ fontSize: 20, opacity: 0.3 }}>⌼</span>
                        <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: 1 }}>
                            Click to upload
                        </span>
                    </>}
                </div>
            );
        }
        return (
            <div style={{ ...outerStyle, padding: imgPadding }}>
                <img
                    src={src}
                    alt="logo"
                    style={{ width: '100%', height: '100%', objectFit, display: 'block', borderRadius }}
                />
            </div>
        );
    }

    // ── Clock ──
    if (type === 'clock') {
        return (
            <div style={{ ...outerStyle, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ClockElement element={resolved} />
            </div>
        );
    }

    // ── Countdown ──
    if (type === 'countdown') {
        return (
            <div style={{ ...outerStyle, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CountdownElement element={resolved} />
            </div>
        );
    }

    // ── Day counter ── "DAY 42" streak badge for challenge runs
    if (type === 'daycounter') {
        const day = Math.max(0, Math.floor(element.day ?? 1));
        const prefix = element.prefix ?? 'DAY';
        const shadow = bgOpacity > 0 ? 'none' : '0 2px 10px rgba(0,0,0,0.7)';
        return (
            <div style={{ ...outerStyle, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 4 }}>
                {prefix && (
                    <span style={{ fontSize: Math.max(8, fontSize * 0.26), color: fontColor, opacity: 0.75, fontFamily: T.fontFamily, textTransform: 'uppercase', letterSpacing: 3, textShadow: shadow, lineHeight: 1.2 }}>
                        {prefix}
                    </span>
                )}
                <span style={{ fontSize, color: fontColor, fontWeight: bold ? 'bold' : 'normal', fontStyle: italic ? 'italic' : 'normal', fontFamily: T.fontFamily, fontVariantNumeric: 'tabular-nums', lineHeight: 1.05, textShadow: shadow }}>
                    {day}
                </span>
                {content && (
                    <span style={{ fontSize: Math.max(8, fontSize * 0.22), color: fontColor, opacity: 0.7, fontFamily: T.fontFamily, letterSpacing: 0.5, textShadow: shadow, lineHeight: 1.2, textAlign: 'center' }}>
                        {content}
                    </span>
                )}
            </div>
        );
    }

    // ── Scrolling ticker ── looping marquee of messages
    if (type === 'ticker') {
        return (
            <div style={outerStyle}>
                <TickerElement element={resolved} T={T} />
            </div>
        );
    }

    // ── LIVE / REC badge ── pulsing dot + label
    if (type === 'live') {
        const dotColor = element.dotColor ?? '#ef4444';
        const pulse = element.pulse !== false;
        const dot = Math.max(6, fontSize * 0.5);
        return (
            <div style={{ ...outerStyle, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '0 14px' }}>
                <span style={{
                    width: dot, height: dot, borderRadius: '50%', background: dotColor, flexShrink: 0,
                    boxShadow: `0 0 ${dot}px ${dotColor}`,
                    animation: pulse ? 'pulse 1.4s ease-in-out infinite' : 'none',
                }} />
                <span style={{ ...textStyle, width: 'auto', letterSpacing: Math.max(letterSpacing, 1.5) }}>
                    {content || 'LIVE'}
                </span>
            </div>
        );
    }

    // ── Social handle chip ── platform icon + @handle
    if (type === 'social') {
        const Icon = SOCIAL_ICONS[element.platform] ?? AtSign;
        const tint = SOCIAL_COLORS[element.platform] ?? fontColor;
        const justify = align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'flex-start';
        return (
            <div style={{ ...outerStyle, display: 'flex', alignItems: 'center', justifyContent: justify, gap: 8, padding: '0 14px' }}>
                <Icon size={Math.round(fontSize * 1.15)} color={tint} style={{ flexShrink: 0 }} />
                <span style={{ ...textStyle, width: 'auto' }}>{content || '@handle'}</span>
            </div>
        );
    }

    // ── Goal / progress bar ── label + count over a filled track
    if (type === 'goal') {
        const current = Math.max(0, element.current ?? 0);
        const target = Math.max(1, element.target ?? 1);
        const pct = Math.min(100, (current / target) * 100);
        const fill = fillColor ?? T.accent;
        const track = bgOpacity > 0 ? hexToRgba(bgColor, bgOpacity) : 'rgba(255,255,255,0.12)';
        const barH = Math.max(6, fontSize * 0.55);
        const radius = borderRadius || 99;
        return (
            <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 5, opacity }}>
                <div style={{ ...textStyle, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', width: '100%' }}>
                    <span>{content || 'Goal'}</span>
                    <span style={{ fontVariantNumeric: 'tabular-nums', opacity: 0.85 }}>{current} / {target}</span>
                </div>
                <div style={{ width: '100%', height: barH, background: track, borderRadius: radius, overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: fill, borderRadius: radius, transition: 'width 0.4s ease' }} />
                </div>
            </div>
        );
    }

    // ── Liquid-fill goal ── a container that fills with sloshing liquid
    if (type === 'liquidgoal') {
        const current = Math.max(0, element.current ?? 0);
        const target = Math.max(1, element.target ?? 1);
        const pct = Math.min(100, (current / target) * 100);
        const fill = fillColor ?? T.accent;
        const container = bgOpacity > 0 ? hexToRgba(bgColor, bgOpacity) : 'rgba(255,255,255,0.08)';
        return (
            <div style={{
                position: 'relative', width: '100%', height: '100%', borderRadius,
                overflow: 'hidden', background: container, opacity,
                border: `1.5px solid ${hexToRgba(fill, 0.5)}`, boxSizing: 'border-box',
            }}>
                {/* Liquid body, rising to pct% of the height */}
                <div style={{
                    position: 'absolute', left: 0, right: 0, bottom: 0,
                    height: `${pct}%`, background: fill, transition: 'height 0.6s ease',
                }}>
                    {/* Surface waves: two smooth SVG waves riding the waterline, sliding
                        sideways at different speeds for a gentle slosh. Each is 200% wide
                        with a 2-period path, so a -50% shift loops seamlessly. */}
                    <div style={{ position: 'absolute', left: 0, right: 0, top: -7, height: 14, overflow: 'hidden', pointerEvents: 'none' }}>
                        <svg viewBox="0 0 240 24" preserveAspectRatio="none" style={{ position: 'absolute', left: 0, bottom: -1, width: '200%', height: '100%', animation: 'liquidWave 5s linear infinite' }}>
                            <path d="M0,9 Q30,1 60,9 T120,9 T180,9 T240,9 V24 H0 Z" fill={fill} />
                        </svg>
                        <svg viewBox="0 0 240 24" preserveAspectRatio="none" style={{ position: 'absolute', left: 0, bottom: -1, width: '200%', height: '100%', animation: 'liquidWave 8s linear infinite reverse' }}>
                            <path d="M0,11 Q30,4 60,11 T120,11 T180,11 T240,11 V24 H0 Z" fill={hexToRgba(fill, 0.55)} />
                        </svg>
                    </div>
                </div>
                {/* Label + count, centered over the liquid */}
                <div style={{
                    position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center', gap: 2,
                    color: fontColor, fontFamily: T.fontFamily, textAlign: 'center',
                    textShadow: '0 1px 6px rgba(0,0,0,0.7)', padding: 4,
                }}>
                    <span style={{ fontSize: Math.max(9, fontSize * 0.7), fontWeight: bold ? 'bold' : 'normal', opacity: 0.95 }}>{content || 'Goal'}</span>
                    <span style={{ fontSize: fontSize, fontWeight: 'bold', fontVariantNumeric: 'tabular-nums' }}>{current}/{target}</span>
                </div>
            </div>
        );
    }

    // ── Pomodoro focus timer ──
    if (type === 'pomodoro') {
        return (
            <div style={{ ...outerStyle, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <PomodoroElement element={resolved} />
            </div>
        );
    }

    // ── Sentiment mood-ring ── breathing aura in the live mood's colour
    if (type === 'moodring') {
        const md = getMood(mood);
        return (
            <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 7, opacity }}>
                <div style={{
                    width: '64%', aspectRatio: '1 / 1', borderRadius: '50%',
                    border: `3px solid ${md.color}`,
                    boxShadow: `0 0 26px ${hexToRgba(md.color, 0.85)}, inset 0 0 20px ${hexToRgba(md.color, 0.55)}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    animation: 'pulse 2.6s ease-in-out infinite',
                }}>
                    <span style={{ fontSize: 22, lineHeight: 1 }}>{md.emoji}</span>
                </div>
                <span style={{ fontSize: 11, fontFamily: T.fontFamily, color: md.color, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 2, textShadow: '0 1px 6px rgba(0,0,0,0.6)' }}>
                    {md.label}
                </span>
            </div>
        );
    }

    // ── Channel pet ── mascot mirroring the mood-ring; optionally roaming
    if (type === 'pet') {
        return resolved.walk
            ? <WalkingPet species={resolved.species} mood={getMood(mood)} opacity={opacity} speed={resolved.speed} />
            : <PetMascot species={resolved.species} mood={getMood(mood)} opacity={opacity} />;
    }

    // ── Decision wheel ── spin-to-pick from a list of options
    if (type === 'wheel') {
        return <WheelElement element={resolved} T={T} onUpdate={onElementUpdate} />;
    }

    // ── Sticky note ── a tilted scrap of paper for freeform jottings
    if (type === 'note') {
        const paper = resolved.paperColor || '#fde68a';
        const tilt = resolved.tilt ?? -3;
        return (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity, padding: '6%', boxSizing: 'border-box' }}>
                <div style={{
                    position: 'relative', width: '100%', height: '100%', boxSizing: 'border-box',
                    transform: `rotate(${tilt}deg)`,
                    background: `linear-gradient(155deg, ${paper}, ${hexToRgba('#000000', 0.05)})`,
                    backgroundColor: paper,
                    boxShadow: '0 8px 20px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.35)',
                    padding: '11% 12% 13%', overflow: 'hidden',
                    display: 'flex', flexDirection: 'column',
                }}>
                    {/* push-pin */}
                    <div style={{ position: 'absolute', top: 7, left: '50%', transform: 'translateX(-50%)', width: 10, height: 10, borderRadius: '50%', background: 'radial-gradient(circle at 35% 30%, #ff8a8a, #c81e1e)', boxShadow: '0 2px 3px rgba(0,0,0,0.4)' }} />
                    {/* text */}
                    <div style={{
                        flex: 1, color: fontColor, fontSize,
                        fontFamily: `'Segoe Print', 'Comic Sans MS', 'Bradley Hand', ${T.fontFamily}, cursive`,
                        fontWeight: bold ? 700 : 400, lineHeight: 1.35,
                        whiteSpace: 'pre-wrap', wordBreak: 'break-word', overflow: 'hidden',
                    }}>
                        {content || 'Notes…'}
                    </div>
                    {/* peeled corner */}
                    <div style={{ position: 'absolute', right: 0, bottom: 0, width: 0, height: 0, borderStyle: 'solid', borderWidth: '0 0 16px 16px', borderColor: `transparent transparent ${hexToRgba('#000000', 0.16)} transparent` }} />
                </div>
            </div>
        );
    }

    return null;
};

export default ElementRenderer;
