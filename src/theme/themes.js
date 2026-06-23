// Theme tokens — the shared visual vocabulary every scene/element resolves
// against. Elements may store either a literal value (e.g. "#ffffff", 8) or a
// token string ("@accent", "@radius"). At render time tokens resolve to the
// active theme's value, so swapping the theme re-skins everything authored
// with tokens. Literals always pass through unchanged (backward compatible).
//
// A "theme pack" (see src/scenes/packs.js) bundles one theme with a set of
// scenes built on it — the cohesive, one-click unit a streamer installs.

// frameStyle drives the cam-frame element: none | solid | glow | gradient

export const THEMES = [
    {
        id: 'midnight',
        name: 'Midnight',
        accent: '#6366f1',
        accent2: '#a855f7',
        textColor: '#ffffff',
        panelColor: '#0a0a0f',
        fontFamily: 'inter, system-ui, sans-serif',
        cornerRadius: 8,
        frameStyle: 'glow',
    },
    {
        id: 'neon',
        name: 'Neon',
        accent: '#22d3ee',
        accent2: '#f472b6',
        textColor: '#ecfeff',
        panelColor: '#05070d',
        fontFamily: "'JetBrains Mono', ui-monospace, monospace",
        cornerRadius: 3,
        frameStyle: 'solid',
    },
    {
        id: 'minimal',
        name: 'Minimal',
        accent: '#e5e7eb',
        accent2: '#9ca3af',
        textColor: '#ffffff',
        panelColor: '#111114',
        fontFamily: 'inter, system-ui, sans-serif',
        cornerRadius: 2,
        frameStyle: 'solid',
    },
    {
        id: 'warm',
        name: 'Warm',
        accent: '#f59e0b',
        accent2: '#ef4444',
        textColor: '#fff7ed',
        panelColor: '#1a0f05',
        fontFamily: 'inter, system-ui, sans-serif',
        cornerRadius: 14,
        frameStyle: 'gradient',
    },
    {
        id: 'aurora',
        name: 'Aurora',
        accent: '#2dd4bf',
        accent2: '#6366f1',
        textColor: '#f0fdfa',
        panelColor: '#07120f',
        fontFamily: 'inter, system-ui, sans-serif',
        cornerRadius: 12,
        frameStyle: 'glow',
    },
    {
        id: 'sunset',
        name: 'Sunset',
        accent: '#fb7185',
        accent2: '#fbbf24',
        textColor: '#fff1f2',
        panelColor: '#1a0a12',
        fontFamily: 'inter, system-ui, sans-serif',
        cornerRadius: 16,
        frameStyle: 'gradient',
    },
    {
        id: 'vapor',
        name: 'Vapor',
        accent: '#f0abfc',
        accent2: '#22d3ee',
        textColor: '#fdf4ff',
        panelColor: '#11071a',
        fontFamily: "'JetBrains Mono', ui-monospace, monospace",
        cornerRadius: 6,
        frameStyle: 'glow',
    },
    {
        id: 'crimson',
        name: 'Crimson',
        accent: '#f43f5e',
        accent2: '#b91c1c',
        textColor: '#fef2f2',
        panelColor: '#140505',
        fontFamily: "'JetBrains Mono', ui-monospace, monospace",
        cornerRadius: 4,
        frameStyle: 'glow',
    },
    {
        id: 'ocean',
        name: 'Ocean',
        accent: '#38bdf8',
        accent2: '#2563eb',
        textColor: '#f0f9ff',
        panelColor: '#04101c',
        fontFamily: 'inter, system-ui, sans-serif',
        cornerRadius: 12,
        frameStyle: 'glow',
    },
    {
        id: 'gold',
        name: 'Gold',
        accent: '#d4af37',
        accent2: '#b8860b',
        textColor: '#fffbeb',
        panelColor: '#0c0a05',
        fontFamily: 'Georgia, "Times New Roman", serif',
        cornerRadius: 6,
        frameStyle: 'gradient',
    },
    {
        id: 'emerald',
        name: 'Emerald',
        accent: '#34d399',
        accent2: '#10b981',
        textColor: '#ecfdf5',
        panelColor: '#04140d',
        fontFamily: 'inter, system-ui, sans-serif',
        cornerRadius: 14,
        frameStyle: 'glow',
    },
    {
        id: 'royale',
        name: 'Royale',
        accent: '#a78bfa',
        accent2: '#f0c350',
        textColor: '#faf5ff',
        panelColor: '#100726',
        fontFamily: 'Georgia, "Times New Roman", serif',
        cornerRadius: 10,
        frameStyle: 'gradient',
    },
    {
        id: 'frost',
        name: 'Frost',
        accent: '#7dd3fc',
        accent2: '#e0f2fe',
        textColor: '#f0f9ff',
        panelColor: '#0a1420',
        fontFamily: 'inter, system-ui, sans-serif',
        cornerRadius: 18,
        frameStyle: 'glow',
    },
    {
        id: 'matrix',
        name: 'Matrix',
        accent: '#22c55e',
        accent2: '#4ade80',
        textColor: '#dcfce7',
        panelColor: '#020a04',
        fontFamily: "'JetBrains Mono', ui-monospace, monospace",
        cornerRadius: 0,
        frameStyle: 'solid',
    },
    {
        id: 'bubblegum',
        name: 'Bubblegum',
        accent: '#f472b6',
        accent2: '#c084fc',
        textColor: '#fdf2f8',
        panelColor: '#1a0a16',
        fontFamily: 'inter, system-ui, sans-serif',
        cornerRadius: 20,
        frameStyle: 'gradient',
    },
    {
        id: 'inferno',
        name: 'Inferno',
        accent: '#fb923c',
        accent2: '#ef4444',
        textColor: '#fff7ed',
        panelColor: '#1a0805',
        fontFamily: "'JetBrains Mono', ui-monospace, monospace",
        cornerRadius: 4,
        frameStyle: 'glow',
    },
    {
        id: 'cosmic',
        name: 'Cosmic',
        accent: '#818cf8',
        accent2: '#e879f9',
        textColor: '#eef2ff',
        panelColor: '#0a0820',
        fontFamily: 'inter, system-ui, sans-serif',
        cornerRadius: 14,
        frameStyle: 'glow',
    },
    {
        id: 'worldcup',
        name: 'World Cup',
        accent: '#facc15',     // trophy gold
        accent2: '#16a34a',    // pitch green
        textColor: '#ffffff',
        panelColor: '#0a2616',  // deep pitch green
        fontFamily: 'inter, system-ui, sans-serif',
        cornerRadius: 8,
        frameStyle: 'gradient',
    },
];

