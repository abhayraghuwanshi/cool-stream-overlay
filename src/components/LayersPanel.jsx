import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';

// ── Icons ─────────────────────────────────────────────────────────────────────

const EyeOn = () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
    </svg>
);
const EyeOff = () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
        <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
);
const TrashIcon = () => (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" />
    </svg>
);

// ── Data ──────────────────────────────────────────────────────────────────────

const SCREEN_COLORS = ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd'];

const BUILTIN_LAYERS = [
    { id: 'faceCam',       label: 'Face Cam',     color: '#8b5cf6', icon: '📷' },
    { id: 'handCam',       label: 'Hand Cam',     color: '#a78bfa', icon: '✋' },
    { id: 'roomCam',       label: 'Room Cam',     color: '#c4b5fd', icon: '🏠' },
    { id: 'socialFeed',    label: 'Social Feed',  color: '#0ea5e9', icon: '📡' },
    { id: 'aiCompanion',   label: 'AI Companion', color: '#10b981', icon: '🤖' },
    { id: 'currentTask',   label: 'Current Task', color: '#f59e0b', icon: '✅' },
];

const ELEMENT_TYPES = [
    { type: 'text',       label: 'Text',       color: '#ec4899', preview: <span style={{ fontWeight: 900, fontSize: 18, fontFamily: 'serif', lineHeight: 1 }}>T</span> },
    { type: 'lowerthird', label: 'Lower 3rd',  color: '#f97316', preview: (
        <span style={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'flex-start', width: '100%', padding: '0 4px' }}>
            <span style={{ height: 3, background: '#f97316', borderRadius: 2, width: '80%' }} />
            <span style={{ height: 2, background: 'rgba(249,115,22,0.4)', borderRadius: 2, width: '50%' }} />
        </span>
    )},
    { type: 'shape',      label: 'Rectangle',  color: '#8b5cf6', preview: <span style={{ width: 22, height: 14, border: '2px solid #8b5cf6', borderRadius: 3, display: 'block' }} /> },
    { type: 'circle',     label: 'Ellipse',    color: '#6366f1', preview: <span style={{ width: 18, height: 18, border: '2px solid #6366f1', borderRadius: '50%', display: 'block' }} /> },
    { type: 'divider',    label: 'Line',       color: '#6b7280', preview: <span style={{ width: '80%', height: 2, background: '#6b7280', borderRadius: 1, display: 'block' }} /> },
    { type: 'logo',       label: 'Image',      color: '#06b6d4', preview: (
        <span style={{ width: 22, height: 16, border: '1.5px solid #06b6d4', borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 9, color: '#06b6d4' }}>▣</span>
        </span>
    )},
    { type: 'clock',      label: 'Clock',      color: '#84cc16', preview: <span style={{ fontSize: 9, fontFamily: 'monospace', color: '#84cc16', letterSpacing: -0.5 }}>00:00</span> },
];

const ELEMENT_TYPE_MAP = Object.fromEntries(ELEMENT_TYPES.map(t => [t.type, t]));

// ── Sub-components ────────────────────────────────────────────────────────────

const SectionLabel = ({ children }) => (
    <div style={{ fontSize: 9, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: 2, color: 'rgba(255,255,255,0.28)', padding: '4px 8px 2px', marginTop: 2 }}>
        {children}
    </div>
);

const Divider = () => (
    <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '6px 0' }} />
);

