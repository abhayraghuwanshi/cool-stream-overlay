import { AnimatePresence, motion } from 'framer-motion';
import { Bot, Camera, ChevronDown, ChevronUp, Layers, ListChecks, Monitor, Plus, RotateCw, Video, X } from 'lucide-react';
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

const BUILTIN_LAYERS = [
    { id: 'faceCam',       label: 'Face Cam',     color: '#8b5cf6', Icon: Camera },
    { id: 'handCam',       label: 'Hand Cam',     color: '#a78bfa', Icon: Video },
    { id: 'roomCam',       label: 'Room Cam',     color: '#c4b5fd', Icon: Monitor },
    { id: 'aiCompanion',   label: 'AI Companion', color: '#10b981', Icon: Bot },
    { id: 'currentTask',   label: 'Current Task', color: '#f59e0b', Icon: ListChecks },
];
const BUILTIN_MAP = Object.fromEntries(BUILTIN_LAYERS.map(l => [l.id, l]));

// A clipped solid preview swatch for the polygon shapes.
const clipSwatch = (clip, color, w = 18, h = 16) => (
    <span style={{ width: w, height: h, background: color, clipPath: clip, display: 'block' }} />
);

// `group` controls which Add subsection a type appears under: 'element' (content)
// or 'shape' (primitives). Defaults to 'element' when omitted.
const ELEMENT_TYPES = [
    { type: 'text',       label: 'Text',       color: '#ec4899', preview: <span style={{ fontWeight: 900, fontSize: 18, fontFamily: 'serif', lineHeight: 1 }}>T</span> },
    { type: 'lowerthird', label: 'Lower 3rd',  color: '#f97316', preview: (
        <span style={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'flex-start', width: 28 }}>
            <span style={{ height: 3, background: '#f97316', borderRadius: 2, width: 24, display: 'block' }} />
            <span style={{ height: 2, background: 'rgba(249,115,22,0.4)', borderRadius: 2, width: 15, display: 'block' }} />
        </span>
    )},
    { type: 'logo',       label: 'Image',      color: '#06b6d4', preview: (
        <span style={{ width: 22, height: 16, border: '1.5px solid #06b6d4', borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 9, color: '#06b6d4' }}>▣</span>
        </span>
    )},
    { type: 'clock',      label: 'Clock',      color: '#84cc16', preview: <span style={{ fontSize: 9, fontFamily: 'monospace', color: '#84cc16', letterSpacing: -0.5 }}>00:00</span> },
    { type: 'countdown',  label: 'Countdown',  color: '#14b8a6', preview: <span style={{ fontSize: 9, fontFamily: 'monospace', color: '#14b8a6', letterSpacing: -0.5 }}>05:00</span> },
    { type: 'daycounter', label: 'Day Counter', color: '#fb923c', preview: (
        <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: 1 }}>
            <span style={{ fontSize: 6, fontFamily: 'monospace', color: 'rgba(251,146,60,0.7)', letterSpacing: 1 }}>DAY</span>
            <span style={{ fontSize: 13, fontWeight: 900, color: '#fb923c' }}>42</span>
        </span>
    )},
    { type: 'frame',      label: 'Cam Frame',  color: '#818cf8', preview: <span style={{ width: 20, height: 14, border: '2px solid #818cf8', borderRadius: 3, display: 'block', boxShadow: '0 0 4px #818cf8' }} /> },
    { type: 'live',       label: 'Live Badge', color: '#ef4444', preview: (
        <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#ef4444', boxShadow: '0 0 4px #ef4444', display: 'block' }} />
            <span style={{ fontSize: 8, fontWeight: 900, color: '#ef4444', letterSpacing: 0.5 }}>LIVE</span>
        </span>
    )},
    { type: 'social',     label: 'Social',     color: '#0ea5e9', preview: (
        <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <span style={{ fontSize: 13, fontWeight: 900, color: '#0ea5e9', lineHeight: 1 }}>@</span>
            <span style={{ width: 11, height: 3, background: 'rgba(14,165,233,0.5)', borderRadius: 2, display: 'block' }} />
        </span>
    )},
    { type: 'goal',       label: 'Goal Bar',   color: '#22c55e', preview: (
        <span style={{ width: 26, height: 5, background: 'rgba(34,197,94,0.2)', borderRadius: 3, overflow: 'hidden', display: 'block' }}>
            <span style={{ display: 'block', width: '70%', height: '100%', background: '#22c55e', borderRadius: 3 }} />
        </span>
    )},
    { type: 'liquidgoal', label: 'Liquid Goal', color: '#0ea5e9', preview: (
        <span style={{ width: 13, height: 20, borderRadius: 4, border: '1.5px solid rgba(14,165,233,0.6)', overflow: 'hidden', display: 'block', position: 'relative' }}>
            <span style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '60%', background: '#0ea5e9', display: 'block' }} />
        </span>
    )},
    { type: 'pomodoro',   label: 'Pomodoro',   color: '#f87171', preview: (
        <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: 1 }}>
            <span style={{ fontSize: 10 }}>🍅</span>
            <span style={{ fontSize: 8, fontFamily: 'monospace', color: '#f87171', letterSpacing: -0.5 }}>25:00</span>
        </span>
    )},
    { type: 'moodring',   label: 'Mood Ring',  color: '#38bdf8', preview: (
        <span style={{ width: 16, height: 16, borderRadius: '50%', border: '2.5px solid #38bdf8', boxShadow: '0 0 6px #38bdf8, inset 0 0 4px #38bdf8', display: 'block' }} />
    )},
    { type: 'pet',        label: 'Channel Pet', color: '#fbbf24', preview: (
        <svg width="18" height="15" viewBox="0 0 120 100">
            {/* cute loaf cat */}
            <path d="M22 30 L29 6 L46 26 Z" fill="#c2c2cc" />
            <path d="M90 30 L83 6 L66 26 Z" fill="#c2c2cc" />
            <rect x="30" y="78" width="11" height="16" rx="5.5" fill="#c2c2cc" />
            <rect x="62" y="78" width="11" height="16" rx="5.5" fill="#c2c2cc" />
            <ellipse cx="56" cy="57" rx="40" ry="33" fill="#c2c2cc" />
            <ellipse cx="44" cy="53" rx="6" ry="7.6" fill="#3a2e36" />
            <ellipse cx="68" cy="53" rx="6" ry="7.6" fill="#3a2e36" />
            <circle cx="46" cy="50" r="2.4" fill="#fff" />
            <circle cx="70" cy="50" r="2.4" fill="#fff" />
        </svg>
    )},
    { type: 'wheel',      label: 'Decision Wheel', color: '#a855f7', preview: (
        <span style={{ position: 'relative', width: 18, height: 18, borderRadius: '50%', display: 'block', overflow: 'hidden',
            background: 'conic-gradient(#ef4444 0deg 90deg, #f59e0b 90deg 180deg, #22c55e 180deg 270deg, #0ea5e9 270deg 360deg)',
            boxShadow: '0 0 4px rgba(168,85,247,0.7)' }}>
            <span style={{ position: 'absolute', top: '50%', left: '50%', width: 5, height: 5, borderRadius: '50%', background: '#0a0a16', transform: 'translate(-50%,-50%)' }} />
        </span>
    )},
    { type: 'note',       label: 'Sticky Note', color: '#fcd34d', preview: (
        <span style={{ position: 'relative', width: 16, height: 16, background: '#fde68a', display: 'block', transform: 'rotate(-6deg)', boxShadow: '0 2px 4px rgba(0,0,0,0.4)' }}>
            <span style={{ position: 'absolute', top: 3, left: 2.5, right: 2.5, height: 1.5, background: 'rgba(58,47,16,0.55)', display: 'block' }} />
            <span style={{ position: 'absolute', top: 6.5, left: 2.5, right: 5, height: 1.5, background: 'rgba(58,47,16,0.55)', display: 'block' }} />
            <span style={{ position: 'absolute', right: 0, bottom: 0, width: 0, height: 0, borderStyle: 'solid', borderWidth: '0 0 5px 5px', borderColor: 'transparent transparent rgba(0,0,0,0.18) transparent' }} />
        </span>
    )},
    { type: 'ticker',     label: 'Ticker',     color: '#34d399', preview: (
        <span style={{ width: 28, height: 11, borderRadius: 2, border: '1px solid rgba(52,211,153,0.5)', display: 'flex', alignItems: 'center', gap: 2.5, padding: '0 2px', overflow: 'hidden', boxSizing: 'border-box' }}>
            <span style={{ width: 10, height: 2.5, background: '#34d399', borderRadius: 2, flexShrink: 0 }} />
            <span style={{ width: 2.5, height: 2.5, background: 'rgba(52,211,153,0.5)', borderRadius: '50%', flexShrink: 0 }} />
            <span style={{ width: 12, height: 2.5, background: '#34d399', borderRadius: 2, flexShrink: 0 }} />
        </span>
    )},
    { type: 'match',      label: 'Scoreboard', color: '#22c55e', preview: (
        <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontFamily: 'monospace' }}>
            <span style={{ width: 7, height: 5, background: '#22c55e', borderRadius: 1, display: 'block' }} />
            <span style={{ fontSize: 9, fontWeight: 900, color: '#facc15' }}>1–0</span>
            <span style={{ width: 7, height: 5, background: '#0ea5e9', borderRadius: 1, display: 'block' }} />
        </span>
    )},

    // ── Shapes ──
    { type: 'shape',    group: 'shape', label: 'Rectangle', color: '#8b5cf6', preview: <span style={{ width: 22, height: 14, border: '2px solid #8b5cf6', borderRadius: 3, display: 'block' }} /> },
    { type: 'circle',   group: 'shape', label: 'Ellipse',   color: '#6366f1', preview: <span style={{ width: 18, height: 18, border: '2px solid #6366f1', borderRadius: '50%', display: 'block' }} /> },
    { type: 'divider',  group: 'shape', label: 'Line',      color: '#6b7280', preview: <span style={{ width: 26, height: 2, background: '#6b7280', borderRadius: 1, display: 'block' }} /> },
    { type: 'triangle', group: 'shape', label: 'Triangle',  color: '#f43f5e', preview: clipSwatch('polygon(50% 0%, 100% 100%, 0% 100%)', '#f43f5e') },
    { type: 'diamond',  group: 'shape', label: 'Diamond',   color: '#06b6d4', preview: clipSwatch('polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)', '#06b6d4') },
    { type: 'hexagon',  group: 'shape', label: 'Hexagon',   color: '#eab308', preview: clipSwatch('polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)', '#eab308', 20) },
    { type: 'star',     group: 'shape', label: 'Star',      color: '#f59e0b', preview: clipSwatch('polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)', '#f59e0b') },
];

