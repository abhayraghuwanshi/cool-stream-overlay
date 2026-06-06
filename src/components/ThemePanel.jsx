import { X } from 'lucide-react';
import { THEMES } from '../theme/themes';

// ── Font choices ──────────────────────────────────────────────────────────
const FONTS = [
    { label: 'Inter',     value: 'inter, system-ui, sans-serif' },
    { label: 'Mono',      value: "'JetBrains Mono', ui-monospace, monospace" },
    { label: 'Serif',     value: 'Georgia, "Times New Roman", serif' },
    { label: 'System',    value: 'system-ui, -apple-system, sans-serif' },
];

const FRAMES = ['none', 'solid', 'glow', 'gradient'];

const swatch = (theme) => ({
    width: 44, height: 30, borderRadius: 5, overflow: 'hidden', flexShrink: 0,
    background: `linear-gradient(135deg, ${theme.accent}, ${theme.accent2})`,
    position: 'relative',
});

const labelStyle = { fontSize: 9, color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 };

const ColorPick = ({ value, onChange, caption }) => (
    <label style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
        <div style={{ width: 30, height: 30, borderRadius: 6, background: value, border: '2px solid rgba(255,255,255,0.15)', overflow: 'hidden' }}>
            <input type="color" value={value || '#000000'} onChange={e => onChange(e.target.value)}
                style={{ opacity: 0, width: '100%', height: '100%', cursor: 'pointer', border: 'none', padding: 0 }} />
        </div>
        <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace' }}>{caption}</span>
    </label>
);

const tabStyle = (active) => ({
    flex: 1, padding: '5px 4px', textAlign: 'center', fontSize: 10,
    fontFamily: 'monospace', textTransform: 'capitalize', borderRadius: 5, cursor: 'pointer',
    background: active ? 'rgba(99,102,241,0.25)' : 'rgba(255,255,255,0.05)',
    border: active ? '1px solid rgba(99,102,241,0.5)' : '1px solid rgba(255,255,255,0.08)',
    color: active ? '#a5b4fc' : 'rgba(255,255,255,0.5)',
});

// ── Main panel ─────────────────────────────────────────────────────────────
const ThemePanel = ({ theme, onApply, onChange, onClose }) => {
    const t = theme ?? THEMES[0];
    const set = (changes) => onChange?.(changes);

    return (
        <div style={{
            position: 'absolute',
            left: 248, top: 48,
            width: 240,
            background: 'rgba(9,9,18,0.94)',
            backdropFilter: 'blur(14px)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 12,
            zIndex: 350,
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
                    Theme
                </span>
                <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', padding: 0, display: 'flex' }}><X size={14} /></button>
            </div>

            <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 14 }}>

                {/* ── Starter themes ── */}
                <div>
                    <div style={labelStyle}>Themes</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {THEMES.map(th => (
                            <div
                                key={th.id}
                                title={th.name}
                                onClick={() => onApply?.(th.id)}
                                style={{
                                    ...swatch(th),
                                    cursor: 'pointer',
                                    border: t.id === th.id ? '2px solid #818cf8' : '2px solid rgba(255,255,255,0.08)',
                                    boxShadow: t.id === th.id ? '0 0 0 1px rgba(99,102,241,0.4)' : 'none',
                                }}
                            />
                        ))}
                    </div>
                </div>

                {/* ── Colors ── */}
                <div>
                    <div style={labelStyle}>Colors</div>
                    <div style={{ display: 'flex', gap: 12 }}>
                        <ColorPick value={t.accent} onChange={v => set({ accent: v })} caption="ACCENT" />
                        <ColorPick value={t.accent2} onChange={v => set({ accent2: v })} caption="ACCENT 2" />
                        <ColorPick value={t.textColor} onChange={v => set({ textColor: v })} caption="TEXT" />
                        <ColorPick value={t.panelColor} onChange={v => set({ panelColor: v })} caption="PANEL" />
                    </div>
                </div>

                {/* ── Font ── */}
                <div>
                    <div style={labelStyle}>Font</div>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {FONTS.map(f => (
                            <button key={f.label} onClick={() => set({ fontFamily: f.value })} style={{ ...tabStyle(t.fontFamily === f.value), flex: '1 0 44%', fontFamily: f.value }}>
                                {f.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* ── Corner radius ── */}
                <div>
                    <div style={labelStyle}>Corner radius</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <input
                            type="range" min={0} max={24} step={1}
                            value={t.cornerRadius ?? 8}
                            onChange={e => set({ cornerRadius: Number(e.target.value) })}
                            style={{ flex: 1, accentColor: '#6366f1', cursor: 'pointer' }}
                        />
                        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace', minWidth: 32, textAlign: 'right' }}>
                            {t.cornerRadius ?? 8}px
                        </span>
                    </div>
                </div>

                {/* ── Frame style ── */}
                <div>
                    <div style={labelStyle}>Cam frame</div>
                    <div style={{ display: 'flex', gap: 4 }}>
                        {FRAMES.map(fr => (
                            <button key={fr} onClick={() => set({ frameStyle: fr })} style={tabStyle(t.frameStyle === fr)}>
                                {fr}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ThemePanel;