const LayerRow = ({ icon, label, color, visible, selected, onToggle, onSelect, onDelete }) => (
    <div
        onClick={onSelect}
        style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '5px 8px',
            borderRadius: 7,
            cursor: 'pointer',
            background: selected ? 'rgba(99,102,241,0.18)' : 'transparent',
            border: selected ? '1px solid rgba(99,102,241,0.3)' : '1px solid transparent',
            opacity: visible ? 1 : 0.45,
            transition: 'all 0.1s',
            userSelect: 'none',
        }}
    >
        {/* Eye toggle */}
        <button
            title={visible ? 'Hide' : 'Show'}
            onClick={(e) => { e.stopPropagation(); onToggle(); }}
            style={{
                background: 'none', border: 'none', padding: 0, cursor: 'pointer', flexShrink: 0,
                color: visible ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.2)',
                display: 'flex', alignItems: 'center',
            }}
        >
            {visible ? <EyeOn /> : <EyeOff />}
        </button>

        {/* Color indicator */}
        <span style={{
            fontSize: 12, flexShrink: 0, lineHeight: 1,
            filter: visible ? 'none' : 'grayscale(1)',
        }}>
            {icon}
        </span>

        {/* Label */}
        <span style={{
            fontSize: 11, color: visible ? 'rgba(255,255,255,0.82)' : 'rgba(255,255,255,0.35)',
            flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            fontFamily: 'system-ui, -apple-system, sans-serif',
        }}>
            {label}
        </span>

        {/* Delete button (elements only) */}
        {onDelete && (
            <button
                title="Delete"
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                style={{
                    background: 'none', border: 'none', padding: '2px 3px', cursor: 'pointer',
                    color: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center',
                    borderRadius: 4, flexShrink: 0,
                    transition: 'color 0.1s',
                }}
                onMouseEnter={e => e.currentTarget.style.color = '#f87171'}
                onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.2)'}
            >
                <TrashIcon />
            </button>
        )}
    </div>
);

const ElementTypeCard = ({ type, label, color, preview, onClick }) => (
    <button
        onClick={() => onClick(type)}
        title={`Add ${label}`}
        style={{
            background: 'rgba(255,255,255,0.04)',
            border: `1px solid rgba(255,255,255,0.08)`,
            borderRadius: 8,
            padding: '8px 4px 6px',
            cursor: 'pointer',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 5,
            transition: 'all 0.12s',
            minHeight: 52,
        }}
        onMouseEnter={e => {
            e.currentTarget.style.background = `${color}18`;
            e.currentTarget.style.borderColor = `${color}50`;
        }}
        onMouseLeave={e => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
        }}
    >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 22, color }}>
            {preview}
        </div>
        <span style={{ fontSize: 8.5, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: 0.5, color: 'rgba(255,255,255,0.4)', lineHeight: 1 }}>
            {label}
        </span>
    </button>
);

// ── Main panel ────────────────────────────────────────────────────────────────

const CAMERA_ROWS = [
    { slot: 'faceCam', label: 'Face' },
    { slot: 'handCam', label: 'Hand' },
    { slot: 'roomCam', label: 'Room' },
];