const ELEMENT_TYPE_MAP = Object.fromEntries(ELEMENT_TYPES.map(t => [t.type, t]));
const CONTENT_ELEMENTS = ELEMENT_TYPES.filter(t => t.group !== 'shape');
const SHAPE_ELEMENTS = ELEMENT_TYPES.filter(t => t.group === 'shape');

// ── Sub-components ────────────────────────────────────────────────────────────

const SectionLabel = ({ children }) => (
    <div style={{ fontSize: 9, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: 2, color: 'rgba(255,255,255,0.28)', padding: '4px 8px 2px', marginTop: 2 }}>
        {children}
    </div>
);

const Divider = () => (
    <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '6px 0' }} />
);

const IconBtn = ({ onClick, title, danger, children }) => (
    <button
        onClick={onClick}
        title={title}
        style={{
            background: 'none', border: 'none', padding: '2px 2px', cursor: 'pointer', flexShrink: 0,
            color: 'rgba(255,255,255,0.28)', display: 'flex', alignItems: 'center', borderRadius: 4,
            transition: 'color 0.1s',
        }}
        onMouseEnter={e => e.currentTarget.style.color = danger ? '#f87171' : 'rgba(255,255,255,0.7)'}
        onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.28)'}
    >
        {children}
    </button>
);

