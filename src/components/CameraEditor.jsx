// Right-panel editor for a selected camera box. Device assignment used to
// live in the Layers panel; it moved here so each camera shows up only once
// in the unified layers list.

import { CAMERA_FRAMES } from './CameraFrame';

const Label = ({ children }) => (
    <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 4 }}>
        {children}
    </span>
);

const CAMERA_LABELS = { faceCam: 'Face Cam', handCam: 'Hand Cam', roomCam: 'Room Cam' };

// Tiny visual swatch echoing each frame preset so it's pickable at a glance.
const FramePreview = ({ id, accent }) => {
    const base = { width: 26, height: 18, background: 'rgba(255,255,255,0.12)', boxSizing: 'border-box' };
    const map = {
        none:     { ...base, borderRadius: 3, border: '1px dashed rgba(255,255,255,0.25)', background: 'transparent' },
        soft:     { ...base, borderRadius: 5, boxShadow: '0 2px 6px rgba(0,0,0,0.6)' },
        ring:     { ...base, borderRadius: 5, border: `2px solid ${accent}` },
        neon:     { ...base, borderRadius: 5, border: `1.5px solid ${accent}`, boxShadow: `0 0 7px ${accent}` },
        gradient: { ...base, borderRadius: 5, background: `linear-gradient(135deg, ${accent}, ${accent}55)` },
        glass:    { ...base, borderRadius: 5, border: '1px solid rgba(255,255,255,0.5)' },
        circle:   { width: 20, height: 20, borderRadius: '50%', border: `2px solid ${accent}`, background: 'rgba(255,255,255,0.12)', boxSizing: 'border-box' },
    };
    return <span style={map[id] ?? base} />;
};

const PRESET_ACCENTS = ['#6366f1', '#22d3ee', '#ec4899', '#f59e0b', '#22c55e', '#ffffff'];

const CameraEditor = ({ slot, camStyle = {}, onChangeCamStyle }) => {
    const frame = camStyle.frame ?? 'soft';
    const accent = camStyle.accent ?? '#6366f1';
    const radius = camStyle.radius ?? 14;
    const usesAccent = ['ring', 'neon', 'gradient', 'circle'].includes(frame);
    const usesRadius = !['none', 'circle'].includes(frame);

    return (
        <div style={{
            width: '100%', boxSizing: 'border-box',
            background: 'rgba(7,7,16,0.94)',
            padding: '12px 14px 16px',
            display: 'flex', flexDirection: 'column', gap: 12,
        }}>
            {/* Type badge */}
            <div>
                <Label>Camera</Label>
                <div style={{
                    fontSize: 10, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: 1,
                    color: '#a5b4fc', background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)',
                    borderRadius: 5, padding: '3px 8px', display: 'inline-flex', alignItems: 'center', gap: 6,
                }}>
                    {CAMERA_LABELS[slot] ?? slot}
                </div>
            </div>

            {/* OBS source hint — the real webcam is a native OBS source behind this frame */}
            <div style={{
                fontSize: 9, fontFamily: 'monospace', lineHeight: 1.5, color: 'rgba(255,255,255,0.4)',
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 6, padding: '7px 9px',
            }}>
                This is a frame placeholder. Add your webcam as a native OBS “Video Capture Device” source and place it <em>behind</em> this overlay, aligned inside the frame.
            </div>

            <div style={{ height: 1, background: 'rgba(255,255,255,0.08)' }} />

            {/* Frame picker */}
            <div>
                <Label>Frame</Label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 5 }}>
                    {CAMERA_FRAMES.map(f => {
                        const selected = frame === f.id;
                        return (
                            <button
                                key={f.id}
                                onClick={() => onChangeCamStyle?.({ frame: f.id })}
                                title={f.label}
                                style={{
                                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 5,
                                    padding: '8px 2px 5px', borderRadius: 7, cursor: 'pointer',
                                    background: selected ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.04)',
                                    border: `1px solid ${selected ? 'rgba(99,102,241,0.55)' : 'rgba(255,255,255,0.08)'}`,
                                    transition: 'all 0.12s', minHeight: 46,
                                }}
                            >
                                <span style={{ height: 20, display: 'flex', alignItems: 'center' }}>
                                    <FramePreview id={f.id} accent={accent} />
                                </span>
                                <span style={{ fontSize: 7.5, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: 0.5, color: selected ? '#c7d2fe' : 'rgba(255,255,255,0.4)' }}>
                                    {f.label}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Accent — only for frames that use it */}
            {usesAccent && (
                <div>
                    <Label>Accent</Label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        {PRESET_ACCENTS.map(c => (
                            <button
                                key={c}
                                onClick={() => onChangeCamStyle?.({ accent: c })}
                                title={c}
                                style={{
                                    width: 20, height: 20, borderRadius: '50%', cursor: 'pointer', flexShrink: 0,
                                    background: c, border: accent.toLowerCase() === c.toLowerCase() ? '2px solid #fff' : '2px solid rgba(255,255,255,0.15)',
                                    boxShadow: accent.toLowerCase() === c.toLowerCase() ? `0 0 8px ${c}` : 'none',
                                }}
                            />
                        ))}
                        <label title="Custom color" style={{ width: 20, height: 20, borderRadius: '50%', overflow: 'hidden', cursor: 'pointer', border: '2px solid rgba(255,255,255,0.15)', flexShrink: 0, position: 'relative', background: 'conic-gradient(red,orange,yellow,lime,cyan,blue,magenta,red)' }}>
                            <input type="color" value={accent} onChange={e => onChangeCamStyle?.({ accent: e.target.value })} style={{ opacity: 0, width: '100%', height: '100%', cursor: 'pointer' }} />
                        </label>
                    </div>
                </div>
            )}

            {/* Corner radius — only for rectangular frames */}
            {usesRadius && (
                <div>
                    <Label>Corner radius — {radius}px</Label>
                    <input
                        type="range" min={0} max={40} value={radius}
                        onChange={e => onChangeCamStyle?.({ radius: Number(e.target.value) })}
                        style={{ width: '100%', accentColor: accent, cursor: 'pointer' }}
                    />
                </div>
            )}

            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', fontFamily: 'monospace', lineHeight: 1.5 }}>
                Position, resize, and z-order this cam from the canvas or the Layers list.
            </div>
        </div>
    );
};

export default CameraEditor;
