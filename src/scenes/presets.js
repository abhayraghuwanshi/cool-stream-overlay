// Built-in scene presets.
//
// A "scene" is a snapshot of the visual layout state that OverlayLayout owns:
//   { boxes, boxVisibility, elements, background, zOrder }
// Applying a preset replaces the current layout with the snapshot. Camera
// device streams are NOT part of a scene — a scene only positions / shows /
// hides the camera boxes; whatever device is live keeps streaming.

const BUILTIN_BOX_IDS = ['faceCam', 'socialFeed', 'aiCompanion', 'handCam', 'roomCam', 'currentTask'];

// Visibility helper — start from "all hidden" then turn on what a scene needs.
const hideAll = {
    faceCam: false, handCam: false, roomCam: false,
    socialFeed: false, aiCompanion: false, currentTask: false,
};

// Text element factory with a stable per-preset id (presets replace elements
// wholesale on apply, so fixed ids never collide).
const text = (id, content, box, extra = {}) => ({
    id: `preset_${id}`,
    type: 'text',
    hidden: false,
    box,
    opacity: 1,
    borderRadius: 0,
    bgColor: '#000000',
    bgOpacity: 0,
    content,
    fontSize: 64,
    fontColor: '@text',   // theme token — re-skins when the theme changes
    bold: true,
    italic: false,
    align: 'center',
    letterSpacing: 2,
    ...extra,
});

const clock = (id, box) => ({
    id: `preset_${id}`,
    type: 'clock',
    hidden: false,
    box,
    opacity: 1,
    fontSize: 28,
    fontColor: 'rgba(255,255,255,0.7)',
    bold: false,
    align: 'center',
});

const countdown = (id, box, durationSec = 300, extra = {}) => ({
    id: `preset_${id}`,
    type: 'countdown',
    hidden: false,
    box,
    opacity: 1,
    durationSec,
    fontSize: 64,
    fontColor: '@accent',   // countdown pops in the theme accent
    bold: true,
    align: 'center',
    letterSpacing: 2,
    ...extra,
});

export const SCENE_PRESETS = [
    {
        id: 'starting-soon',
        name: 'Starting Soon',
        accent: '#8b5cf6',
        snapshot: {
            background: { type: 'gradient', from: '#1e1b4b', to: '#0a0a0f', dir: '135' },
            boxVisibility: { ...hideAll },
            elements: [
                text('ss-title', 'STARTING SOON', { x: 20, y: 28, w: 60, h: 12 }, { fontSize: 48 }),
                countdown('ss-timer', { x: 35, y: 44, w: 30, h: 14 }, 300, { fontSize: 64 }),
                text('ss-sub', 'Stream begins shortly — grab a seat', { x: 22, y: 62, w: 56, h: 8 },
                    { fontSize: 20, bold: false, fontColor: 'rgba(255,255,255,0.55)', letterSpacing: 1 }),
                clock('ss-clock', { x: 42, y: 9, w: 16, h: 6 }),
            ],
            zOrder: BUILTIN_BOX_IDS,
        },
    },
    {
        id: 'just-chatting',
        name: 'Just Chatting',
        accent: '#0ea5e9',
        snapshot: {
            background: { type: 'gradient', from: '#0c1326', to: '#0a0a0f', dir: '160' },
            boxes: {
                faceCam: { x: 50, y: 8, w: 46, h: 62 },
                socialFeed: { x: 4, y: 8, w: 24, h: 22 },
                currentTask: { x: 0, y: 88, w: 100, h: 12 },
            },
            boxVisibility: { ...hideAll, faceCam: true, socialFeed: true, currentTask: true },
            elements: [
                {
                    ...text('jc-name', 'Your Name', { x: 50, y: 64, w: 46, h: 9 },
                        { fontSize: 20, align: 'left' }),
                    type: 'lowerthird',
                    subContent: 'Just chatting',
                    subFontSize: 13,
                    subFontColor: '#aaaaaa',
                    bgColor: '@panel',
                    bgOpacity: 0.7,
                    borderRadius: '@radius',
                },
            ],
            zOrder: BUILTIN_BOX_IDS,
        },
    },
    {
        id: 'gameplay',
        name: 'Gameplay',
        accent: '#22c55e',
        snapshot: {
            // Transparent — the game/screen lives as a native OBS source underneath.
            background: { type: 'transparent' },
            boxes: {
                faceCam: { x: 79, y: 73, w: 20, h: 25 },
                currentTask: { x: 0, y: 92, w: 70, h: 8 },
            },
            boxVisibility: { ...hideAll, faceCam: true, currentTask: true },
            elements: [],
            zOrder: BUILTIN_BOX_IDS,
        },
    },
    {
        id: 'brb',
        name: 'Be Right Back',
        accent: '#f59e0b',
        snapshot: {
            background: { type: 'gradient', from: '#2a1605', to: '#0a0a0f', dir: '135' },
            boxVisibility: { ...hideAll },
            elements: [
                text('brb-title', 'BE RIGHT BACK', { x: 20, y: 40, w: 60, h: 14 }, { fontSize: 52 }),
                text('brb-sub', "Don't go anywhere", { x: 25, y: 56, w: 50, h: 8 },
                    { fontSize: 20, bold: false, fontColor: 'rgba(255,255,255,0.5)' }),
            ],
            zOrder: BUILTIN_BOX_IDS,
        },
    },
    {
        id: 'ending',
        name: 'Ending',
        accent: '#ec4899',
        snapshot: {
            background: { type: 'gradient', from: '#2a0820', to: '#0a0a0f', dir: '135' },
            boxes: { socialFeed: { x: 35, y: 60, w: 30, h: 22 } },
            boxVisibility: { ...hideAll, socialFeed: true },
            elements: [
                text('end-title', 'THANKS FOR WATCHING', { x: 12, y: 34, w: 76, h: 14 }, { fontSize: 46 }),
            ],
            zOrder: BUILTIN_BOX_IDS,
        },
    },
];