// One row in the unified layers list. Every layer gets reorder (↑↓) + remove;
// elements additionally get an eye (hide/show without removing).
const LayerRow = ({ icon, label, color, visible, selected, live, onSelect, onToggle, onUp, onDown, onRemove }) => (
    <div
        onClick={onSelect}
        style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '5px 6px',
            borderRadius: 7,
            cursor: 'pointer',
            background: selected ? 'rgba(99,102,241,0.18)' : 'transparent',
            border: selected ? '1px solid rgba(99,102,241,0.3)' : '1px solid transparent',
            opacity: visible ? 1 : 0.45,
            transition: 'background 0.1s',
            userSelect: 'none',
        }}
    >
        {/* Eye toggle (elements only) */}
        {onToggle && (
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
        )}

        {/* Live status dot (cameras only) */}
        {live !== undefined && (
            <span title={live ? 'Live' : 'No device'} style={{
                width: 5, height: 5, borderRadius: '50%', flexShrink: 0,
                background: live ? '#22c55e' : 'rgba(255,255,255,0.18)',
                boxShadow: live ? '0 0 5px rgba(34,197,94,0.6)' : 'none',
            }} />
        )}

        {/* Icon */}
        <span style={{ fontSize: 12, flexShrink: 0, lineHeight: 1, display: 'flex', alignItems: 'center', filter: visible ? 'none' : 'grayscale(1)' }}>
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

        {/* Reorder — always visible */}
        <IconBtn onClick={(e) => { e.stopPropagation(); onUp?.(); }} title="Move up (front)"><ChevronUp size={12} /></IconBtn>
        <IconBtn onClick={(e) => { e.stopPropagation(); onDown?.(); }} title="Move down (back)"><ChevronDown size={12} /></IconBtn>

        {/* Remove — always visible */}
        <IconBtn onClick={(e) => { e.stopPropagation(); onRemove?.(); }} title="Remove" danger><TrashIcon /></IconBtn>
    </div>
);

