import { RefreshCw, Upload, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { scoresUrl } from '../config';
import { MOODS, DEFAULT_MOOD } from '../theme/moods';
import { PETS, DEFAULT_PET, PetMascot } from './pets';

// Quick sticky-note swatches — each pairs a paper colour with readable dark ink.
const NOTE_PAPERS = [
    { label: 'Yellow', paper: '#fde68a', ink: '#3a2f10' },
    { label: 'Pink',   paper: '#fbcfe8', ink: '#4a1233' },
    { label: 'Mint',   paper: '#bbf7d0', ink: '#0f3d27' },
    { label: 'Blue',   paper: '#bfdbfe', ink: '#15315e' },
    { label: 'Orange', paper: '#fed7aa', ink: '#5a2c08' },
    { label: 'Lilac',  paper: '#e9d5ff', ink: '#3b1466' },
];

// ── Small reusable controls ────────────────────────────────────────────────

const Label = ({ children }) => (
    <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 3 }}>
        {children}
    </span>
);

const TextInput = ({ value, onChange, placeholder, style = {} }) => (
    <input
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 5,
            color: '#fff',
            fontSize: 11,
            padding: '4px 8px',
            outline: 'none',
            fontFamily: 'inter, system-ui',
            width: '100%',
            boxSizing: 'border-box',
            ...style,
        }}
    />
);

const TextArea = ({ value, onChange, placeholder, rows = 4, style = {} }) => (
    <textarea
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 5,
            color: '#fff',
            fontSize: 11,
            padding: '6px 8px',
            outline: 'none',
            fontFamily: 'inter, system-ui',
            width: '100%',
            boxSizing: 'border-box',
            resize: 'vertical',
            lineHeight: 1.4,
            ...style,
        }}
    />
);

const NumberInput = ({ value, onChange, min, max, step = 1, style = {} }) => (
    <input
        type="number"
        value={value ?? ''}
        min={min} max={max} step={step}
        onChange={e => onChange(Number(e.target.value))}
        style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 5,
            color: '#fff',
            fontSize: 11,
            padding: '4px 6px',
            outline: 'none',
            width: 58,
            textAlign: 'center',
            ...style,
        }}
    />
);

const ColorInput = ({ value, onChange, label }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {label && <Label>{label}</Label>}
        <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{
                width: 22, height: 22,
                borderRadius: 4,
                background: value || '#ffffff',
                border: '2px solid rgba(255,255,255,0.15)',
                flexShrink: 0,
                overflow: 'hidden',
            }}>
                <input
                    type="color"
                    value={value || '#ffffff'}
                    onChange={e => onChange(e.target.value)}
                    style={{ opacity: 0, width: '100%', height: '100%', cursor: 'pointer', padding: 0, border: 'none' }}
                />
            </div>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace' }}>
                {value?.toUpperCase() || '#FFF'}
            </span>
        </label>
    </div>
);

const Slider = ({ value, onChange, min = 0, max = 1, step = 0.01, label, displayValue }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {label && <Label>{label}</Label>}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <input
                type="range" min={min} max={max} step={step}
                value={value ?? min}
                onChange={e => onChange(Number(e.target.value))}
                style={{ flex: 1, accentColor: '#6366f1', cursor: 'pointer' }}
            />
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace', minWidth: 32, textAlign: 'right' }}>
                {displayValue ?? Math.round((value ?? 0) * 100) + '%'}
            </span>
        </div>
    </div>
);

const ToggleBtn = ({ active, onClick, children, title }) => (
    <button
        onClick={onClick}
        title={title}
        style={{
            background: active ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.05)',
            border: `1px solid ${active ? 'rgba(99,102,241,0.6)' : 'rgba(255,255,255,0.1)'}`,
            borderRadius: 5,
            color: active ? '#a5b4fc' : 'rgba(255,255,255,0.5)',
            fontSize: 11,
            fontWeight: 'bold',
            padding: '4px 8px',
            cursor: 'pointer',
            lineHeight: 1,
        }}
    >
        {children}
    </button>
);

const SelectInput = ({ value, onChange, options }) => (
    <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 5,
            color: '#fff',
            fontSize: 11,
            padding: '4px 6px',
            outline: 'none',
            cursor: 'pointer',
        }}
    >
        {options.map(o => (
            <option key={o.value} value={o.value} style={{ background: '#0d0d1a' }}>{o.label}</option>
        ))}
    </select>
);

const Divider = () => (
    <div style={{ width: '100%', height: 1, background: 'rgba(255,255,255,0.08)', flexShrink: 0 }} />
);

const Group = ({ label, children }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0, width: '100%' }}>
        {label && <Label>{label}</Label>}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
            {children}
        </div>
    </div>
);

// ── Main Editor ────────────────────────────────────────────────────────────

