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
    borderRadius: resolveToken(element.borderRadius, theme),
});
