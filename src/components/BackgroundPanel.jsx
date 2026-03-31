import { useRef } from 'react';

// ── Presets ────────────────────────────────────────────────────────────────
export const PRESETS = [
    { label: 'Transparent',   type: 'transparent' },
    { label: 'Pure Black',    type: 'solid',    color: '#000000' },
    { label: 'Studio Dark',   type: 'solid',    color: '#0a0a0f' },
    { label: 'GitHub Dark',   type: 'solid',    color: '#0d1117' },
    { label: 'Slate',         type: 'solid',    color: '#0f172a' },
    { label: 'Purple Night',  type: 'gradient', from: '#0a0a0f', to: '#1a0830', dir: '135deg' },
    { label: 'Indigo Depth',  type: 'gradient', from: '#0f0c29', to: '#24243e', dir: '135deg' },
    { label: 'Midnight Blue', type: 'gradient', from: '#000428', to: '#0a1628', dir: '135deg' },
    { label: 'Deep Space',    type: 'gradient', from: '#0b0c2a', to: '#1a1a4e', dir: '160deg' },
    { label: 'Forest',        type: 'gradient', from: '#0a0f0a', to: '#0d2a1a', dir: '135deg' },
    { label: 'Crimson Dark',  type: 'gradient', from: '#0f0505', to: '#280a0a', dir: '135deg' },
    { label: 'Cyber Teal',    type: 'gradient', from: '#020c10', to: '#051a20', dir: '160deg' },
    { label: 'Warm Studio',   type: 'gradient', from: '#100a05', to: '#1a1005', dir: '135deg' },
    { label: 'Neon Grid',     type: 'gradient', from: '#080010', to: '#140028', dir: '135deg' },
];

// ── Compute CSS background from config ─────────────────────────────────────
export const bgToCss = (bg) => {
    if (!bg || bg.type === 'transparent') return 'transparent';
    if (bg.type === 'solid')    return bg.color;
    if (bg.type === 'gradient') return `linear-gradient(${bg.dir ?? '135deg'}, ${bg.from}, ${bg.to})`;
    if (bg.type === 'image' && bg.src) {
        const overlay = bg.overlay ? `, rgba(0,0,0,${bg.overlayOpacity ?? 0.3})` : '';
        return `url("${bg.src}")`;
    }
    return 'transparent';
};

// Inline style object for the canvas
export const bgToStyle = (bg) => {
    if (!bg || bg.type === 'transparent') return {};
    if (bg.type === 'solid')    return { background: bg.color };
    if (bg.type === 'gradient') return { background: `linear-gradient(${bg.dir ?? '135deg'}, ${bg.from}, ${bg.to})` };
    if (bg.type === 'image' && bg.src) return {
        backgroundImage: bg.overlay
            ? `linear-gradient(rgba(0,0,0,${bg.overlayOpacity ?? 0.3}), rgba(0,0,0,${bg.overlayOpacity ?? 0.3})), url("${bg.src}")`
            : `url("${bg.src}")`,
        backgroundSize: bg.size ?? 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
    };
    return {};
};

// ── Small preset tile ───────────────────────────────────────────────────────
const PresetTile = ({ preset, active, onClick }) => {
    const tileStyle = {
        width: 44, height: 30,
        borderRadius: 5,
        cursor: 'pointer',
        border: active ? '2px solid #818cf8' : '2px solid rgba(255,255,255,0.08)',
        flexShrink: 0,
        transition: 'border-color 0.12s',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: active ? '0 0 0 1px rgba(99,102,241,0.4)' : 'none',
    };

    const innerStyle = preset.type === 'transparent'
        ? {
            width: '100%', height: '100%',
            backgroundImage: 'linear-gradient(45deg, #333 25%, transparent 25%), linear-gradient(-45deg, #333 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #333 75%), linear-gradient(-45deg, transparent 75%, #333 75%)',
            backgroundSize: '8px 8px',
            backgroundPosition: '0 0, 0 4px, 4px -4px, -4px 0px',
            backgroundColor: '#555',
        }
        : preset.type === 'solid'
            ? { width: '100%', height: '100%', background: preset.color }
            : { width: '100%', height: '100%', background: `linear-gradient(${preset.dir}, ${preset.from}, ${preset.to})` };

    return (
        <div
            title={preset.label}
            style={tileStyle}
            onClick={onClick}
        >
            <div style={innerStyle} />
        </div>
    );
};

// ── Direction picker ────────────────────────────────────────────────────────
const DIRS = [
    { label: '↘', value: '135deg' },
    { label: '↓', value: '180deg' },
    { label: '↗', value: '45deg'  },
    { label: '→', value: '90deg'  },
    { label: '↙', value: '225deg' },
];