const LayersPanel = ({
    // Built-in box visibility
    boxVisibility,
    onToggleBuiltin,
    // Elements
    elements,
    selectedElementId,
    selectedBox,
    onToggleElement,
    onDeleteElement,
    onSelectElement,
    onSelectBox,
    // Add element
    onAddElement,
    // Multi-screen captures
    screens,
    onAddScreen,
    onRemoveScreen,
    // Background / Reset
    onOpenBackground,
    onResetLayout,
    // Camera / device props
    devices = { cameras: [], mics: [] },
    streams = {},
    selectedDevices = {},
    setSelectedDevice,
    startCameraStream,
    stopCameraStream,
    errors = {},
}) => {
    const [showAddPanel, setShowAddPanel] = useState(false);

    return (
        <motion.div
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.18 }}
            style={{
                position: 'absolute',
                left: 8, top: 8, bottom: 8,
                width: 192,
                zIndex: 200,
                background: 'rgba(8,8,16,0.92)',
                backdropFilter: 'blur(16px)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 12,
                boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
            }}
        >
            {/* ── Header ── */}
            <div style={{
                padding: '10px 12px 8px',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
            }}>
                <span style={{ fontSize: 10, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: 2.5, color: 'rgba(255,255,255,0.45)' }}>
                    Layers
                </span>
                <span style={{ fontSize: 9, fontFamily: 'monospace', color: 'rgba(255,255,255,0.2)' }}>
                    {Object.values(boxVisibility).filter(Boolean).length + elements.filter(e => !e.hidden).length} visible
                </span>
            </div>

            {/* ── Scrollable body ── */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '4px 6px' }}>

                {/* ── Cameras ── */}
                <SectionLabel>Cameras</SectionLabel>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 4 }}>
                    {CAMERA_ROWS.map(({ slot, label }) => {
                        const active = !!streams[slot];
                        const hasDevice = !!selectedDevices[slot];
                        return (
                            <div key={slot}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '3px 4px' }}>
                                    <span style={{ width: 6, height: 6, borderRadius: '50%', flexShrink: 0, background: active ? '#22c55e' : 'rgba(255,255,255,0.14)', boxShadow: active ? '0 0 5px rgba(34,197,94,0.6)' : 'none' }} />
                                    <span style={{ fontSize: 9, fontFamily: 'monospace', color: 'rgba(255,255,255,0.35)', width: 26, flexShrink: 0 }}>{label}</span>
                                    <select
                                        style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 4, color: '#fff', fontSize: 9, fontFamily: 'monospace', padding: '2px 4px', minWidth: 0, outline: 'none', cursor: 'pointer' }}
                                        value={selectedDevices[slot] ?? ''}
                                        onChange={e => setSelectedDevice?.(slot, e.target.value)}
                                    >
                                        <option value="">— select —</option>
                                        {devices.cameras.map(c => <option key={c.deviceId} value={c.deviceId}>{c.label}</option>)}
                                    </select>
                                    <button
                                        onClick={() => active ? stopCameraStream?.(slot) : startCameraStream?.(slot, selectedDevices[slot])}
                                        disabled={!active && !hasDevice}
                                        style={{ padding: '2px 6px', borderRadius: 4, fontSize: 8, fontFamily: 'monospace', textTransform: 'uppercase', border: '1px solid', cursor: (!active && !hasDevice) ? 'not-allowed' : 'pointer', opacity: (!active && !hasDevice) ? 0.4 : 1, flexShrink: 0, ...(active ? { background: 'rgba(127,29,29,0.4)', borderColor: 'rgba(239,68,68,0.3)', color: '#fca5a5' } : { background: 'rgba(30,30,60,0.4)', borderColor: 'rgba(99,102,241,0.25)', color: '#a5b4fc' }) }}
                                    >{active ? 'Stop' : 'Start'}</button>
                                </div>
                                {errors?.[slot] && <div style={{ fontSize: 7, color: '#f87171', paddingLeft: 18 }}>{errors[slot]}</div>}
                            </div>
                        );
                    })}
                </div>
                <Divider />

                {/* ── Displays ── */}
                <SectionLabel>Displays</SectionLabel>
                {screens.map(sc => {
                    const boxId = `screen_${sc.slot}`;
                    const color = SCREEN_COLORS[sc.slot] ?? '#6366f1';
                    const visible = boxVisibility[boxId] ?? true;
                    return (
                        <LayerRow
                            key={sc.slot}
                            icon={<span style={{ width: 8, height: 8, borderRadius: '50%', background: color, display: 'inline-block', flexShrink: 0 }} />}
                            label={sc.label}
                            color={color}
                            visible={visible}
                            selected={selectedBox === boxId}
                            onSelect={() => onSelectBox(boxId)}
                            onToggle={() => onToggleBuiltin(boxId)}
                            onDelete={() => onRemoveScreen(sc.slot)}
                        />
                    );
                })}
                <button
                    onClick={onAddScreen}
                    disabled={screens.length >= 4}
                    style={{
                        width: '100%', padding: '5px 8px', borderRadius: 7, marginBottom: 4,
                        fontSize: 9, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: 1,
                        background: screens.length < 4 ? 'rgba(99,102,241,0.1)' : 'rgba(255,255,255,0.02)',
                        border: `1px dashed ${screens.length < 4 ? 'rgba(99,102,241,0.35)' : 'rgba(255,255,255,0.08)'}`,
                        color: screens.length < 4 ? '#a5b4fc' : 'rgba(255,255,255,0.18)',
                        cursor: screens.length < 4 ? 'pointer' : 'not-allowed',
                        transition: 'all 0.12s', textAlign: 'left',
                    }}
                >
                    {screens.length >= 4 ? 'Max 4 displays' : '+ Add Display'}
                </button>

                {/* ── Built-in layers ── */}
                <Divider />
                <SectionLabel>Canvas</SectionLabel>
                {BUILTIN_LAYERS.map(layer => (
                    <LayerRow
                        key={layer.id}
                        icon={layer.icon}
                        label={layer.label}
                        color={layer.color}
                        visible={boxVisibility[layer.id] ?? true}
                        selected={selectedBox === layer.id}
                        onSelect={() => onSelectBox(layer.id)}
                        onToggle={() => onToggleBuiltin(layer.id)}
                    />
                ))}

                {/* ── Custom elements ── */}
                {elements.length > 0 && (
                    <>
                        <Divider />
                        <SectionLabel>Elements</SectionLabel>
                        {elements.map((el) => {
                            const typeInfo = ELEMENT_TYPE_MAP[el.type];
                            return (
                                <LayerRow
                                    key={el.id}
                                    icon={typeInfo?.preview ?? el.type.charAt(0).toUpperCase()}
                                    label={el.content || typeInfo?.label || el.type}
                                    color={typeInfo?.color ?? '#6b7280'}
                                    visible={!el.hidden}
                                    selected={selectedElementId === el.id}
                                    onSelect={() => onSelectElement(el.id)}
                                    onToggle={() => onToggleElement(el.id)}
                                    onDelete={() => onDeleteElement(el.id)}
                                />
                            );
                        })}
                    </>
                )}

                {/* ── Add element ── */}
                <Divider />
                <button
                    onClick={() => setShowAddPanel(v => !v)}
                    style={{
                        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '6px 8px', borderRadius: 7, border: 'none', cursor: 'pointer',
                        background: showAddPanel ? 'rgba(99,102,241,0.15)' : 'transparent',
                        color: showAddPanel ? '#a5b4fc' : 'rgba(255,255,255,0.5)',
                        fontSize: 10, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: 1.5,
                        transition: 'all 0.12s',
                    }}
                >
                    <span>+ Add Element</span>
                    <span style={{ fontSize: 14, lineHeight: 1, transform: showAddPanel ? 'rotate(45deg)' : 'none', transition: 'transform 0.15s' }}>+</span>
                </button>

                <AnimatePresence>
                    {showAddPanel && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            style={{ overflow: 'hidden' }}
                        >
                            <div style={{
                                display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 5,
                                padding: '6px 2px 4px',
                            }}>
                                {ELEMENT_TYPES.map(t => (
                                    <ElementTypeCard
                                        key={t.type}
                                        type={t.type}
                                        label={t.label}
                                        color={t.color}
                                        preview={t.preview}
                                        onClick={(type) => {
                                            onAddElement(type);
                                            setShowAddPanel(false);
                                        }}
                                    />
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* ── Footer actions ── */}
            <div style={{
                borderTop: '1px solid rgba(255,255,255,0.06)',
                padding: '8px 8px',
                display: 'flex', gap: 5, flexShrink: 0,
            }}>
                <button
                    onClick={onOpenBackground}
                    style={{
                        flex: 1, padding: '5px 0', borderRadius: 7,
                        background: 'rgba(14,165,233,0.12)', border: '1px solid rgba(14,165,233,0.25)',
                        color: '#7dd3fc', fontSize: 9, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: 1,
                        cursor: 'pointer', transition: 'all 0.12s',
                    }}
                >
                    Background
                </button>
                <button
                    onClick={onResetLayout}
                    style={{
                        flex: 1, padding: '5px 0', borderRadius: 7,
                        background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
                        color: 'rgba(255,255,255,0.35)', fontSize: 9, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: 1,
                        cursor: 'pointer', transition: 'all 0.12s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.color = '#f87171'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.3)'; }}
                    onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.35)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
                >
                    Reset
                </button>
            </div>
        </motion.div>
    );
};

export default LayersPanel;
