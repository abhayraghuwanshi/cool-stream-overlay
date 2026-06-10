import { useEffect, useId, useRef, useState } from 'react';

// ── Channel pets ───────────────────────────────────────────────────────────
// Cute side-view "loaf" critters (vscode-pets style): a rounded, soft-shaded
// body with a face turned toward the viewer (big glossy eyes, blush, little
// smile) and four chunky paws. They stand and breathe; set to Walk they roam a
// floor lane with a real leg walk cycle. All SVG + CSS keyframes (index.css:
// petStep / petTrot / petBreathe / petTailWag / petSlither / petBlink) — no image
// assets, so they stay crisp at any size and composite into an OBS browser source.
//
// Drawn facing RIGHT in a 120×100 viewBox; WalkingPet mirrors (scaleX) to face
// travel direction. Add a quadruped by appending to PETS with colors + ear/tail/
// snout render fns.

const rgba = (hex, a = 1) => {
    if (typeof hex !== 'string' || hex[0] !== '#') return hex;
    const h = hex.slice(1);
    const n = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
    const num = parseInt(n, 16);
    return `rgba(${(num >> 16) & 255},${(num >> 8) & 255},${num & 255},${a})`;
};

const INK = '#3a2e36';
const STEP = 0.46; // leg-cycle seconds (also the body-bob period)

// One chunky leg + paw, swinging about the hip (top). Idle → hangs straight.
const Leg = ({ x, color, delay, walking, w = 11 }) => (
    <g style={{
        transformBox: 'fill-box', transformOrigin: '50% 0%',
        animation: walking ? `petStep ${STEP}s ease-in-out ${delay}s infinite` : 'none',
    }}>
        <rect x={x - w / 2} y={78} width={w} height={15} rx={w / 2} fill={color} />
        <ellipse cx={x} cy={93} rx={w * 0.55} ry={w * 0.3} fill={color} />
    </g>
);

// Big glossy eyes + nose + mood-driven smile, blinking. Centered on x≈56.
const Face = ({ c, mood }) => {
    const open = mood.mouth === 'open';
    return (
        <>
            {/* blush cheeks — tinted by the active mood */}
            <ellipse cx="33" cy="63" rx="5.5" ry="3.6" fill={rgba(mood.color, 0.5)} />
            <ellipse cx="79" cy="63" rx="5.5" ry="3.6" fill={rgba(mood.color, 0.5)} />
            {/* eyes (blink together) */}
            <g style={{ transformBox: 'fill-box', transformOrigin: 'center', animation: 'petBlink 4.6s ease-in-out infinite' }}>
                <ellipse cx="44" cy="53" rx="6" ry="7.6" fill={INK} />
                <ellipse cx="68" cy="53" rx="6" ry="7.6" fill={INK} />
                <circle cx="46.2" cy="50" r="2.4" fill="#fff" />
                <circle cx="70.2" cy="50" r="2.4" fill="#fff" />
                <circle cx="42.4" cy="55.5" r="1.2" fill="rgba(255,255,255,0.7)" />
                <circle cx="66.4" cy="55.5" r="1.2" fill="rgba(255,255,255,0.7)" />
            </g>
            {/* nose */}
            <ellipse cx="56" cy="62" rx="2.6" ry="1.9" fill={c.nose} />
            {/* mouth — open ":o" when hyped, otherwise a soft ":3" smile */}
            {open ? (
                <ellipse cx="56" cy="68" rx="3.2" ry="3.6" fill="#7a3b46" />
            ) : (
                <path d="M56 64 Q52 68.5 48.5 65.5 M56 64 Q60 68.5 63.5 65.5" stroke={c.line ?? INK} strokeWidth="1.4" fill="none" strokeLinecap="round" />
            )}
        </>
    );
};