const AddCard = ({ label, color, preview, onClick }) => (
    <button
        onClick={onClick}
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
        onMouseEnter={e => { e.currentTarget.style.background = `${color}18`; e.currentTarget.style.borderColor = `${color}50`; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
    >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 22, color }}>
            {preview}
        </div>
        <span style={{ fontSize: 8.5, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: 0.5, color: 'rgba(255,255,255,0.4)', lineHeight: 1, textAlign: 'center' }}>
            {label}
        </span>
    </button>
);

// ── Scenes (dropdown) ─────────────────────────────────────────────────────────

const SceneDot = ({ color }) => (
    <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0, boxShadow: `0 0 5px ${color}aa` }} />
);

// Scenes belong to the ACTIVE layout. This switches between them, saves the
// current canvas as a new scene, updates a scene to match the canvas, or
// deletes one. The "Layouts" link opens the gallery to switch which show (layout)
// is active.
const ScenesDropdown = ({ layoutName, scenes = [], activeSceneId, onSwitchScene, onUpdateScene, onDeleteScene, onOpenLayouts }) => {
    const [open, setOpen] = useState(false);

    const active = scenes.find(s => s.id === activeSceneId) ?? null;

    return (
        <div style={{ padding: '0 2px' }}>
            {/* Header: section label + layout (show) switcher */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 8px 3px' }}>
                <span style={{ fontSize: 9, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: 2, color: 'rgba(255,255,255,0.28)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {layoutName ? `Scenes · ${layoutName}` : 'Scenes'}
                </span>
                <button
                    onClick={onOpenLayouts}
                    title="Switch / manage layouts"
                    style={{ display: 'flex', alignItems: 'center', gap: 3, background: 'none', border: 'none', cursor: 'pointer', color: '#a5b4fc', fontSize: 8.5, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: 0.5, flexShrink: 0 }}
                >
                    <Layers size={10} /> Layouts
                </button>
            </div>

            {/* Trigger */}
            <button
                onClick={() => setOpen(o => !o)}
                style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 7,
                    padding: '6px 9px', borderRadius: 7,
                    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
                    color: 'rgba(255,255,255,0.78)', cursor: 'pointer',
                    fontSize: 10, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: 1,
                }}
            >
                {active ? <SceneDot color="#818cf8" /> : <span style={{ width: 6, height: 6, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.25)', flexShrink: 0 }} />}
                <span style={{ flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: active ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.4)' }}>
                    {active ? active.name : (scenes.length ? 'Choose a scene…' : 'No scenes yet')}
                </span>
                <ChevronDown size={12} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s', opacity: 0.5, flexShrink: 0 }} />
            </button>

            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        style={{ overflow: 'hidden' }}
                    >
                        <div style={{
                            marginTop: 4, padding: 4, borderRadius: 8,
                            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
                            display: 'flex', flexDirection: 'column', gap: 1,
                        }}>
                            {scenes.length === 0 && (
                                <div style={{ fontSize: 9, fontFamily: 'monospace', color: 'rgba(255,255,255,0.3)', padding: '6px 7px', lineHeight: 1.5 }}>
                                    No scenes here yet — hit Save Scene in the top bar.
                                </div>
                            )}
                            {scenes.map(s => {
                                const isActive = s.id === activeSceneId;
                                return (
                                    <div
                                        key={s.id}
                                        onClick={() => { onSwitchScene?.(s.id); setOpen(false); }}
                                        title="Switch to this scene"
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: 7, padding: '5px 7px',
                                            borderRadius: 6, cursor: 'pointer',
                                            background: isActive ? 'rgba(99,102,241,0.16)' : 'transparent',
                                        }}
                                        onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                                        onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                                    >
                                        <SceneDot color={isActive ? '#818cf8' : '#64748b'} />
                                        <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 10, color: isActive ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.7)' }}>
                                            {s.name}
                                        </span>
                                        {isActive && (
                                            <IconBtn onClick={(e) => { e.stopPropagation(); onUpdateScene?.(s.id); }} title="Update this scene to match the current canvas"><RotateCw size={10} /></IconBtn>
                                        )}
                                        <IconBtn onClick={(e) => { e.stopPropagation(); onDeleteScene?.(s.id); }} title="Delete scene" danger><X size={11} /></IconBtn>
                                    </div>
                                );
                            })}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

// ── Main panel ────────────────────────────────────────────────────────────────

const LayersPanel = ({
    // Built-in boxes (add on demand)
    boxVisibility,
    onAddBuiltin,
    onRemoveBuiltin,
    // Elements
    elements,
    selectedElementId,
    selectedBox,
    onToggleElement,
    onDeleteElement,
    onElementUp,
    onElementDown,
    onSelectElement,
    onSelectBox,
    onAddElement,
    onPlaceElement,
    // Scenes (of the active layout)
    layoutName,
    scenes = [],
    activeSceneId,
    onSwitchScene,
    onUpdateScene,
    onDeleteScene,
    onOpenLayouts,
    // Background / Theme / Reset
    onOpenBackground,
    onOpenTheme,
    onResetLayout,
    // Z-order (built-ins)
    zOrder = [],
    onLayerUp,
    onLayerDown,
}) => {
    const [showAddPanel, setShowAddPanel] = useState(false);

    // Higher index in zOrder = rendered on top = shown first in list.
    const zRank = (id) => zOrder.indexOf(id);

    const presentBuiltins = BUILTIN_LAYERS
        .filter(l => boxVisibility[l.id])
        .sort((a, b) => zRank(b.id) - zRank(a.id));
    const availableBuiltins = BUILTIN_LAYERS.filter(l => !boxVisibility[l.id]);

    const visibleCount = presentBuiltins.length + elements.filter(e => !e.hidden).length;
    const isEmpty = presentBuiltins.length === 0 && elements.length === 0;

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
                    {visibleCount} visible
                </span>
            </div>

            {/* ── Scrollable body ── */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '4px 6px' }}>

                {/* ── Scenes ── */}
                <ScenesDropdown
                    layoutName={layoutName}
                    scenes={scenes}
                    activeSceneId={activeSceneId}
                    onSwitchScene={onSwitchScene}
                    onUpdateScene={onUpdateScene}
                    onDeleteScene={onDeleteScene}
                    onOpenLayouts={onOpenLayouts}
                />
                {/* ── Add (grouped with the scenes controls) ── */}
                <div style={{ padding: '0 2px', marginTop: 5 }}>
                    <button
                        onClick={() => setShowAddPanel(v => !v)}
                        title="Add a component, element, or shape to the canvas"
                        style={{
                            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                            padding: '6px 8px', borderRadius: 7,
                            background: showAddPanel ? 'rgba(99,102,241,0.28)' : 'rgba(99,102,241,0.12)',
                            border: '1px solid rgba(99,102,241,0.4)', color: '#a5b4fc', cursor: 'pointer',
                            fontSize: 9, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: 1,
                            transition: 'background 0.12s',
                        }}
                        onMouseEnter={e => { if (!showAddPanel) e.currentTarget.style.background = 'rgba(99,102,241,0.2)'; }}
                        onMouseLeave={e => { if (!showAddPanel) e.currentTarget.style.background = 'rgba(99,102,241,0.12)'; }}
                    >
                        <Plus size={11} style={{ transform: showAddPanel ? 'rotate(45deg)' : 'none', transition: 'transform 0.15s' }} />
                        {showAddPanel ? 'Close' : 'Add Layer'}
                    </button>
                </div>

                {!showAddPanel && <Divider />}

                <AnimatePresence>
                    {showAddPanel && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            style={{ overflow: 'hidden' }}
                        >
                            {availableBuiltins.length > 0 && (
                                <>
                                    <SectionLabel>Components</SectionLabel>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 5, padding: '4px 2px' }}>
                                        {availableBuiltins.map(l => (
                                            <AddCard
                                                key={l.id}
                                                label={l.label}
                                                color={l.color}
                                                preview={<l.Icon size={16} color={l.color} />}
                                                onClick={() => { onAddBuiltin(l.id); setShowAddPanel(false); }}
                                            />
                                        ))}
                                    </div>
                                </>
                            )}
                            <SectionLabel>Elements — click, then place on canvas</SectionLabel>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 5, padding: '4px 2px 6px' }}>
                                {CONTENT_ELEMENTS.map(t => (
                                    <AddCard
                                        key={t.type}
                                        label={t.label}
                                        color={t.color}
                                        preview={t.preview}
                                        // Arm placement (click/drag on canvas) if available,
                                        // else fall back to instant add.
                                        onClick={() => {
                                            if (onPlaceElement) onPlaceElement(t.type);
                                            else onAddElement(t.type);
                                            setShowAddPanel(false);
                                        }}
                                    />
                                ))}
                            </div>
                            <SectionLabel>Shapes</SectionLabel>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 5, padding: '4px 2px 6px' }}>
                                {SHAPE_ELEMENTS.map(t => (
                                    <AddCard
                                        key={t.type}
                                        label={t.label}
                                        color={t.color}
                                        preview={t.preview}
                                        onClick={() => {
                                            if (onPlaceElement) onPlaceElement(t.type);
                                            else onAddElement(t.type);
                                            setShowAddPanel(false);
                                        }}
                                    />
                                ))}
                            </div>
                            <Divider />
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* ── Unified layers list (components first, then elements) ── */}
                {isEmpty && !showAddPanel && (
                    <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.25)', fontSize: 9.5, fontFamily: 'monospace', lineHeight: 1.6, padding: '18px 10px' }}>
                        No layers yet.<br />Hit <span style={{ color: '#a5b4fc' }}>+ Add</span> or pick a scene.
                    </div>
                )}

                {presentBuiltins.map(layer => {
                    return (
                        <LayerRow
                            key={layer.id}
                            icon={<layer.Icon size={13} color={layer.color} />}
                            label={layer.label}
                            color={layer.color}
                            visible
                            selected={selectedBox === layer.id}
                            onSelect={() => onSelectBox(layer.id)}
                            onUp={() => onLayerUp?.(layer.id)}
                            onDown={() => onLayerDown?.(layer.id)}
                            onRemove={() => onRemoveBuiltin(layer.id)}
                        />
                    );
                })}

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
                            onUp={() => onElementUp?.(el.id)}
                            onDown={() => onElementDown?.(el.id)}
                            onRemove={() => onDeleteElement(el.id)}
                        />
                    );
                })}
            </div>

            {/* ── Footer actions ── */}
            <div style={{
                borderTop: '1px solid rgba(255,255,255,0.06)',
                padding: '8px 8px',
                display: 'flex', gap: 5, flexShrink: 0,
            }}>
                <button
                    onClick={onOpenTheme}
                    style={{
                        flex: 1, padding: '5px 0', borderRadius: 7,
                        background: 'rgba(99,102,241,0.14)', border: '1px solid rgba(99,102,241,0.3)',
                        color: '#a5b4fc', fontSize: 9, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: 1,
                        cursor: 'pointer', transition: 'all 0.12s',
                    }}
                >
                    Theme
                </button>
                <button
                    onClick={onOpenBackground}
                    style={{
                        flex: 1, padding: '5px 0', borderRadius: 7,
                        background: 'rgba(14,165,233,0.12)', border: '1px solid rgba(14,165,233,0.25)',
                        color: '#7dd3fc', fontSize: 9, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: 1,
                        cursor: 'pointer', transition: 'all 0.12s',
                    }}
                >
                    BG
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
