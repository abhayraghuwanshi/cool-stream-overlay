// Starter layouts — ready-made, themed "shows" that ship with the app so the
// Layouts gallery isn't empty. Each starter pairs a THEME with a set of polished
// scenes (Starting Soon / Live / BRB / Ending) built from the real element
// types. Adding one creates a REAL, editable layout (same shape
// OverlayLayout.createLayout produces) — rename it, edit scenes, delete it like
// any other layout.
//
// Distinct "looks" come the same way YouTube/Streamlabs template packs differ:
// a cohesive theme (colors / font / corner radius / cam-frame) plus a signature
// background and copy. Elements are authored with THEME TOKENS (@accent, @text,
// @panel, @radius) so each scene re-skins to its starter's theme automatically.

const BUILTIN_BOX_IDS = ['faceCam', 'aiCompanion', 'handCam', 'roomCam', 'currentTask'];

// All built-ins hidden; scenes flip on only what they use.
const hideAll = { faceCam: false, handCam: false, roomCam: false, aiCompanion: false, currentTask: false };

// ── Background helpers ──────────────────────────────────────────────────────
const grad = (from, to, dir = '135deg') => ({ type: 'gradient', from, to, dir });
const transparent = { type: 'transparent' };

// ── Element factories ── return partial elements; scene() stamps id/defaults ──
const text = (content, box, extra = {}) => ({
    type: 'text', content, box,
    fontSize: 48, fontColor: '@text', bold: true, italic: false, align: 'center', letterSpacing: 2,
    ...extra,
});
const sub = (content, box, extra = {}) =>
    text(content, box, { fontSize: 18, bold: false, fontColor: 'rgba(255,255,255,0.6)', letterSpacing: 1, ...extra });

const countdown = (box, durationSec = 300, extra = {}) => ({
    type: 'countdown', box, durationSec,
    fontSize: 66, fontColor: '@accent', bold: true, align: 'center', letterSpacing: 2,
    ...extra,
});
const clock = (box, extra = {}) => ({
    type: 'clock', box,
    fontSize: 24, fontColor: 'rgba(255,255,255,0.6)', bold: false, align: 'center',
    ...extra,
});
const live = (box, extra = {}) => ({
    type: 'live', content: 'LIVE', box,
    fontSize: 15, fontColor: '#ffffff', bold: true, align: 'center',
    bgColor: '#000000', bgOpacity: 0.5, borderRadius: 99, dotColor: '#ef4444', pulse: true,
    ...extra,
});
const social = (platform, handle, box, extra = {}) => ({
    type: 'social', platform, content: handle, box,
    fontSize: 15, fontColor: '#ffffff', bold: true, align: 'left',
    bgColor: '#000000', bgOpacity: 0.5, borderRadius: 99,
    ...extra,
});
const lowerthird = (name, role, box, extra = {}) => ({
    type: 'lowerthird', content: name, subContent: role, box,
    fontSize: 22, subFontSize: 13, fontColor: '@text', subFontColor: '@accent',
    bgColor: '@panel', bgOpacity: 0.78, borderRadius: '@radius', bold: true, align: 'left',
    ...extra,
});
const shape = (box, extra = {}) => ({
    type: 'shape', box, bgColor: '@accent', bgOpacity: 0.85, borderRadius: '@radius', ...extra,
});
const divider = (box, extra = {}) => ({
    type: 'divider', box, bgColor: '@accent', bgOpacity: 0.55, ...extra,
});
const frame = (box, extra = {}) => ({
    type: 'frame', box, bgColor: '@accent', bgOpacity: 0, borderRadius: '@radius',
    borderWidth: 4, frameStyle: 'glow', ...extra,
});
const goal = (label, current, target, box, extra = {}) => ({
    type: 'goal', content: label, current, target, box,
    fontSize: 13, fontColor: '#ffffff', bold: true, fillColor: '@accent',
    bgColor: '#ffffff', bgOpacity: 0.12, borderRadius: 99,
    ...extra,
});
const pomodoro = (box, extra = {}) => ({
    type: 'pomodoro', box, workMin: 25, breakMin: 5,
    fontSize: 38, fontColor: '@text', bold: true, align: 'center',
    bgColor: '#000000', bgOpacity: 0.45, borderRadius: '@radius',
    ...extra,
});
// Liquid-fill goal — a tall jar that fills with sloshing accent liquid.
const liquidgoal = (label, current, target, box, extra = {}) => ({
    type: 'liquidgoal', content: label, current, target, box,
    fontSize: 15, fontColor: '#ffffff', bold: true, fillColor: '@accent',
    bgColor: '#ffffff', bgOpacity: 0.08, borderRadius: 18,
    ...extra,
});
// Sentiment mood-ring — auto-cycles by default so it breathes on its own; it is
// also the single source of truth a channel-pet placed in the scene mirrors.
const moodring = (box, extra = {}) => ({
    type: 'moodring', box, mood: 'hype', auto: true, cycleSec: 18, ...extra,
});
// Channel pet — a little mascot that follows the live mood.
const pet = (box, extra = {}) => ({ type: 'pet', box, ...extra });
// Decision wheel — spin-to-pick; great for "chat decides" moments.
const wheel = (options, box, extra = {}) => ({
    type: 'wheel', box, options, spinSec: 4, auto: false, cycleSec: 30,
    fontColor: '#ffffff', ...extra,
});
// Sticky note — a tilted scrap of paper for a to-do / agenda jotting.
const note = (content, box, extra = {}) => ({
    type: 'note', content, box, paperColor: '#fde68a', fontColor: '#3a2f10',
    fontSize: 15, tilt: -3, ...extra,
});
// Clip-path primitives — decorative accents that re-skin to the theme accent.
const hexagon = (box, extra = {}) => ({ type: 'hexagon', box, bgColor: '@accent', bgOpacity: 0.85, ...extra });
const diamond = (box, extra = {}) => ({ type: 'diamond', box, bgColor: '@accent', bgOpacity: 0.85, ...extra });
const star    = (box, extra = {}) => ({ type: 'star', box, bgColor: '@accent', bgOpacity: 0.9, ...extra });
const ellipse = (box, extra = {}) => ({ type: 'circle', box, bgColor: '@accent', bgOpacity: 0.85, ...extra });