// Shared cute quadruped. Soft radial-gradient body, species ears/tail/snout.
const Quadruped = ({ s, mood, walking }) => {
    const c = s.c;
    const raw = useId();
    const gid = `pg${raw.replace(/[^a-zA-Z0-9]/g, '')}`;
    return (
        <svg viewBox="0 0 120 100" style={{ width: '100%', height: '100%', overflow: 'visible', filter: 'drop-shadow(0 5px 7px rgba(0,0,0,0.28))' }}>
            <defs>
                <radialGradient id={gid} cx="38%" cy="28%" r="78%">
                    <stop offset="0%" stopColor={c.light} />
                    <stop offset="100%" stopColor={c.body} />
                </radialGradient>
            </defs>
            <ellipse cx="58" cy="93" rx="40" ry="4.5" fill="rgba(0,0,0,0.2)" />
            <g style={{
                transformBox: 'fill-box', transformOrigin: '50% 92%',
                animation: walking ? `petTrot ${STEP}s ease-in-out infinite` : 'petBreathe 3.6s ease-in-out infinite',
            }}>
                {/* back legs (shaded) */}
                <Leg x={46} color={c.dark} delay={0} walking={walking} />
                <Leg x={78} color={c.dark} delay={-STEP / 2} walking={walking} />
                {/* tail */}
                <g style={{ transformBox: 'fill-box', transformOrigin: s.tailOrigin ?? '0% 100%', animation: `petTailWag ${walking ? 0.9 : 2.4}s ease-in-out infinite` }}>
                    {s.tail(c)}
                </g>
                {/* ears tucked behind the head */}
                {s.ears(c)}
                {/* body */}
                <ellipse cx="56" cy="57" rx="40" ry="33" fill={`url(#${gid})`} />
                {s.belly && <ellipse cx="56" cy="70" rx="23" ry="17" fill={c.belly} />}
                {s.snout && s.snout(c)}
                <Face c={c} mood={mood} />
                {/* front legs */}
                <Leg x={34} color={c.body} delay={-STEP / 2} walking={walking} />
                <Leg x={66} color={c.body} delay={0} walking={walking} />
            </g>
        </svg>
    );
};

// Cute slitherer — rounded segments on a travelling wave, big eyes, tongue flick.
const Snake = ({ mood, walking }) => {
    const segs = [
        { x: 22, r: 8 }, { x: 35, r: 9.5 }, { x: 49, r: 10.5 },
        { x: 63, r: 11 }, { x: 77, r: 12 },
    ];
    const period = walking ? 0.7 : 1.4;
    const raw = useId();
    const gid = `sg${raw.replace(/[^a-zA-Z0-9]/g, '')}`;
    return (
        <svg viewBox="0 0 120 100" style={{ width: '100%', height: '100%', overflow: 'visible', filter: 'drop-shadow(0 5px 7px rgba(0,0,0,0.28))' }}>
            <defs>
                <radialGradient id={gid} cx="40%" cy="28%" r="80%">
                    <stop offset="0%" stopColor="#7bd86a" />
                    <stop offset="100%" stopColor="#46b045" />
                </radialGradient>
            </defs>
            <ellipse cx="58" cy="93" rx="40" ry="4.5" fill="rgba(0,0,0,0.2)" />
            <g style={{ animation: 'petTongue 1.6s ease-in-out infinite' }}>
                <path d="M98 60 l12 0 m0 0 l4 -2.5 m-4 2.5 l4 2.5" stroke="#e0344e" strokeWidth="1.8" fill="none" strokeLinecap="round" />
            </g>
            {segs.map((p, i) => (
                <circle
                    key={i} cx={p.x} cy="58" r={p.r} fill={`url(#${gid})`}
                    style={{ transformBox: 'fill-box', transformOrigin: 'center', animation: `petSlither ${period}s ease-in-out ${(-i * period / 5).toFixed(3)}s infinite` }}
                />
            ))}
            {/* head segment (front) gets the face */}
            <g style={{ animation: `petSlither ${period}s ease-in-out ${(-4 * period / 5).toFixed(3)}s infinite`, transformBox: 'fill-box', transformOrigin: 'center' }}>
                <ellipse cx="74" cy="50" rx="4.4" ry="2.8" fill={rgba(mood.color, 0.5)} />
                <g style={{ transformBox: 'fill-box', transformOrigin: 'center', animation: 'petBlink 4.6s ease-in-out infinite' }}>
                    <circle cx="78" cy="54" r="2.6" fill={INK} /><circle cx="79" cy="53" r="0.9" fill="#fff" />
                    <circle cx="71" cy="55" r="2.4" fill={INK} /><circle cx="72" cy="54" r="0.8" fill="#fff" />
                </g>
            </g>
        </svg>
    );
};