// Format an ISO kickoff time as a short local time, e.g. "22:30".
const fmtKickoff = (iso) => {
    try { return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }
    catch { return ''; }
};

// Order matches the way a streamer wants to pick them: in-play first, then
// upcoming (soonest kickoff first), then finished (most recent first). Without
// this the feed's date-ascending order buries today's/live games under weeks of
// early group games once the list is capped.
const matchPriority = (m) => (m.status === 'LIVE' || m.status === 'HT') ? 0 : m.status === 'SCHED' ? 1 : 2;
const matchSort = (a, b) => {
    const pa = matchPriority(a), pb = matchPriority(b);
    if (pa !== pb) return pa - pb;
    const ta = +new Date(a.utcDate), tb = +new Date(b.utcDate);
    return pa === 2 ? tb - ta : ta - tb;  // finished: newest first; live/upcoming: soonest first
};

// Relative day label for a match date — "Today" / "Tomorrow" / "Yesterday",
// else a short date like "Jun 24".
const fmtDay = (iso) => {
    try {
        const d = new Date(iso);
        const day0 = new Date(); day0.setHours(0, 0, 0, 0);
        const md = new Date(d); md.setHours(0, 0, 0, 0);
        const diff = Math.round((md - day0) / 86400000);
        if (diff === 0) return 'Today';
        if (diff === 1) return 'Tomorrow';
        if (diff === -1) return 'Yesterday';
        return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch { return ''; }
};

const ElementEditor = ({ element, onChange, onDelete }) => {
    const fileRef = useRef(null);
    // Match feed for the scoreboard picker — fetched once when a match element is
    // selected. `null` while loading; otherwise { configured, matches: [...] }.
    const [matchFeed, setMatchFeed] = useState(null);
    const [matchQuery, setMatchQuery] = useState('');
    useEffect(() => {
        if (element?.type !== 'match') return;
        let alive = true;
        fetch(scoresUrl())
            .then(r => (r.ok ? r.json() : null))
            .then(d => { if (alive && d) setMatchFeed(d); })
            .catch(() => {});
        return () => { alive = false; };
    }, [element?.type, element?.id]);
    if (!element) return null;

    const set = (key, val) => onChange({ [key]: val });
    const { type } = element;
    const isClipShape = ['triangle', 'diamond', 'hexagon', 'star'].includes(type);
    const isMoodEl = ['moodring', 'pet'].includes(type);
    const isText = ['text', 'lowerthird', 'clock', 'countdown', 'live', 'social', 'pomodoro', 'daycounter', 'ticker'].includes(type);
    const isAutoText = ['clock', 'countdown', 'pomodoro', 'daycounter', 'ticker'].includes(type); // content handled by custom controls (or auto-generated), no generic text input

    const handleLogoUpload = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => onChange({ src: ev.target.result });
        reader.readAsDataURL(file);
    };

    return (
        <div
            style={{
                width: '100%',
                boxSizing: 'border-box',
                background: 'rgba(7,7,16,0.94)',
                padding: '12px 14px 16px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'stretch',
                gap: 12,
                overflowX: 'hidden',
            }}
        >
            {/* ── Type badge ── */}
            <div style={{ flexShrink: 0 }}>
                <Label>Type</Label>
                <div style={{
                    fontSize: 10, fontFamily: 'monospace', textTransform: 'uppercase',
                    letterSpacing: 1, color: '#a5b4fc',
                    background: 'rgba(99,102,241,0.15)',
                    border: '1px solid rgba(99,102,241,0.3)',
                    borderRadius: 5, padding: '3px 8px',
                }}>
                    {type}
                </div>
            </div>

            <Divider />

            {/* ── Text content ── */}
            {isText && !isAutoText && (
                <Group label="Content">
                    <TextInput
                        value={element.content}
                        onChange={v => set('content', v)}
                        placeholder="Enter text..."
                        style={{ width: 160 }}
                    />
                </Group>
            )}

            {/* ── Countdown duration ── */}
            {type === 'countdown' && (
                <Group label="Duration">
                    <NumberInput
                        value={Math.floor((element.durationSec ?? 0) / 60)}
                        onChange={v => set('durationSec', Math.max(0, v) * 60 + (element.durationSec ?? 0) % 60)}
                        min={0} max={180} style={{ width: 52 }}
                    />
                    <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', fontFamily: 'monospace' }}>min</span>
                    <NumberInput
                        value={(element.durationSec ?? 0) % 60}
                        onChange={v => set('durationSec', Math.floor((element.durationSec ?? 0) / 60) * 60 + Math.min(59, Math.max(0, v)))}
                        min={0} max={59} style={{ width: 52 }}
                    />
                    <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', fontFamily: 'monospace' }}>sec</span>
                </Group>
            )}

            {/* ── Day counter: day number + labels ── */}
            {type === 'daycounter' && (
                <>
                    <Group label="Day">
                        <NumberInput value={element.day ?? 1} onChange={v => set('day', Math.max(0, v))} min={0} max={99999} style={{ width: 64 }} />
                        <ToggleBtn active={false} onClick={() => set('day', Math.max(0, (element.day ?? 1) + 1))} title="Bump to the next day">+1 day</ToggleBtn>
                    </Group>
                    <Group label="Label">
                        <TextInput value={element.prefix ?? 'DAY'} onChange={v => set('prefix', v)} placeholder="DAY" style={{ width: 80 }} />
                    </Group>
                    <Group label="Caption">
                        <TextInput value={element.content} onChange={v => set('content', v)} placeholder="#100DaysOfCode" style={{ width: 160 }} />
                    </Group>
                </>
            )}

            {/* ── Ticker: messages + scroll speed ── */}
            {type === 'ticker' && (
                <>
                    <div style={{ width: '100%' }}>
                        <Label>Messages</Label>
                        <TextArea value={element.content} onChange={v => set('content', v)} placeholder="One message per line…" rows={4} />
                    </div>
                    <Group label="Speed">
                        {['slow', 'medium', 'fast'].map(s => (
                            <ToggleBtn key={s} active={(element.speed ?? 'medium') === s} onClick={() => set('speed', s)} title={`Scroll ${s}`}>
                                {s.charAt(0).toUpperCase() + s.slice(1)}
                            </ToggleBtn>
                        ))}
                    </Group>
                    <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace', lineHeight: 1.4 }}>
                        Each line is a message; they loop with a • between them.
                    </div>
                </>
            )}

            {/* ── LIVE badge: dot colour + pulse ── */}
            {type === 'live' && (
                <Group label="Dot">
                    <ColorInput value={element.dotColor || '#ef4444'} onChange={v => set('dotColor', v)} />
                    <ToggleBtn active={element.pulse !== false} onClick={() => set('pulse', !(element.pulse !== false))} title="Pulse animation">Pulse</ToggleBtn>
                </Group>
            )}

            {/* ── Social chip: platform ── */}
            {type === 'social' && (
                <Group label="Platform">
                    <SelectInput
                        value={element.platform || 'twitch'}
                        onChange={v => set('platform', v)}
                        options={[
                            { value: 'twitch',    label: 'Twitch'      },
                            { value: 'youtube',   label: 'YouTube'     },
                            { value: 'x',         label: 'X / Twitter' },
                            { value: 'instagram', label: 'Instagram'   },
                            { value: 'discord',   label: 'Discord'     },
                            { value: 'tiktok',    label: 'TikTok'      },
                            { value: 'kick',      label: 'Kick'        },
                            { value: 'web',       label: 'Website'     },
                        ]}
                    />
                </Group>
            )}

            {/* ── Mood-ring: pick mood + auto-cycle ── */}
            {type === 'moodring' && (
                <>
                    <Group label="Mood">
                        {MOODS.map(m => (
                            <ToggleBtn
                                key={m.id}
                                active={(element.mood ?? 'chill') === m.id}
                                onClick={() => set('mood', m.id)}
                                title={m.label}
                            >
                                <span style={{ marginRight: 3 }}>{m.emoji}</span>{m.label}
                            </ToggleBtn>
                        ))}
                    </Group>
                    <Group label="Auto-cycle">
                        <ToggleBtn active={!!element.auto} onClick={() => set('auto', !element.auto)} title="Cycle moods automatically">
                            {element.auto ? 'On' : 'Off'}
                        </ToggleBtn>
                        {element.auto && (
                            <>
                                <NumberInput value={element.cycleSec ?? 20} onChange={v => set('cycleSec', Math.max(3, v))} min={3} max={600} style={{ width: 56 }} />
                                <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', fontFamily: 'monospace' }}>sec each</span>
                            </>
                        )}
                    </Group>
                    <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace', lineHeight: 1.4 }}>
                        Any Pet you place mirrors this mood.
                    </div>
                    <Divider />
                </>
            )}

            {/* ── Pet: pick a species; expression follows the mood-ring ── */}
            {type === 'pet' && (
                <>
                    <Group label="Pet">
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, width: '100%' }}>
                            {PETS.map(p => {
                                const active = (element.species ?? DEFAULT_PET) === p.id;
                                return (
                                    <button
                                        key={p.id}
                                        onClick={() => set('species', p.id)}
                                        title={p.label}
                                        style={{
                                            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                                            padding: '6px 2px 4px', cursor: 'pointer', borderRadius: 8,
                                            border: `1px solid ${active ? 'rgba(99,102,241,0.7)' : 'rgba(255,255,255,0.1)'}`,
                                            background: active ? 'rgba(99,102,241,0.18)' : 'rgba(255,255,255,0.04)',
                                        }}
                                    >
                                        <div style={{ width: 34, height: 34, pointerEvents: 'none' }}>
                                            <PetMascot species={p.id} mood={DEFAULT_MOOD} animate={false} />
                                        </div>
                                        <span style={{ fontSize: 8, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: 0.5, color: active ? '#a5b4fc' : 'rgba(255,255,255,0.45)' }}>
                                            {p.label}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </Group>
                    <Group label="Movement">
                        <ToggleBtn
                            active={!element.walk}
                            onClick={() => onChange({ walk: false })}
                            title="Pet stays put in its box"
                        >
                            Stay
                        </ToggleBtn>
                        <ToggleBtn
                            active={!!element.walk}
                            title="Pet roams a full-width floor lane"
                            onClick={() => onChange({
                                walk: true,
                                // Expand the box into a full-width lane so the pet has room to
                                // roam (the box clips, so a small box would hide the walking).
                                box: { x: 0, y: element.box?.y ?? 80, w: 100, h: element.box?.h ?? 16 },
                            })}
                        >
                            Walk
                        </ToggleBtn>
                    </Group>
                    {element.walk && (
                        <Group label="Speed">
                            {['slow', 'medium', 'fast'].map(s => (
                                <ToggleBtn key={s} active={(element.speed ?? 'medium') === s} onClick={() => set('speed', s)} title={`Walk ${s}`}>
                                    {s.charAt(0).toUpperCase() + s.slice(1)}
                                </ToggleBtn>
                            ))}
                        </Group>
                    )}
                    <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace', lineHeight: 1.4 }}>
                        {element.walk
                            ? 'The pet roams a full-width lane, walking, turning, and pausing. Drag the lane up/down to set the floor; resize its height to set the pet size.'
                            : "The pet's expression follows the Mood-ring. Add a Mood-ring element to control it; otherwise it stays chill. Resize via the box on canvas."}
                    </div>
                    <Divider />
                </>
            )}

            {/* ── Decision wheel: options + spin behaviour ── */}
            {type === 'wheel' && (
                <>
                    <Group label="Options">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 5, width: '100%' }}>
                            {(element.options ?? []).map((opt, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                    <TextInput
                                        value={opt}
                                        onChange={v => { const next = [...(element.options ?? [])]; next[i] = v; set('options', next); }}
                                        placeholder={`Option ${i + 1}`}
                                        style={{ width: 130 }}
                                    />
                                    <button
                                        onClick={() => set('options', (element.options ?? []).filter((_, j) => j !== i))}
                                        disabled={(element.options ?? []).length <= 2}
                                        title="Remove"
                                        style={{ background: 'none', border: '1px solid rgba(255,100,100,0.3)', borderRadius: 5, color: 'rgba(255,100,100,0.7)', fontSize: 11, padding: '3px 6px', display: 'flex', alignItems: 'center', cursor: (element.options ?? []).length <= 2 ? 'not-allowed' : 'pointer', opacity: (element.options ?? []).length <= 2 ? 0.4 : 1 }}
                                    >
                                        <X size={12} />
                                    </button>
                                </div>
                            ))}
                            <button
                                onClick={() => set('options', [...(element.options ?? []), `Option ${(element.options ?? []).length + 1}`])}
                                disabled={(element.options ?? []).length >= 8}
                                style={{ alignSelf: 'flex-start', background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 5, color: '#a5b4fc', fontSize: 11, padding: '4px 10px', fontFamily: 'inter, system-ui', cursor: (element.options ?? []).length >= 8 ? 'not-allowed' : 'pointer', opacity: (element.options ?? []).length >= 8 ? 0.4 : 1 }}
                            >
                                + Add option
                            </button>
                        </div>
                    </Group>
                    <Group label="Spin time">
                        <NumberInput value={element.spinSec ?? 4} onChange={v => set('spinSec', Math.max(1, Math.min(15, v)))} min={1} max={15} style={{ width: 52 }} />
                        <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', fontFamily: 'monospace' }}>sec</span>
                    </Group>
                    <ColorInput value={element.fontColor} onChange={v => set('fontColor', v)} label="Label color" />
                    <Group label="Auto-spin">
                        <ToggleBtn active={!!element.auto} onClick={() => set('auto', !element.auto)} title="Spin automatically">
                            {element.auto ? 'On' : 'Off'}
                        </ToggleBtn>
                        {element.auto && (
                            <>
                                <NumberInput value={element.cycleSec ?? 30} onChange={v => set('cycleSec', Math.max(5, v))} min={5} max={600} style={{ width: 56 }} />
                                <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', fontFamily: 'monospace' }}>sec each</span>
                            </>
                        )}
                    </Group>
                    <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace', lineHeight: 1.4 }}>
                        Click the wheel's centre to spin. 2–8 options.
                    </div>
                    <Divider />
                </>
            )}

            {/* ── Sticky note: text + paper ── */}
            {type === 'note' && (
                <>
                    <div style={{ width: '100%' }}>
                        <Label>Note</Label>
                        <TextArea value={element.content} onChange={v => set('content', v)} placeholder="Type your note…" rows={5} />
                    </div>
                    <Group label="Text size">
                        <NumberInput value={element.fontSize ?? 16} onChange={v => set('fontSize', Math.max(8, Math.min(48, v)))} min={8} max={48} style={{ width: 52 }} />
                        <ToggleBtn active={!!element.bold} onClick={() => set('bold', !element.bold)} title="Bold">B</ToggleBtn>
                    </Group>
                    <div style={{ width: '100%' }}>
                        <Label>Paper</Label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                            {NOTE_PAPERS.map(p => {
                                const active = (element.paperColor || '#fde68a').toLowerCase() === p.paper;
                                return (
                                    <button key={p.paper} onClick={() => onChange({ paperColor: p.paper, fontColor: p.ink })} title={p.label}
                                        style={{ width: 22, height: 22, borderRadius: 5, background: p.paper, cursor: 'pointer',
                                            border: active ? '2px solid #fff' : '2px solid rgba(255,255,255,0.2)',
                                            boxShadow: active ? '0 0 6px rgba(255,255,255,0.5)' : 'none', flexShrink: 0 }} />
                                );
                            })}
                            <ColorInput value={element.paperColor || '#fde68a'} onChange={v => set('paperColor', v)} />
                        </div>
                    </div>
                    <ColorInput value={element.fontColor || '#3a2f10'} onChange={v => set('fontColor', v)} label="Ink (text)" />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 120 }}>
                        <Slider label="Tilt" value={element.tilt ?? -3} onChange={v => set('tilt', v)} min={-12} max={12} step={1} displayValue={`${element.tilt ?? -3}°`} />
                    </div>
                    <Divider />
                </>
            )}

            {/* ── Pomodoro: work / break minutes ── */}
            {type === 'pomodoro' && (
                <Group label="Intervals">
                    <NumberInput value={element.workMin ?? 25} onChange={v => set('workMin', Math.max(1, v))} min={1} max={180} style={{ width: 52 }} />
                    <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', fontFamily: 'monospace' }}>focus</span>
                    <NumberInput value={element.breakMin ?? 5} onChange={v => set('breakMin', Math.max(1, v))} min={1} max={60} style={{ width: 52 }} />
                    <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', fontFamily: 'monospace' }}>break</span>
                </Group>
            )}

            {/* ── Goal bar / liquid goal: label, progress, fill colour ── */}
            {(type === 'goal' || type === 'liquidgoal') && (
                <>
                    <Group label="Label">
                        <TextInput value={element.content} onChange={v => set('content', v)} placeholder="Goal label" style={{ width: 150 }} />
                    </Group>
                    <Group label="Progress">
                        <NumberInput value={element.current} onChange={v => set('current', Math.max(0, v))} min={0} max={1000000} style={{ width: 64 }} />
                        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>/</span>
                        <NumberInput value={element.target} onChange={v => set('target', Math.max(1, v))} min={1} max={1000000} style={{ width: 64 }} />
                    </Group>
                    <Group label="Text size">
                        <NumberInput value={element.fontSize} onChange={v => set('fontSize', v)} min={8} max={48} />
                    </Group>
                    <ColorInput value={element.fontColor} onChange={v => set('fontColor', v)} label="Text color" />
                    <ColorInput
                        value={typeof element.fillColor === 'string' && element.fillColor.startsWith('@') ? '#6366f1' : element.fillColor}
                        onChange={v => set('fillColor', v)}
                        label="Bar color"
                    />
                    <Divider />
                </>
            )}

            {/* ── Match scoreboard: teams, flags, score, status ── */}
            {type === 'match' && (
                <>
                    {/* Match picker — search the feed and click one to fill + live-link */}
                    <Group label="Find match">
                        <TextInput value={matchQuery} onChange={setMatchQuery} placeholder="Search team (e.g. Brazil)…" style={{ width: 174 }} />
                    </Group>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3, width: '100%', maxHeight: 156, overflowY: 'auto' }}>
                        {!matchFeed && (
                            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace', padding: '2px 0' }}>Loading matches…</div>
                        )}
                        {matchFeed && (matchFeed.matches || [])
                            .slice()
                            .sort(matchSort)
                            .filter(m => {
                                const s = matchQuery.trim().toLowerCase();
                                return !s || m.home.name.toLowerCase().includes(s) || m.away.name.toLowerCase().includes(s) || (m.stage || '').toLowerCase().includes(s);
                            })
                            .slice(0, 40)
                            .map(m => {
                                const sel = String(element.matchId) === String(m.id);
                                const live = m.status === 'LIVE' || m.status === 'HT';
                                const right = m.status === 'SCHED' ? fmtKickoff(m.utcDate) : m.status === 'FT' ? 'FT' : m.status === 'HT' ? 'HT' : `${m.minute ?? 0}'`;
                                return (
                                    <button key={m.id} onClick={() => onChange({
                                        matchId: m.id,
                                        teamA: m.home.name, flagA: m.home.flag,
                                        teamB: m.away.name, flagB: m.away.flag,
                                        scoreA: m.score.home, scoreB: m.score.away,
                                        status: m.status, minute: m.minute ?? 0,
                                        kickoff: m.status === 'SCHED' ? fmtKickoff(m.utcDate) : '',
                                    })} style={{
                                        display: 'flex', alignItems: 'center', gap: 6, padding: '4px 7px', borderRadius: 6, cursor: 'pointer', textAlign: 'left', width: '100%', boxSizing: 'border-box',
                                        border: `1px solid ${sel ? 'rgba(34,197,94,0.6)' : 'rgba(255,255,255,0.1)'}`,
                                        background: sel ? 'rgba(34,197,94,0.14)' : 'rgba(255,255,255,0.04)',
                                    }}>
                                        <span style={{ flex: 1, fontSize: 11, color: '#fff', fontWeight: 600, fontFamily: 'monospace', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {m.home.name} {m.score.home}–{m.score.away} {m.away.name}
                                        </span>
                                        <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', flexShrink: 0, lineHeight: 1.25 }}>
                                            <span style={{ fontSize: 9, fontFamily: 'monospace', color: 'rgba(255,255,255,0.5)' }}>{fmtDay(m.utcDate)}</span>
                                            <span style={{ fontSize: 9, fontFamily: 'monospace', color: live ? '#ff7a7a' : 'rgba(255,255,255,0.45)' }}>{right}</span>
                                        </span>
                                    </button>
                                );
                            })}
                        {matchFeed && (matchFeed.matches || []).length === 0 && (
                            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace', padding: '2px 0' }}>
                                {matchFeed.error ? `Feed error: ${matchFeed.error}` : 'No matches available.'}
                            </div>
                        )}
                    </div>
                    {element.matchId && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 9, color: '#4ade80', fontFamily: 'monospace' }}>● Live-linked · auto-updates</span>
                            <ToggleBtn active={false} onClick={() => onChange({ matchId: null })} title="Unlink and edit by hand">Detach</ToggleBtn>
                        </div>
                    )}
                    {matchFeed && matchFeed.configured === false && (
                        <div style={{ fontSize: 9, color: 'rgba(250,204,21,0.85)', fontFamily: 'monospace', lineHeight: 1.4 }}>
                            Sample data. Set FOOTBALL_DATA_TOKEN for live World Cup matches.
                        </div>
                    )}
                    <Divider />

                    <Group label="Teams">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 5, width: '100%' }}>
                            <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                                <TextInput value={element.teamA} onChange={v => set('teamA', v)} placeholder="Home" style={{ width: 86 }} />
                                <TextInput value={element.flagA} onChange={v => set('flagA', v)} placeholder="br" style={{ width: 44 }} />
                                <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', fontFamily: 'monospace' }}>home</span>
                            </div>
                            <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                                <TextInput value={element.teamB} onChange={v => set('teamB', v)} placeholder="Away" style={{ width: 86 }} />
                                <TextInput value={element.flagB} onChange={v => set('flagB', v)} placeholder="ar" style={{ width: 44 }} />
                                <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', fontFamily: 'monospace' }}>away</span>
                            </div>
                        </div>
                    </Group>
                    <Group label="Score">
                        <NumberInput value={element.scoreA ?? 0} onChange={v => set('scoreA', Math.max(0, v))} min={0} max={99} style={{ width: 46 }} />
                        <ToggleBtn active={false} onClick={() => set('scoreA', Math.max(0, (element.scoreA ?? 0) + 1))} title="Home +1">+</ToggleBtn>
                        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>–</span>
                        <ToggleBtn active={false} onClick={() => set('scoreB', Math.max(0, (element.scoreB ?? 0) + 1))} title="Away +1">+</ToggleBtn>
                        <NumberInput value={element.scoreB ?? 0} onChange={v => set('scoreB', Math.max(0, v))} min={0} max={99} style={{ width: 46 }} />
                    </Group>
                    <Group label="Status">
                        {[['LIVE', 'Live'], ['HT', 'Half'], ['FT', 'Full'], ['SCHED', 'Soon']].map(([v, l]) => (
                            <ToggleBtn key={v} active={(element.status ?? 'LIVE') === v} onClick={() => set('status', v)} title={l}>{l}</ToggleBtn>
                        ))}
                    </Group>
                    {(element.status ?? 'LIVE') === 'LIVE' && (
                        <Group label="Minute">
                            <NumberInput value={element.minute ?? 0} onChange={v => set('minute', Math.max(0, Math.min(120, v)))} min={0} max={120} style={{ width: 52 }} />
                            <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', fontFamily: 'monospace' }}>of 90'</span>
                        </Group>
                    )}
                    {(element.status ?? 'LIVE') === 'SCHED' && (
                        <Group label="Kickoff">
                            <TextInput value={element.kickoff} onChange={v => set('kickoff', v)} placeholder="19:00" style={{ width: 90 }} />
                        </Group>
                    )}
                    <Group label="Scorers">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 5, width: '100%' }}>
                            <TextArea value={element.scorersHome} onChange={v => set('scorersHome', v)} rows={2} placeholder={`${element.teamA || 'Home'} — Ronaldo 23', 45', Fernandes 67'`} />
                            <TextArea value={element.scorersAway} onChange={v => set('scorersAway', v)} rows={2} placeholder={`${element.teamB || 'Away'} scorers`} />
                        </div>
                    </Group>
                    <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace', lineHeight: 1.4 }}>
                        Scorers are manual — the free feed has no goal data. Separate players with a comma; extra minutes after a name are that player's other goals (Ronaldo 23', 45').
                    </div>
                    {(() => {
                        // One goal per comma/newline token that contains a minute.
                        const goals = (s) => String(s || '').split(/[,\n]/).filter(t => /\d/.test(t)).length;
                        const gh = goals(element.scorersHome), ga = goals(element.scorersAway);
                        const sh = element.scoreA ?? 0, sa = element.scoreB ?? 0;
                        const miss = [];
                        if (gh !== sh) miss.push(`${element.teamA || 'Home'} ${gh}/${sh}`);
                        if (ga !== sa) miss.push(`${element.teamB || 'Away'} ${ga}/${sa}`);
                        return miss.length ? (
                            <div style={{ fontSize: 9.5, color: '#fbbf24', fontFamily: 'monospace', lineHeight: 1.4, background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.25)', borderRadius: 5, padding: '5px 8px' }}>
                                ⚠ Scorers don't match the score — {miss.join(', ')} goals listed. Add the rest, or they came from the live feed.
                            </div>
                        ) : null;
                    })()}
                    <Group label="Size">
                        <NumberInput value={element.fontSize ?? 30} onChange={v => set('fontSize', Math.max(14, Math.min(80, v)))} min={14} max={80} style={{ width: 52 }} />
                    </Group>
                    <ColorInput value={element.fontColor} onChange={v => set('fontColor', v)} label="Name color" />
                    <ColorInput
                        value={typeof element.fillColor === 'string' && element.fillColor.startsWith('@') ? '#facc15' : element.fillColor}
                        onChange={v => set('fillColor', v)}
                        label="Score color"
                    />
                    <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace', lineHeight: 1.4 }}>
                        Flag = 2-letter country code (br, ar, fr, de, gb-eng…). Tap + as goals go in.
                    </div>
                    <Divider />
                </>
            )}

            {/* Lower third sub-text */}
            {type === 'lowerthird' && (
                <Group label="Subtitle">
                    <TextInput
                        value={element.subContent}
                        onChange={v => set('subContent', v)}
                        placeholder="Role / subtitle"
                        style={{ width: 130 }}
                    />
                </Group>
            )}

            {isText && <Divider />}

            {/* ── Font controls ── */}
            {isText && (
                <>
                    <Group label="Size">
                        <NumberInput value={element.fontSize} onChange={v => set('fontSize', v)} min={8} max={120} />
                    </Group>

                    {type === 'lowerthird' && (
                        <Group label="Sub size">
                            <NumberInput value={element.subFontSize} onChange={v => set('subFontSize', v)} min={8} max={60} />
                        </Group>
                    )}

                    <ColorInput value={element.fontColor} onChange={v => set('fontColor', v)} label="Color" />

                    {type === 'lowerthird' && (
                        <ColorInput value={element.subFontColor} onChange={v => set('subFontColor', v)} label="Sub color" />
                    )}

                    <Group label="Style">
                        <ToggleBtn active={element.bold}   onClick={() => set('bold',   !element.bold)}   title="Bold">B</ToggleBtn>
                        <ToggleBtn active={element.italic} onClick={() => set('italic', !element.italic)} title="Italic"><em>I</em></ToggleBtn>
                    </Group>

                    <Group label="Align">
                        {['left', 'center', 'right'].map(a => (
                            <ToggleBtn key={a} active={element.align === a} onClick={() => set('align', a)} title={a}>
                                {a === 'left' ? '⬛▪▪' : a === 'center' ? '▪⬛▪' : '▪▪⬛'}
                            </ToggleBtn>
                        ))}
                    </Group>

                    <Divider />
                </>
            )}

            {/* ── Logo controls ── */}
            {type === 'logo' && (
                <>
                    <Group label="Image">
                        <button
                            onClick={() => fileRef.current?.click()}
                            style={{
                                background: 'rgba(99,102,241,0.15)',
                                border: '1px solid rgba(99,102,241,0.3)',
                                borderRadius: 5, color: '#a5b4fc',
                                fontSize: 11, padding: '4px 10px',
                                cursor: 'pointer',
                                fontFamily: 'inter, system-ui',
                            }}
                        >
                            {element.src ? <><RefreshCw size={11} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />Replace</> : <><Upload size={11} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />Upload</>}
                        </button>
                        <input ref={fileRef} type="file" accept="image/*" onChange={handleLogoUpload} style={{ display: 'none' }} />
                        {element.src && (
                            <button
                                onClick={() => onChange({ src: null })}
                                style={{ background: 'none', border: '1px solid rgba(255,100,100,0.3)', borderRadius: 5, color: 'rgba(255,100,100,0.7)', fontSize: 11, padding: '4px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                            >
                                <X size={12} />
                            </button>
                        )}
                    </Group>

                    <Group label="Fit">
                        <SelectInput
                            value={element.objectFit}
                            onChange={v => set('objectFit', v)}
                            options={[
                                { value: 'contain', label: 'Contain' },
                                { value: 'cover',   label: 'Cover'   },
                                { value: 'fill',    label: 'Stretch' },
                            ]}
                        />
                    </Group>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 120 }}>
                        <Slider
                            label="Trim (padding)"
                            value={element.imgPadding}
                            onChange={v => set('imgPadding', v)}
                            min={0} max={40} step={1}
                            displayValue={`${element.imgPadding ?? 0}px`}
                        />
                    </div>

                    <Divider />
                </>
            )}

            {/* ── Cam frame controls ── */}
            {type === 'frame' && (
                <>
                    <Group label="Frame style">
                        {['solid', 'glow', 'gradient', 'none'].map(s => (
                            <ToggleBtn key={s} active={(element.frameStyle ?? 'solid') === s} onClick={() => set('frameStyle', s)} title={s}>{s}</ToggleBtn>
                        ))}
                    </Group>
                    <Group label="Border width">
                        <NumberInput value={element.borderWidth} onChange={v => set('borderWidth', v)} min={1} max={24} style={{ width: 52 }} />
                    </Group>
                    <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace', lineHeight: 1.4 }}>
                        Frame colour follows the theme accent. Change it in the Theme panel.
                    </div>
                    <Divider />
                </>
            )}

            {/* ── Background ── */}
            {type !== 'divider' && type !== 'frame' && type !== 'wheel' && type !== 'note' && !isClipShape && !isMoodEl && (
                <>
                    <ColorInput value={element.bgColor} onChange={v => set('bgColor', v)} label="BG Color" />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 110 }}>
                        <Slider
                            label="BG Opacity"
                            value={element.bgOpacity}
                            onChange={v => set('bgOpacity', v)}
                        />
                    </div>
                    <Divider />
                </>
            )}

            {/* ── Divider / shape / clip-shape color ── */}
            {(type === 'divider' || type === 'shape' || isClipShape) && (
                <>
                    <ColorInput value={element.bgColor} onChange={v => set('bgColor', v)} label="Color" />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 110 }}>
                        <Slider label="Opacity" value={element.bgOpacity} onChange={v => set('bgOpacity', v)} />
                    </div>
                    <Divider />
                </>
            )}

            {/* ── Shared: border radius + element opacity ── */}
            {type !== 'divider' && type !== 'wheel' && type !== 'note' && !isClipShape && !isMoodEl && (
                <Group label="Radius">
                    <NumberInput value={element.borderRadius} onChange={v => set('borderRadius', v)} min={0} max={100} style={{ width: 52 }} />
                </Group>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 110 }}>
                <Slider label="Opacity" value={element.opacity} onChange={v => set('opacity', v)} />
            </div>

            <Divider />

            {/* ── Delete ── */}
            <button
                onClick={onDelete}
                style={{
                    background: 'rgba(239,68,68,0.1)',
                    border: '1px solid rgba(239,68,68,0.25)',
                    borderRadius: 7,
                    color: 'rgba(239,68,68,0.8)',
                    fontSize: 11,
                    padding: '6px 12px',
                    cursor: 'pointer',
                    fontFamily: 'inter, system-ui',
                    flexShrink: 0,
                    transition: 'all 0.12s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.25)'; e.currentTarget.style.color = '#ef4444'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; e.currentTarget.style.color = 'rgba(239,68,68,0.8)'; }}
            >
                Delete
            </button>
        </div>
    );
};

export default ElementEditor;