export const DEFAULT_THEME = THEMES[0];

export const getTheme = (idOrTheme) => {
    if (idOrTheme && typeof idOrTheme === 'object') return { ...DEFAULT_THEME, ...idOrTheme };
    return THEMES.find(t => t.id === idOrTheme) ?? DEFAULT_THEME;
};

// Maps a token string → the active theme's value. Non-token values (and
// non-strings like numbers) pass through unchanged.
const TOKEN_MAP = {
    '@accent': 'accent',
    '@accent2': 'accent2',
    '@text': 'textColor',
    '@panel': 'panelColor',
    '@radius': 'cornerRadius',
    '@font': 'fontFamily',
};

export const resolveToken = (value, theme = DEFAULT_THEME) => {
    if (typeof value === 'string' && value.startsWith('@')) {
        const key = TOKEN_MAP[value];
        if (key) return theme[key];
    }
    return value;
};

// Returns a copy of the element with its token-bearing fields resolved against
// the theme. Used by ElementRenderer so the rest of the render path can read
// concrete values without caring about tokens.
export const resolveElement = (element, theme = DEFAULT_THEME) => ({
    ...element,
    fontColor: resolveToken(element.fontColor, theme),
    subFontColor: resolveToken(element.subFontColor, theme),
    bgColor: resolveToken(element.bgColor, theme),
    fillColor: resolveToken(element.fillColor, theme),
    borderRadius: resolveToken(element.borderRadius, theme),
});
