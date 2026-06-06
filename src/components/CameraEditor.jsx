// Right-panel editor for a selected camera box. Device assignment used to
// live in the Layers panel; it moved here so each camera shows up only once
// in the unified layers list.

const Label = ({ children }) => (
    <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 4 }}>
        {children}
    </span>
);

const CAMERA_LABELS = { faceCam: 'Face Cam', handCam: 'Hand Cam', roomCam: 'Room Cam' };

const CameraEditor = ({ slot, devices = [], selectedDeviceId, onSelectDevice, active, onStart, onStop, error }) => {
    const hasDevice = !!selectedDeviceId;

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
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: active ? '#22c55e' : 'rgba(255,255,255,0.25)', boxShadow: active ? '0 0 6px rgba(34,197,94,0.7)' : 'none' }} />
                    {CAMERA_LABELS[slot] ?? slot}
                </div>
            </div>

            <div style={{ height: 1, background: 'rgba(255,255,255,0.08)' }} />

            {/* Device picker */}
            <div>
                <Label>Device</Label>
                <select
                    value={selectedDeviceId ?? ''}
                    onChange={e => onSelectDevice?.(slot, e.target.value)}
                    style={{
                        width: '100%', boxSizing: 'border-box',
                        background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 5, color: '#fff', fontSize: 11, fontFamily: 'inter, system-ui',
                        padding: '5px 6px', outline: 'none', cursor: 'pointer',
                    }}
                >
                    <option value="" style={{ background: '#0d0d1a' }}>— select camera —</option>
                    {devices.length === 0
                        ? <option disabled>No cameras found</option>
                        : devices.map(c => <option key={c.deviceId} value={c.deviceId} style={{ background: '#0d0d1a' }}>{c.label}</option>)}
                </select>
            </div>

            {/* Start / Stop */}
            <button
                onClick={() => active ? onStop?.(slot) : onStart?.(slot, selectedDeviceId)}
                disabled={!active && !hasDevice}
                style={{
                    width: '100%', padding: '7px 0', borderRadius: 7,
                    fontSize: 10, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: 1,
                    border: '1px solid', cursor: (!active && !hasDevice) ? 'not-allowed' : 'pointer',
                    opacity: (!active && !hasDevice) ? 0.4 : 1,
                    ...(active
                        ? { background: 'rgba(127,29,29,0.4)', borderColor: 'rgba(239,68,68,0.35)', color: '#fca5a5' }
                        : { background: 'rgba(79,70,229,0.4)', borderColor: 'rgba(99,102,241,0.4)', color: '#c7d2fe' }),
                }}
            >
                {active ? 'Stop camera' : 'Start camera'}
            </button>

            {error && (
                <div style={{ fontSize: 9, fontFamily: 'monospace', color: '#f87171' }}>{error}</div>
            )}

            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', fontFamily: 'monospace', lineHeight: 1.5 }}>
                Position, resize, and z-order this cam from the canvas or the Layers list. Add a Cam Frame element over it for a styled border.
            </div>
        </div>
    );
};

export default CameraEditor;
