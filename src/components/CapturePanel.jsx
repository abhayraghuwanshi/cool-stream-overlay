import { motion } from 'framer-motion';
import { formatElapsed } from '../hooks/useCapture';

// ── Shared helpers ────────────────────────────────────────────────────────────

const SectionHeader = ({ label, badge }) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 9, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: 2, color: 'rgba(255,255,255,0.35)' }}>
            {label}
        </span>
        {badge && <span style={{ fontSize: 8, fontFamily: 'monospace', color: 'rgba(255,255,255,0.2)' }}>{badge}</span>}
    </div>
);

const StatusDot = ({ active, color = '#22c55e' }) => (
    <span style={{
        display: 'inline-block', width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
        background: active ? color : 'rgba(255,255,255,0.18)',
        boxShadow: active ? `0 0 6px ${color}aa` : 'none',
    }} />
);

const selectStyle = {
    flex: 1,
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 5,
    color: '#fff',
    fontSize: 10,
    fontFamily: 'monospace',
    padding: '3px 6px',
    minWidth: 0,
    outline: 'none',
    cursor: 'pointer',
};

const Btn = ({ onClick, active, danger, disabled, children }) => (
    <button
        onClick={onClick}
        disabled={disabled}
        style={{
            padding: '3px 8px',
            borderRadius: 99,
            fontSize: 9,
            fontFamily: 'monospace',
            textTransform: 'uppercase',
            letterSpacing: 1,
            border: '1px solid',
            cursor: disabled ? 'not-allowed' : 'pointer',
            opacity: disabled ? 0.4 : 1,
            transition: 'all 0.12s',
            whiteSpace: 'nowrap',
            flexShrink: 0,
            ...(danger
                ? { background: 'rgba(127,29,29,0.5)', borderColor: 'rgba(239,68,68,0.4)', color: '#fca5a5' }
                : active
                    ? { background: 'rgba(79,70,229,0.6)', borderColor: 'rgba(99,102,241,0.5)', color: '#fff' }
                    : { background: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)' }
            ),
        }}
    >
        {children}
    </button>
);

const SCREEN_COLORS = ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd'];

// ── CapturePanel ──────────────────────────────────────────────────────────────