// ── Main panel ─────────────────────────────────────────────────────────────
const BackgroundPanel = ({ bg, onChange, onClose }) => {
    const fileRef = useRef(null);
    const current = bg ?? { type: 'transparent' };

    const set = (updates) => onChange({ ...current, ...updates });

    const isPresetActive = (p) => {
        if (p.type === 'transparent' && current.type === 'transparent') return true;
        if (p.type === 'solid' && current.type === 'solid' && current.color === p.color) return true;
        if (p.type === 'gradient' && current.type === 'gradient' && current.from === p.from && current.to === p.to) return true;
        return false;
    };

    const handleImageUpload = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => set({ type: 'image', src: ev.target.result, size: 'cover', overlay: false, overlayOpacity: 0.3 });
        reader.readAsDataURL(file);
    };

    const controlStyle = {
        background: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 5,
        color: '#fff',
        fontSize: 11,
        padding: '4px 8px',
        outline: 'none',
        cursor: 'pointer',
        fontFamily: 'inter, system-ui',
    };

    return (
        <div style={{
            position: 'absolute',
            left: 8, top: 56,
            width: 240,
            background: 'rgba(9,9,18,0.94)',
            backdropFilter: 'blur(14px)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 12,
            zIndex: 200,
            boxShadow: '0 8px 32px rgba(0,0,0,0.65)',
            overflow: 'hidden',
        }}>
            {/* Header */}
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 14px 8px',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
            }}>
                <span style={{ fontSize: 10, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: 2, color: 'rgba(255,255,255,0.5)' }}>
                    Background
                </span>
                <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: 0 }}>×</button>
            </div>

            <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 14 }}>

                {/* ── Preset tiles ── */}
                <div>
                    <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Presets</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {PRESETS.map((p, i) => (
                            <PresetTile
                                key={i}
                                preset={p}
                                active={isPresetActive(p)}
                                onClick={() => {
                                    if (p.type === 'transparent') onChange({ type: 'transparent' });
                                    else if (p.type === 'solid')    onChange({ type: 'solid', color: p.color });
                                    else                             onChange({ type: 'gradient', from: p.from, to: p.to, dir: p.dir });
                                }}
                            />
                        ))}
                    </div>
                </div>

                {/* ── Type tabs ── */}
                <div style={{ display: 'flex', gap: 4 }}>
                    {['transparent', 'solid', 'gradient', 'image'].map(t => (
                        <button
                            key={t}
                            onClick={() => {
                                if (t === 'transparent') onChange({ type: 'transparent' });
                                else if (t === 'solid')  onChange({ type: 'solid', color: current.color ?? '#0a0a0f' });
                                else if (t === 'gradient') onChange({ type: 'gradient', from: current.from ?? '#0a0a0f', to: current.to ?? '#1a0830', dir: current.dir ?? '135deg' });
                                else onChange({ ...current, type: 'image' });
                            }}
                            style={{
                                flex: 1,
                                ...controlStyle,
                                padding: '5px 4px',
                                textAlign: 'center',
                                fontSize: 10,
                                textTransform: 'capitalize',
                                background: current.type === t ? 'rgba(99,102,241,0.25)' : 'rgba(255,255,255,0.05)',
                                border: current.type === t ? '1px solid rgba(99,102,241,0.5)' : '1px solid rgba(255,255,255,0.08)',
                                color: current.type === t ? '#a5b4fc' : 'rgba(255,255,255,0.5)',
                            }}
                        >
                            {t}
                        </button>
                    ))}
                </div>

                {/* ── Solid controls ── */}
                {current.type === 'solid' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 32, height: 32, borderRadius: 6, background: current.color, border: '2px solid rgba(255,255,255,0.15)', overflow: 'hidden' }}>
                                <input type="color" value={current.color ?? '#000000'} onChange={e => set({ color: e.target.value })}
                                    style={{ opacity: 0, width: '100%', height: '100%', cursor: 'pointer', border: 'none', padding: 0 }} />
                            </div>
                            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', fontFamily: 'monospace' }}>{current.color?.toUpperCase()}</span>
                        </label>
                    </div>
                )}

                {/* ── Gradient controls ── */}
                {current.type === 'gradient' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {/* Color stops */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <label style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                                <div style={{ width: 28, height: 28, borderRadius: 5, background: current.from, border: '2px solid rgba(255,255,255,0.15)', overflow: 'hidden' }}>
                                    <input type="color" value={current.from ?? '#000000'} onChange={e => set({ from: e.target.value })}
                                        style={{ opacity: 0, width: '100%', height: '100%', cursor: 'pointer', border: 'none', padding: 0 }} />
                                </div>
                                <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace' }}>FROM</span>
                            </label>

                            {/* Live gradient preview */}
                            <div style={{
                                flex: 1, height: 28, borderRadius: 5,
                                background: `linear-gradient(${current.dir ?? '135deg'}, ${current.from}, ${current.to})`,
                                border: '1px solid rgba(255,255,255,0.1)',
                            }} />

                            <label style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                                <div style={{ width: 28, height: 28, borderRadius: 5, background: current.to, border: '2px solid rgba(255,255,255,0.15)', overflow: 'hidden' }}>
                                    <input type="color" value={current.to ?? '#1a0830'} onChange={e => set({ to: e.target.value })}
                                        style={{ opacity: 0, width: '100%', height: '100%', cursor: 'pointer', border: 'none', padding: 0 }} />
                                </div>
                                <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace' }}>TO</span>
                            </label>
                        </div>

                        {/* Direction */}
                        <div>
                            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Direction</div>
                            <div style={{ display: 'flex', gap: 5 }}>
                                {DIRS.map(d => (
                                    <button
                                        key={d.value}
                                        onClick={() => set({ dir: d.value })}
                                        style={{
                                            ...controlStyle,
                                            width: 32, height: 28,
                                            padding: 0, textAlign: 'center',
                                            fontSize: 14,
                                            background: current.dir === d.value ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.05)',
                                            border: current.dir === d.value ? '1px solid rgba(99,102,241,0.5)' : '1px solid rgba(255,255,255,0.08)',
                                            color: current.dir === d.value ? '#a5b4fc' : 'rgba(255,255,255,0.5)',
                                        }}
                                    >
                                        {d.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Image controls ── */}
                {current.type === 'image' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {/* Upload */}
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <button
                                onClick={() => fileRef.current?.click()}
                                style={{ ...controlStyle, background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', color: '#a5b4fc' }}
                            >
                                {current.src ? '↺ Replace image' : '⬆ Upload image'}
                            </button>
                            {current.src && (
                                <button onClick={() => set({ src: null })}
                                    style={{ ...controlStyle, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: 'rgba(239,68,68,0.8)' }}>
                                    ✕
                                </button>
                            )}
                            <input ref={fileRef} type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
                        </div>

                        {/* Preview */}
                        {current.src && (
                            <div style={{
                                width: '100%', height: 72, borderRadius: 6,
                                backgroundImage: `url("${current.src}")`,
                                backgroundSize: current.size ?? 'cover',
                                backgroundPosition: 'center',
                                border: '1px solid rgba(255,255,255,0.1)',
                                overflow: 'hidden',
                            }} />
                        )}

                        {/* Size */}
                        <div>
                            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Fit</div>
                            <div style={{ display: 'flex', gap: 5 }}>
                                {['cover', 'contain', 'repeat'].map(s => (
                                    <button key={s} onClick={() => set({ size: s })} style={{
                                        ...controlStyle, flex: 1, textAlign: 'center', textTransform: 'capitalize',
                                        background: current.size === s ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.05)',
                                        border: current.size === s ? '1px solid rgba(99,102,241,0.5)' : '1px solid rgba(255,255,255,0.08)',
                                        color: current.size === s ? '#a5b4fc' : 'rgba(255,255,255,0.5)',
                                    }}>
                                        {s}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Dark overlay */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: 1 }}>Dark overlay</span>
                                <button
                                    onClick={() => set({ overlay: !current.overlay })}
                                    style={{
                                        width: 32, height: 16, borderRadius: 99, border: 'none', cursor: 'pointer',
                                        background: current.overlay ? '#6366f1' : 'rgba(255,255,255,0.15)',
                                        position: 'relative', transition: 'background 0.15s',
                                    }}
                                >
                                    <div style={{
                                        position: 'absolute', top: 2, width: 12, height: 12, borderRadius: '50%', background: '#fff',
                                        left: current.overlay ? 18 : 2, transition: 'left 0.15s',
                                    }} />
                                </button>
                            </div>
                            {current.overlay && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <input
                                        type="range" min={0} max={0.9} step={0.05}
                                        value={current.overlayOpacity ?? 0.3}
                                        onChange={e => set({ overlayOpacity: Number(e.target.value) })}
                                        style={{ flex: 1, accentColor: '#6366f1' }}
                                    />
                                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace', minWidth: 30 }}>
                                        {Math.round((current.overlayOpacity ?? 0.3) * 100)}%
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Transparent hint */}
                {current.type === 'transparent' && (
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', fontFamily: 'monospace', lineHeight: 1.5 }}>
                        OBS will see through to whatever is behind the browser source. Use chroma key or scene layers as needed.
                    </div>
                )}
            </div>
        </div>
    );
};

export default BackgroundPanel;
