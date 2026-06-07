// Theme packs — the "install in one click" unit, like Streamlabs themes.
// A pack pairs a theme with a signature starting scene. Installing it applies
// the theme (re-skinning every token-authored scene) AND drops you onto a
// ready-made scene so you instantly see the complete look.

import { THEMES } from '../theme/themes';
import { SCENE_PRESETS } from './presets';

const preset = (id) => SCENE_PRESETS.find(p => p.id === id);
const theme = (id) => THEMES.find(t => t.id === id);

export const THEME_PACKS = [
    { id: 'midnight', name: 'Midnight', themeId: 'midnight', tagline: 'Indigo glow, clean type', startScene: 'starting-soon' },
    { id: 'neon',     name: 'Neon',     themeId: 'neon',     tagline: 'Cyber mono, high contrast', startScene: 'starting-soon' },
    { id: 'minimal',  name: 'Minimal',  themeId: 'minimal',  tagline: 'Sharp, monochrome',         startScene: 'just-chatting' },
    { id: 'warm',     name: 'Warm',     themeId: 'warm',     tagline: 'Amber, soft corners',        startScene: 'brb' },
];

// The accent gradient used for a pack's preview swatch.
export const packGradient = (pack) => {
    const t = theme(pack.themeId) ?? THEMES[0];
    return `linear-gradient(135deg, ${t.accent}, ${t.accent2})`;
};

// Snapshot applied when a pack is installed: its start scene, carrying the
// pack's theme so applyScene swaps the theme and the layout together.
export const packSnapshot = (pack) => {
    const p = preset(pack.startScene);
    return { ...(p?.snapshot ?? {}), theme: pack.themeId };
};
