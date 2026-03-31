import { useRef } from 'react';
import { hexToRgba } from './ElementRenderer';

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
    <div style={{ width: 1, height: 32, background: 'rgba(255,255,255,0.08)', flexShrink: 0 }} />
);

const Group = ({ label, children }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
        {label && <Label>{label}</Label>}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            {children}
        </div>
    </div>
);

// ── Main Editor ────────────────────────────────────────────────────────────

const ElementEditor = ({ element, onChange, onDelete }) => {
    const fileRef = useRef(null);
    if (!element) return null;

    const set = (key, val) => onChange({ [key]: val });
    const { type } = element;
    const isText = ['text', 'lowerthird', 'clock'].includes(type);

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
                position: 'absolute',
                bottom: 8, left: '50%',
                transform: 'translateX(-50%)',
                background: 'rgba(7,7,16,0.94)',
                backdropFilter: 'blur(16px)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 12,
                zIndex: 300,
                padding: '10px 14px',
                display: 'flex',
                alignItems: 'flex-end',
                gap: 12,
                boxShadow: '0 -4px 32px rgba(0,0,0,0.5)',
                maxWidth: 'calc(100vw - 32px)',
                overflowX: 'auto',
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
            {isText && type !== 'clock' && (
                <Group label="Content">
                    <TextInput
                        value={element.content}
                        onChange={v => set('content', v)}
                        placeholder="Enter text..."
                        style={{ width: 160 }}
                    />
                </Group>
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
                            {element.src ? '↺ Replace' : '⬆ Upload'}
                        </button>
                        <input ref={fileRef} type="file" accept="image/*" onChange={handleLogoUpload} style={{ display: 'none' }} />
                        {element.src && (
                            <button
                                onClick={() => onChange({ src: null })}
                                style={{ background: 'none', border: '1px solid rgba(255,100,100,0.3)', borderRadius: 5, color: 'rgba(255,100,100,0.7)', fontSize: 11, padding: '4px 8px', cursor: 'pointer' }}
                            >
                                ✕
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

            {/* ── Background ── */}
            {type !== 'divider' && (
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

            {/* ── Divider / shape color ── */}
            {(type === 'divider' || type === 'shape') && (
                <>
                    <ColorInput value={element.bgColor} onChange={v => set('bgColor', v)} label="Color" />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 110 }}>
                        <Slider label="Opacity" value={element.bgOpacity} onChange={v => set('bgOpacity', v)} />
                    </div>
                    <Divider />
                </>
            )}

            {/* ── Shared: border radius + element opacity ── */}
            {type !== 'divider' && (
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