// ── Scene builder ── stamps stable per-scene ids + shared element defaults ───
const scene = (name, background, els = [], boxes = {}, vis = {}) => ({
    name,
    snapshot: {
        background,
        boxes,
        boxVisibility: { ...hideAll, ...vis },
        elements: els.map((e, i) => ({
            id: `e${i}`, hidden: false, opacity: 1, bgColor: '#000000', bgOpacity: 0, borderRadius: 0, ...e,
        })),
        zOrder: BUILTIN_BOX_IDS,
    },
});

// ── Reusable signature scenes ── parametric so each style stays cohesive but
// distinct via its theme + background + copy. ─────────────────────────────────
const startingScene = (bg, { title = 'STARTING SOON', tagline = 'Stream begins shortly — grab a seat', handle = '@yourhandle' } = {}) =>
    scene('Starting Soon', bg, [
        shape({ x: 0, y: 0, w: 100, h: 0.7 }, { borderRadius: 0, bgOpacity: 1 }),  // top broadcast strip
        clock({ x: 43, y: 8, w: 14, h: 6 }),
        text(title, { x: 12, y: 29, w: 76, h: 13 }, { fontSize: 52, letterSpacing: 4 }),
        countdown({ x: 37, y: 46, w: 26, h: 13 }, 300, { fontSize: 64 }),
        sub(tagline, { x: 22, y: 63, w: 56, h: 7 }),
        divider({ x: 40, y: 73, w: 20, h: 1 }),
        social('twitch', handle, { x: 39, y: 78, w: 22, h: 6 }, { align: 'center' }),
    ]);

const liveScene = (bg, { name = 'Your Name', role = 'Live now', goalLabel = 'Follower Goal' } = {}) =>
    scene('Live', bg, [
        live({ x: 2, y: 3, w: 11, h: 6 }),
        frame({ x: 77, y: 69, w: 21, h: 28 }),  // glow border over the cam
        lowerthird(name, role, { x: 2, y: 74, w: 34, h: 12 }),
        goal(goalLabel, 38, 50, { x: 2, y: 90, w: 30, h: 7 }),
    ], { faceCam: { x: 77, y: 69, w: 21, h: 28 } }, { faceCam: true });