const CapturePanel = ({ capture, isObsRecording, onClose }) => {
    const {
        devices,
        streams,
        screens,
        canAddScreen,
        errors,
        selectedDevices,
        setSelectedDevice,
        startCameraStream,
        stopCameraStream,
        addScreenCapture,
        removeScreenCapture,
        startMicCapture,
        stopMicCapture,
        recording,
        startRecording,
        stopRecording,
        downloadRecording,
    } = capture;

    const camActive    = Object.values(streams).filter(Boolean).length;
    const screenActive = screens.length;
    const canRecord    = !isObsRecording;

    const CAMERA_ROWS = [
        { slot: 'faceCam', label: 'Face' },
        { slot: 'handCam', label: 'Hand' },
        { slot: 'roomCam', label: 'Room' },
    ];

    return (
        <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            style={{
                position: 'absolute',
                right: 8, top: 56,
                width: 268,
                zIndex: 200,
                background: 'rgba(9,9,18,0.94)',
                backdropFilter: 'blur(14px)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 12,
                boxShadow: '0 8px 32px rgba(0,0,0,0.65)',
                maxHeight: 'calc(100vh - 72px)',
                overflowY: 'auto',
                userSelect: 'none',
            }}
        >
            {/* Header */}
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 12px 8px',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
            }}>
                <span style={{ fontSize: 9, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: 3, color: 'rgba(255,255,255,0.5)' }}>
                    Capture
                </span>
                <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', fontSize: 14, cursor: 'pointer', lineHeight: 1, padding: '0 2px' }}>
                    ×
                </button>
            </div>

            <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 14 }}>

                {/* ── Displays ── */}
                <div>
                    <SectionHeader label="Displays" badge={`${screenActive} active`} />

                    {/* Active screen rows */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: screens.length ? 6 : 0 }}>
                        {screens.map((sc) => (
                            <div key={sc.slot} style={{
                                display: 'flex', alignItems: 'center', gap: 6,
                                padding: '5px 8px',
                                background: 'rgba(255,255,255,0.04)',
                                border: `1px solid ${SCREEN_COLORS[sc.slot]}30`,
                                borderRadius: 7,
                            }}>
                                <StatusDot active color={SCREEN_COLORS[sc.slot]} />
                                <span style={{
                                    fontSize: 9, fontFamily: 'monospace',
                                    color: SCREEN_COLORS[sc.slot],
                                    flex: 1,
                                }}>
                                    {sc.label}
                                </span>
                                <Btn danger onClick={() => removeScreenCapture(sc.slot)}>Stop</Btn>
                            </div>
                        ))}
                    </div>

                    {/* Add display button */}
                    <button
                        onClick={addScreenCapture}
                        disabled={!canAddScreen}
                        style={{
                            width: '100%', padding: '6px 0', borderRadius: 7,
                            fontSize: 9, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: 1,
                            background: canAddScreen ? 'rgba(99,102,241,0.12)' : 'rgba(255,255,255,0.03)',
                            border: `1px dashed ${canAddScreen ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.1)'}`,
                            color: canAddScreen ? '#a5b4fc' : 'rgba(255,255,255,0.2)',
                            cursor: canAddScreen ? 'pointer' : 'not-allowed',
                            transition: 'all 0.12s',
                        }}
                    >
                        {!canAddScreen
                            ? 'Max 4 displays reached'
                            : screens.length === 0
                                ? '+ Add Display  (picks primary, secondary…)'
                                : `+ Add Another Display  (${screens.length}/4)`
                        }
                    </button>

                    {errors.screen && (
                        <div style={{ fontSize: 8, fontFamily: 'monospace', color: '#f87171', marginTop: 4 }}>{errors.screen}</div>
                    )}

                    <div style={{ marginTop: 5, fontSize: 8, fontFamily: 'monospace', color: 'rgba(255,255,255,0.2)', lineHeight: 1.5 }}>
                        Each click opens the browser's source picker — choose a screen, window, or tab.
                    </div>
                </div>

                {/* ── Cameras ── */}
                <div>
                    <SectionHeader label="Cameras" />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {CAMERA_ROWS.map(({ slot, label }) => (
                            <div key={slot}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <StatusDot active={!!streams[slot]} />
                                    <span style={{ fontSize: 9, fontFamily: 'monospace', color: 'rgba(255,255,255,0.35)', width: 28, flexShrink: 0 }}>
                                        {label}
                                    </span>
                                    <select
                                        style={selectStyle}
                                        value={selectedDevices[slot] ?? ''}
                                        onChange={e => setSelectedDevice(slot, e.target.value)}
                                    >
                                        <option value="">-- camera --</option>
                                        {devices.cameras.length === 0
                                            ? <option disabled>No cameras found</option>
                                            : devices.cameras.map(c => <option key={c.deviceId} value={c.deviceId}>{c.label}</option>)
                                        }
                                    </select>
                                    {streams[slot]
                                        ? <Btn danger onClick={() => stopCameraStream(slot)}>Stop</Btn>
                                        : <Btn active={!!selectedDevices[slot]} disabled={!selectedDevices[slot]} onClick={() => startCameraStream(slot, selectedDevices[slot])}>Start</Btn>
                                    }
                                </div>
                                {errors[slot] && (
                                    <div style={{ fontSize: 8, fontFamily: 'monospace', color: '#f87171', marginTop: 2, paddingLeft: 22 }}>{errors[slot]}</div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* ── Microphone ── */}
                <div>
                    <SectionHeader label="Microphone" />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <StatusDot active={!!streams.mic} />
                        <select
                            style={selectStyle}
                            value={selectedDevices.mic ?? ''}
                            onChange={e => setSelectedDevice('mic', e.target.value)}
                        >
                            <option value="">-- microphone --</option>
                            {devices.mics.length === 0
                                ? <option disabled>No microphones found</option>
                                : devices.mics.map(m => <option key={m.deviceId} value={m.deviceId}>{m.label}</option>)
                            }
                        </select>
                        {streams.mic
                            ? <Btn danger onClick={stopMicCapture}>Stop</Btn>
                            : <Btn active={!!selectedDevices.mic} disabled={!selectedDevices.mic} onClick={() => startMicCapture(selectedDevices.mic)}>Start</Btn>
                        }
                    </div>
                    {errors.mic && (
                        <div style={{ fontSize: 8, fontFamily: 'monospace', color: '#f87171', marginTop: 4 }}>{errors.mic}</div>
                    )}
                </div>

                {/* ── Recording ── */}
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 12 }}>
                    <SectionHeader label="Recording" />

                    {isObsRecording ? (
                        <div style={{
                            background: 'rgba(120,53,15,0.35)', border: '1px solid rgba(217,119,6,0.35)',
                            borderRadius: 8, padding: '8px 10px',
                            fontSize: 9, fontFamily: 'monospace', color: 'rgba(252,211,77,0.8)', lineHeight: 1.5,
                        }}>
                            <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: '#f59e0b', marginRight: 6, verticalAlign: 'middle' }} />
                            OBS is recording — in-app recording disabled
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <div style={{ textAlign: 'center', fontFamily: 'monospace', fontSize: 20, letterSpacing: 2, color: recording.active ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.18)' }}>
                                {formatElapsed(recording.elapsed)}
                            </div>

                            {recording.active ? (
                                <button onClick={stopRecording} style={{ width: '100%', padding: '6px 0', borderRadius: 8, fontSize: 10, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: 1, background: 'rgba(127,29,29,0.55)', border: '1px solid rgba(239,68,68,0.45)', color: '#fca5a5', cursor: 'pointer' }}>
                                    ■ Stop Recording
                                </button>
                            ) : (
                                <button onClick={startRecording} disabled={!canRecord} style={{ width: '100%', padding: '6px 0', borderRadius: 8, fontSize: 10, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: 1, background: canRecord ? 'rgba(79,70,229,0.55)' : 'rgba(255,255,255,0.04)', border: `1px solid ${canRecord ? 'rgba(99,102,241,0.45)' : 'rgba(255,255,255,0.08)'}`, color: canRecord ? '#fff' : 'rgba(255,255,255,0.25)', cursor: canRecord ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: canRecord ? '#ef4444' : 'rgba(255,255,255,0.2)', display: 'inline-block', boxShadow: canRecord ? '0 0 6px rgba(239,68,68,0.6)' : 'none' }} />
                                    Start Recording
                                </button>
                            )}

                            {recording.blob && !recording.active && (
                                <button onClick={() => downloadRecording(recording.blob)} style={{ width: '100%', padding: '6px 0', borderRadius: 8, fontSize: 10, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: 1, background: 'rgba(6,78,59,0.45)', border: '1px solid rgba(16,185,129,0.4)', color: '#6ee7b7', cursor: 'pointer' }}>
                                    ↓ Download WebM
                                </button>
                            )}

                            <div style={{ textAlign: 'center', fontSize: 8, fontFamily: 'monospace', color: 'rgba(255,255,255,0.25)' }}>
                                {screenActive} display{screenActive !== 1 ? 's' : ''} · {camActive} cam{camActive !== 1 ? 's' : ''} · {streams.mic ? 'mic on' : 'no mic'}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', padding: '6px 12px 10px', fontSize: 8, fontFamily: 'monospace', color: 'rgba(255,255,255,0.18)', textAlign: 'center' }}>
                Sources must be active before recording starts
            </div>
        </motion.div>
    );
};

export default CapturePanel;