// ── Species roster ─────────────────────────────────────────────────────────
export const PETS = [
    {
        id: 'cat', label: 'Cat', kind: 'quad',
        c: { body: '#b9bcc8', light: '#dadde6', dark: '#9a9dab', belly: '#e9ebf1', inner: '#f6a9c2', nose: '#e08aa2', line: '#7c7f8d' },
        ears: (c) => (
            <>
                <path d="M22 30 L29 6 L46 26 Z" fill={c.body} />
                <path d="M90 30 L83 6 L66 26 Z" fill={c.body} />
                <path d="M28 28 L31 14 L41 26 Z" fill={c.inner} />
                <path d="M84 28 L81 14 L71 26 Z" fill={c.inner} />
            </>
        ),
        snout: (c) => (
            <g stroke={c.line} strokeWidth="0.9" strokeLinecap="round" opacity="0.55">
                <line x1="30" y1="60" x2="13" y2="57" /><line x1="30" y1="63" x2="13" y2="64" />
                <line x1="82" y1="60" x2="99" y2="57" /><line x1="82" y1="63" x2="99" y2="64" />
            </g>
        ),
        tail: (c) => <path d="M92 66 Q116 62 110 40 Q108 30 99 33" stroke={c.body} strokeWidth="9" fill="none" strokeLinecap="round" />,
        tailOrigin: '0% 100%',
    },
    {
        id: 'shiba', label: 'Shiba', kind: 'quad', belly: true,
        c: { body: '#e6a24f', light: '#f3c47e', dark: '#c5852f', belly: '#fff3e2', inner: '#fff5e6', nose: '#3a2a1c', line: '#a06a26' },
        ears: (c) => (
            <>
                <path d="M26 30 L30 9 L46 27 Z" fill={c.body} />
                <path d="M86 30 L82 9 L66 27 Z" fill={c.body} />
                <path d="M31 28 L33 16 L42 27 Z" fill={c.inner} />
                <path d="M81 28 L79 16 L70 27 Z" fill={c.inner} />
            </>
        ),
        snout: (c) => <ellipse cx="56" cy="66" rx="15" ry="11" fill={c.belly} />,
        tail: (c) => <path d="M94 60 Q116 56 112 38 Q109 28 98 33 Q105 44 96 50" fill={c.body} />,
        tailOrigin: '0% 100%',
    },
    {
        id: 'fox', label: 'Fox', kind: 'quad',
        c: { body: '#ef8038', light: '#f7a865', dark: '#cf4a1c', belly: '#fde5d6', inner: '#fde9da', nose: '#2a1c18', line: '#c2461b' },
        ears: (c) => (
            <>
                <path d="M20 30 L27 4 L46 26 Z" fill={c.body} />
                <path d="M92 30 L85 4 L66 26 Z" fill={c.body} />
                <path d="M28 26 L31 12 L41 26 Z" fill={c.dark} />
                <path d="M84 26 L81 12 L71 26 Z" fill={c.dark} />
            </>
        ),
        snout: (c) => <path d="M56 50 Q70 56 56 78 Q42 56 56 50 Z" fill={c.belly} />,
        tail: (c) => (
            <>
                <path d="M92 64 Q120 70 114 44 Q111 32 96 42 Z" fill={c.body} />
                <ellipse cx="115" cy="46" rx="6.5" ry="6.5" fill={c.belly} />
            </>
        ),
        tailOrigin: '0% 50%',
    },
    {
        id: 'bunny', label: 'Bunny', kind: 'quad',
        c: { body: '#f1ebe7', light: '#ffffff', dark: '#dccfc8', belly: '#ffffff', inner: '#f6b9cd', nose: '#e88aa6', line: '#cbbdb6' },
        ears: (c) => (
            <>
                <ellipse cx="42" cy="18" rx="6" ry="18" fill={c.body} transform="rotate(-12 42 18)" />
                <ellipse cx="70" cy="18" rx="6" ry="18" fill={c.body} transform="rotate(12 70 18)" />
                <ellipse cx="42" cy="19" rx="2.6" ry="12" fill={c.inner} transform="rotate(-12 42 19)" />
                <ellipse cx="70" cy="19" rx="2.6" ry="12" fill={c.inner} transform="rotate(12 70 19)" />
            </>
        ),
        snout: null,
        tail: (c) => <circle cx="96" cy="64" r="8" fill={c.light} />,
        tailOrigin: '50% 50%',
    },
    { id: 'snake', label: 'Snake', kind: 'snake' },
];