const chatScene = (bg, { name = 'Your Name', role = 'Just chatting' } = {}) =>
    scene('Just Chatting', bg, [
        live({ x: 3, y: 5, w: 11, h: 6 }),
        lowerthird(name, role, { x: 51, y: 73, w: 44, h: 12 }, { fontSize: 24 }),
        social('twitch', '@yourhandle', { x: 3, y: 90, w: 22, h: 7 }),
        social('youtube', '@yourchannel', { x: 27, y: 90, w: 24, h: 7 }),
    ], { faceCam: { x: 50, y: 7, w: 46, h: 62 } }, { faceCam: true });

const gameplayScene = (bg, { goalLabel = 'Sub Goal' } = {}) =>
    scene('Gameplay', bg, [
        live({ x: 2, y: 3, w: 11, h: 6 }),
        frame({ x: 79, y: 72, w: 20, h: 26 }),  // glow border over the cam
        goal(goalLabel, 12, 25, { x: 2, y: 91, w: 28, h: 7 }),
    ], { faceCam: { x: 79, y: 72, w: 20, h: 26 } }, { faceCam: true });

const codingScene = (bg) =>
    scene('Coding', bg, [
        live({ x: 2, y: 3, w: 11, h: 6 }),
        pomodoro({ x: 2, y: 12, w: 18, h: 14 }),
        lowerthird('Your Name', 'Building something', { x: 2, y: 78, w: 34, h: 12 }),
    ], { faceCam: { x: 80, y: 73, w: 18, h: 24 } }, { faceCam: true });

// Interactive community scene — the engagement kit: mood-ring + matching pet,
// a spin-the-wheel for chat decisions, and a sticky agenda note. Big centred cam.
const communityScene = (bg, { name = 'Your Name', role = 'Community hangout' } = {}) =>
    scene('Community', bg, [
        live({ x: 2, y: 3, w: 11, h: 6 }),
        moodring({ x: 2, y: 14, w: 10, h: 18 }),
        pet({ x: 2, y: 74, w: 9, h: 18 }),
        wheel(['Yes', 'No', 'Maybe', 'Chat picks', 'Spin again', 'Dealer\'s choice'], { x: 73, y: 8, w: 17, h: 30 }),
        note('Today:\n• new emotes\n• Q&A @ 1h\n• giveaway!', { x: 73, y: 46, w: 23, h: 34 }),
        lowerthird(name, role, { x: 27, y: 76, w: 44, h: 11 }),
    ], { faceCam: { x: 27, y: 14, w: 44, h: 58 } }, { faceCam: true });

// Deep-work focus scene — pomodoro, a liquid "coffee" jar, a to-do sticky, and a
// pet keeping you company. Corner cam so the code/screen stays the star.
const focusScene = (bg, { name = 'Your Name', role = 'Deep work' } = {}) =>
    scene('Focus', bg, [
        live({ x: 2, y: 3, w: 11, h: 6 }),
        pomodoro({ x: 2, y: 12, w: 18, h: 16 }),
        liquidgoal('Coffee', 6, 10, { x: 2, y: 32, w: 9, h: 26 }),
        note('TODO\n• fix overlay bug\n• ship v2\n• reply DMs', { x: 2, y: 62, w: 21, h: 30 }),
        pet({ x: 86, y: 64, w: 11, h: 16 }),
        lowerthird(name, role, { x: 76, y: 83, w: 22, h: 11 }),
    ], { faceCam: { x: 78, y: 36, w: 20, h: 26 } }, { faceCam: true });

// Gaming HUD scene — a liquid sub-goal jar, a progress bar, a mood-ring, a glow
// cam frame and a hex accent. Transparent so the game sits underneath in OBS.
const hudScene = (bg, { goalLabel = 'Sub Goal' } = {}) =>
    scene('Gameplay HUD', bg, [
        live({ x: 2, y: 3, w: 11, h: 6 }),
        clock({ x: 85, y: 3, w: 13, h: 6 }),
        hexagon({ x: 3, y: 37, w: 5, h: 8 }, { bgOpacity: 0.9 }),
        liquidgoal(goalLabel, 14, 25, { x: 2, y: 46, w: 9, h: 32 }),
        goal('Follower Goal', 120, 200, { x: 2, y: 84, w: 30, h: 7 }),
        moodring({ x: 88, y: 52, w: 9, h: 16 }),
        frame({ x: 79, y: 72, w: 20, h: 26 }),
    ], { faceCam: { x: 79, y: 72, w: 20, h: 26 } }, { faceCam: true });

const brbScene = (bg, { title = 'BE RIGHT BACK', tagline = "Don't go anywhere" } = {}) =>
    scene('Be Right Back', bg, [
        text(title, { x: 14, y: 40, w: 72, h: 14 }, { fontSize: 50 }),
        sub(tagline, { x: 25, y: 56, w: 50, h: 7 }),
    ]);

const endingScene = (bg, { title = 'THANKS FOR WATCHING', twitch = '@yourhandle', youtube = '@yourchannel' } = {}) =>
    scene('Ending', bg, [
        text(title, { x: 10, y: 32, w: 80, h: 14 }, { fontSize: 44 }),
        social('twitch', twitch, { x: 30, y: 54, w: 40, h: 7 }, { align: 'center' }),
        social('youtube', youtube, { x: 30, y: 64, w: 40, h: 7 }, { align: 'center' }),
    ]);

// ── The catalog ── 10 distinct themed styles ────────────────────────────────
export const STARTER_LAYOUTS = [
    {
        id: 'aurora-glow', name: 'Aurora Glow', themeId: 'aurora',
        tagline: 'Teal → indigo, soft glow',
        scenes: [
            startingScene(grad('#042f2e', '#0a0a1f', '160deg'), { title: 'STARTING SOON', handle: '@aurora' }),
            liveScene(grad('#04201d', '#0a0a1f', '160deg'), { role: 'Live now' }),
            brbScene(grad('#042f2e', '#0a0a1f', '160deg')),
        ],
    },
    {
        id: 'neon-arcade', name: 'Neon Arcade', themeId: 'neon',
        tagline: 'Cyber mono, high contrast',
        scenes: [
            startingScene(grad('#05070d', '#0a1230', '160deg'), { title: 'BOOTING UP…', tagline: 'Loading the stream' }),
            gameplayScene(transparent, { goalLabel: 'Sub Goal' }),
            endingScene(grad('#05070d', '#140028', '135deg'), { title: 'GG · THANKS FOR WATCHING' }),
        ],
    },
    {
        id: 'midnight-pro', name: 'Midnight Pro', themeId: 'midnight',
        tagline: 'Clean indigo, full kit',
        scenes: [
            startingScene(grad('#1e1b4b', '#0a0a0f', '135deg')),
            chatScene(grad('#12122a', '#0a0a0f', '160deg')),
            brbScene(grad('#1e1b4b', '#0a0a0f', '135deg')),
            endingScene(grad('#1e1b4b', '#0a0a0f', '135deg')),
        ],
    },
    {
        id: 'sunset-irl', name: 'Sunset IRL', themeId: 'sunset',
        tagline: 'Rose & amber, soft corners',
        scenes: [
            startingScene(grad('#2a0a18', '#0a0a0f', '135deg'), { title: 'STARTING SOON', tagline: 'Golden hour is coming' }),
            liveScene(transparent, { role: 'IRL stream' }),
            brbScene(grad('#2a0a18', '#0a0a0f', '135deg'), { title: 'BE RIGHT BACK', tagline: 'Stretch break — back soon' }),
        ],
    },
    {
        id: 'mono-podcast', name: 'Mono Podcast', themeId: 'minimal',
        tagline: 'Monochrome, talk-show clean',
        scenes: [
            startingScene(grad('#101013', '#000000', '135deg'), { title: 'THE SHOW', tagline: 'We go live in a moment' }),
            chatScene(grad('#0e0e10', '#000000', '160deg'), { role: 'Episode 01' }),
            endingScene(grad('#101013', '#000000', '135deg'), { title: 'THANKS FOR LISTENING' }),
        ],
    },
    {
        id: 'vaporwave', name: 'Vaporwave', themeId: 'vapor',
        tagline: 'Pink × cyan, retro mono',
        scenes: [
            startingScene(grad('#2a0a3a', '#06121f', '160deg'), { title: 'ＳＴＡＲＴＩＮＧ', tagline: 'aesthetic incoming' }),
            liveScene(transparent, { role: 'now playing' }),
            brbScene(grad('#2a0a3a', '#06121f', '160deg'), { title: 'ＢＲＢ' }),
        ],
    },
    {
        id: 'crimson-esports', name: 'Crimson Esports', themeId: 'crimson',
        tagline: 'Red-on-black, competitive',
        scenes: [
            startingScene(grad('#1a0606', '#0a0a0f', '135deg'), { title: 'WARMING UP', tagline: 'Match starting soon' }),
            gameplayScene(transparent, { goalLabel: 'Win Streak' }),
            endingScene(grad('#1a0606', '#0a0a0f', '135deg'), { title: 'GGWP' }),
        ],
    },
    {
        id: 'ocean-chill', name: 'Ocean Chill', themeId: 'ocean',
        tagline: 'Calm blues, just chatting',
        scenes: [
            startingScene(grad('#04101c', '#0a0a1a', '160deg'), { tagline: 'Easing in — grab a drink' }),
            chatScene(grad('#04141f', '#0a0a1a', '160deg'), { role: 'Chill stream' }),
            brbScene(grad('#04101c', '#0a0a1a', '160deg')),
        ],
    },
    {
        id: 'golden-hour', name: 'Golden Hour', themeId: 'gold',
        tagline: 'Black & gold, premium serif',
        scenes: [
            startingScene(grad('#0c0a05', '#000000', '135deg'), { title: 'STARTING SOON', tagline: 'A premium stream experience' }),
            liveScene(transparent, { role: 'Live' }),
            endingScene(grad('#0c0a05', '#000000', '135deg'), { title: 'THANK YOU' }),
        ],
    },
    {
        id: 'warm-studio', name: 'Warm Studio', themeId: 'warm',
        tagline: 'Amber coding & focus',
        scenes: [
            startingScene(grad('#1a1005', '#0a0a0f', '135deg'), { title: 'STARTING SOON', tagline: 'Setting up the workspace' }),
            codingScene(transparent),
            brbScene(grad('#1a1005', '#0a0a0f', '135deg'), { title: 'SHORT BREAK', tagline: 'Coffee refill — back soon' }),
        ],
    },
    {
        id: 'emerald-grove', name: 'Emerald Grove', themeId: 'emerald',
        tagline: 'Cozy green, just chatting',
        scenes: [
            startingScene(grad('#04140d', '#0a0a0f', '160deg'), { title: 'STARTING SOON', tagline: 'Settling in — grab a cuppa', handle: '@emerald' }),
            chatScene(grad('#05180f', '#0a0a0f', '160deg'), { role: 'Cozy stream' }),
            brbScene(grad('#04140d', '#0a0a0f', '160deg'), { title: 'BE RIGHT BACK', tagline: 'Watering the plants 🌱' }),
        ],
    },
    {
        id: 'royal-velvet', name: 'Royal Velvet', themeId: 'royale',
        tagline: 'Purple & gold, premium serif',
        scenes: [
            startingScene(grad('#100726', '#000000', '135deg'), { title: 'STARTING SOON', tagline: 'A royal broadcast begins' }),
            liveScene(transparent, { role: 'Live · Premiere' }),
            endingScene(grad('#100726', '#000000', '135deg'), { title: 'UNTIL NEXT TIME' }),
        ],
    },
    {
        id: 'frostbite', name: 'Frostbite', themeId: 'frost',
        tagline: 'Icy blue, soft & competitive',
        scenes: [
            startingScene(grad('#0a1420', '#0a0a1a', '160deg'), { title: 'COOLING DOWN…', tagline: 'Stream warming up' }),
            gameplayScene(transparent, { goalLabel: 'Win Goal' }),
            brbScene(grad('#0a1420', '#0a0a1a', '160deg'), { title: 'BE RIGHT BACK', tagline: 'Chilling for a sec ❄️' }),
        ],
    },
    {
        id: 'the-matrix', name: 'The Matrix', themeId: 'matrix',
        tagline: 'Terminal green, hacker coding',
        scenes: [
            startingScene(grad('#020a04', '#000000', '160deg'), { title: 'INITIALIZING…', tagline: 'Compiling the stream', handle: '@neo' }),
            codingScene(transparent),
            brbScene(grad('#020a04', '#000000', '160deg'), { title: 'AFK://BREAK', tagline: 'Process suspended — back soon' }),
        ],
    },
    {
        id: 'bubblegum-pop', name: 'Bubblegum Pop', themeId: 'bubblegum',
        tagline: 'Pink × purple, playful & soft',
        scenes: [
            startingScene(grad('#1a0a16', '#0a0a0f', '160deg'), { title: 'STARTING SOON', tagline: 'Sweet things incoming ✨' }),
            chatScene(transparent, { role: 'Just vibing' }),
            endingScene(grad('#1a0a16', '#0a0a0f', '160deg'), { title: 'THANKS FOR HANGING OUT' }),
        ],
    },
    {
        id: 'inferno-arena', name: 'Inferno Arena', themeId: 'inferno',
        tagline: 'Fiery orange-red, esports heat',
        scenes: [
            startingScene(grad('#1a0805', '#0a0a0f', '135deg'), { title: 'HEATING UP', tagline: 'Match igniting soon 🔥' }),
            gameplayScene(transparent, { goalLabel: 'Kill Streak' }),
            endingScene(grad('#1a0805', '#0a0a0f', '135deg'), { title: 'GG · STAY FIRED UP' }),
        ],
    },
    {
        id: 'cosmic-drift', name: 'Cosmic Drift', themeId: 'cosmic',
        tagline: 'Galaxy indigo & magenta, chill',
        scenes: [
            startingScene(grad('#0a0820', '#000000', '160deg'), { title: 'STARTING SOON', tagline: 'Drifting into orbit 🚀' }),
            liveScene(transparent, { role: 'Live from space' }),
            brbScene(grad('#0a0820', '#000000', '160deg'), { title: 'BE RIGHT BACK', tagline: 'Refueling — back shortly' }),
        ],
    },
    // ── Component-rich showcases ── these lean on the playful elements (mood
    // ring, pet, decision wheel, sticky note, liquid goal, HUD shapes) so the
    // gallery shows off the full kit, each with a clear streaming purpose.
    {
        id: 'community-hub', name: 'Community Hub', themeId: 'bubblegum',
        tagline: 'Wheel · pet · notes — interactive chat',
        scenes: [
            startingScene(grad('#1a0a16', '#0a0a0f', '160deg'), { title: 'STARTING SOON', tagline: 'Warming up the community ✨' }),
            communityScene(transparent, { role: 'Community hangout' }),
            endingScene(grad('#1a0a16', '#0a0a0f', '160deg'), { title: 'THANKS FOR HANGING OUT' }),
        ],
    },
    {
        id: 'focus-flow', name: 'Focus Flow', themeId: 'emerald',
        tagline: 'Pomodoro · coffee jar · to-dos — deep work',
        scenes: [
            startingScene(grad('#04140d', '#0a0a0f', '160deg'), { title: 'STARTING SOON', tagline: 'Booting the workspace' }),
            focusScene(transparent, { role: 'Deep work' }),
            brbScene(grad('#04140d', '#0a0a0f', '160deg'), { title: 'SHORT BREAK', tagline: 'Refilling the coffee ☕' }),
        ],
    },
    {
        id: 'battle-station', name: 'Battle Station', themeId: 'inferno',
        tagline: 'Liquid goals · HUD · mood — full gaming kit',
        scenes: [
            startingScene(grad('#1a0805', '#0a0a0f', '135deg'), { title: 'WARMING UP', tagline: 'Match starting soon 🔥' }),
            hudScene(transparent, { goalLabel: 'Sub Goal' }),
            endingScene(grad('#1a0805', '#0a0a0f', '135deg'), { title: 'GG · WELL PLAYED' }),
        ],
    },
];

// Snapshot used to draw a starter's gallery thumbnail (its first scene).
export const starterPreview = (starter) => starter.scenes[0]?.snapshot ?? {};

// Build a real layout container from a starter. Ids are stamped per-call so
// adding the same starter twice never collides with an existing layout/scene.
export const buildStarterLayout = (starter) => {
    const base = Date.now();
    const scenes = starter.scenes.map((sc, i) => ({
        id: `scene_${base}_${i}`,
        name: sc.name,
        createdAt: base + i,
        // Bake the theme into every scene so the whole show installs cohesively.
        snapshot: starter.themeId ? { ...sc.snapshot, theme: starter.themeId } : { ...sc.snapshot },
    }));
    return {
        id: `layout_${base}`,
        name: starter.name,
        createdAt: base,
        scenes,
        activeSceneId: scenes[0]?.id ?? null,
    };
};