export const DEFAULT_PET = PETS[0].id;
export const getPet = (id) => PETS.find(p => p.id === id) ?? PETS[0];

const renderCritter = (species, mood, walking) => {
    const pet = getPet(species);
    return pet.kind === 'snake'
        ? <Snake mood={mood} walking={walking} />
        : <Quadruped s={pet} mood={mood} walking={walking} />;
};

// Static mascot — stands, breathes, blinks. Used by the editor's species picker
// and by a pet element whose Movement is "Stay".
export const PetMascot = ({ species = DEFAULT_PET, mood, opacity = 1 }) => (
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', opacity }}>
        {renderCritter(species, mood, false)}
    </div>
);

// ── Walking pet ─────────────────────────────────────────────────────────────
// Roams a full-width floor lane: walks (legs cycling) back and forth, turns at
// the edges, and now and then pauses to idle. Position is driven imperatively by
// requestAnimationFrame (runs self-contained in an OBS browser source), so the
// animated `left` must NOT also be set by JSX or a React re-render would snap it
// back. Speed is a fraction of the lane width per second.
const WALK_SPEED = { slow: 0.04, medium: 0.08, fast: 0.16 };
const PET_ASPECT = 120 / 100; // critter footprint width = lane height × this

export const WalkingPet = ({ species = DEFAULT_PET, mood, opacity = 1, speed = 'medium' }) => {
    const trackRef = useRef(null);
    const petRef = useRef(null);
    const faceRef = useRef(null);
    const [walking, setWalking] = useState(true);

    useEffect(() => {
        const track = trackRef.current, pet = petRef.current, face = faceRef.current;
        if (!track || !pet) return;
        const spd = WALK_SPEED[speed] ?? WALK_SPEED.medium;

        let dir = Math.random() < 0.5 ? -1 : 1;
        let mode = 'walk';
        const range = () => Math.max(1, track.clientWidth - track.clientHeight * PET_ASPECT);
        let px = Math.random() * range();
        let raf, last = performance.now();
        let nextDecision = last + 2500 + Math.random() * 3500;

        const applyFace = () => { if (face) face.style.transform = `scaleX(${dir})`; };
        pet.style.left = `${px}px`;
        applyFace();

        const tick = (t) => {
            const dt = Math.min(0.05, (t - last) / 1000); last = t;
            const r = range();
            if (mode === 'walk') {
                px += dir * spd * track.clientWidth * dt;
                if (px <= 0) { px = 0; dir = 1; applyFace(); }
                else if (px >= r) { px = r; dir = -1; applyFace(); }
                pet.style.left = `${px}px`;
            }
            if (t >= nextDecision) {
                if (mode === 'walk' && Math.random() < 0.3) {
                    mode = 'idle'; setWalking(false);
                    nextDecision = t + 1000 + Math.random() * 1500;
                } else {
                    if (mode === 'idle') { mode = 'walk'; setWalking(true); }
                    if (Math.random() < 0.4) { dir *= -1; applyFace(); }
                    nextDecision = t + 3000 + Math.random() * 3500;
                }
            }
            raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [speed]);

    return (
        <div ref={trackRef} style={{ position: 'absolute', inset: 0, opacity, overflow: 'hidden' }}>
            {/* NOTE: no `left` here — it's animated imperatively (see above). */}
            <div ref={petRef} style={{ position: 'absolute', bottom: 0, height: '100%', aspectRatio: '120 / 100' }}>
                <div ref={faceRef} style={{ width: '100%', height: '100%' }}>
                    {renderCritter(species, mood, walking)}
                </div>
            </div>
        </div>
    );
};
