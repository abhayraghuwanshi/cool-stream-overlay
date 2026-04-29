import { useEffect, useState } from 'react';

// Converts #rrggbb + alpha → rgba string
export const hexToRgba = (hex = '#000000', alpha = 1) => {
    const h = hex.replace('#', '');
    const r = parseInt(h.slice(0, 2), 16) || 0;
    const g = parseInt(h.slice(2, 4), 16) || 0;
    const b = parseInt(h.slice(4, 6), 16) || 0;
    return `rgba(${r},${g},${b},${alpha})`;
};

// Default values for each element type
export const defaultElement = (type) => {
    const base = {
        id: `el_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        type,
        hidden: false,
        box: { x: 35, y: 38, w: 30, h: 10 },
        opacity: 1,
        borderRadius: 0,
        bgColor: '#000000',
        bgOpacity: 0,
        // text
        content: 'New Title',
        subContent: 'Role / Subtitle',
        fontSize: 32,
        subFontSize: 13,
        fontColor: '#ffffff',
        subFontColor: '#aaaaaa',
        bold: true,
        italic: false,
        align: 'center',
        letterSpacing: 0,
        // logo
        src: null,
        objectFit: 'contain',
        imgPadding: 0,
    };

    const overrides = {
        text:       { content: 'Title Text', fontSize: 36, bold: true },
        lowerthird: {
            content: 'Your Name', subContent: 'Role / Subtitle',
            fontSize: 20, subFontSize: 13,
            bgColor: '#000000', bgOpacity: 0.75, borderRadius: 4,
            bold: true, align: 'left',
            box: { x: 2, y: 74, w: 38, h: 12 },
        },
        shape: {
            bgColor: '#4f46e5', bgOpacity: 0.85, borderRadius: 8,
            box: { x: 35, y: 35, w: 30, h: 20 },
        },
        divider: {
            bgColor: '#ffffff', bgOpacity: 0.25,
            box: { x: 15, y: 48, w: 70, h: 1.2 },
        },
        logo: {
            bgOpacity: 0, objectFit: 'contain', imgPadding: 8,
            box: { x: 38, y: 35, w: 24, h: 18 },
        },
        clock: {
            content: '', fontSize: 28, fontColor: '#ffffff',
            bold: false, align: 'center',
            box: { x: 38, y: 2, w: 24, h: 8 },
        },
    };

    return { ...base, ...(overrides[type] ?? {}) };
};

// ── Clock sub-component (self-updating) ────────────────────────────────────
const ClockElement = ({ element }) => {
    const [now, setNow] = useState(new Date());
    useEffect(() => {
        const t = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(t);
    }, []);

    const time = now.toLocaleTimeString('en-US', {
        hour: '2-digit', minute: '2-digit', second: '2-digit',
    });

    return (
        <span style={{
            fontSize: element.fontSize,
            color: element.fontColor,
            fontWeight: element.bold ? 'bold' : 'normal',
            fontFamily: 'monospace',
            textShadow: '0 2px 8px rgba(0,0,0,0.6)',
            letterSpacing: 2,
        }}>
            {time}
        </span>
    );
};

// ── Main renderer ──────────────────────────────────────────────────────────
const ElementRenderer = ({ element, onUploadLogo, editMode }) => {
    const {
        type, opacity = 1, borderRadius = 0,
        bgColor, bgOpacity = 0,
        content, subContent,
        fontSize, subFontSize,
        fontColor, subFontColor,
        bold, italic, align, letterSpacing = 0,
        src, objectFit = 'contain', imgPadding = 0,
    } = element;

    const bg = bgOpacity > 0 ? hexToRgba(bgColor, bgOpacity) : 'transparent';

    const outerStyle = {
        width: '100%', height: '100%',
        background: bg,
        borderRadius,
        overflow: 'hidden',
        opacity,
        boxSizing: 'border-box',
    };

    const textStyle = {
        fontSize,
        color: fontColor,
        fontWeight: bold ? 'bold' : 'normal',
        fontStyle: italic ? 'italic' : 'normal',
        textAlign: align,
        letterSpacing,
        lineHeight: 1.2,
        textShadow: bgOpacity > 0 ? 'none' : '0 2px 10px rgba(0,0,0,0.7)',
        fontFamily: 'inter, system-ui, sans-serif',
        wordBreak: 'break-word',
    };

    // ── Text ──
    if (type === 'text') {
        return (
            <div style={{ ...outerStyle, display: 'flex', alignItems: 'center', justifyContent: align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center', padding: '4px 12px' }}>
                <span style={{ ...textStyle, width: '100%' }}>{content || 'Title Text'}</span>
            </div>
        );
    }

    // ── Lower Third ──
    if (type === 'lowerthird') {
        return (
            <div style={{ ...outerStyle, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '6px 14px', gap: 2 }}>
                <div style={{ ...textStyle, marginBottom: 0 }}>{content || 'Your Name'}</div>
                <div style={{ fontSize: subFontSize, color: subFontColor, fontFamily: 'inter, system-ui', lineHeight: 1.2, letterSpacing: 0.5 }}>
                    {subContent || 'Role / Subtitle'}
                </div>
            </div>
        );
    }

    // ── Shape ──
    if (type === 'shape') {
        return <div style={outerStyle} />;
    }

    // ── Divider ──
    if (type === 'divider') {
        return (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center' }}>
                <div style={{
                    width: '100%',
                    height: Math.max(1, fontSize ? fontSize / 16 : 2),
                    background: bgOpacity > 0 ? hexToRgba(bgColor, bgOpacity) : hexToRgba(fontColor || '#ffffff', opacity),
                    borderRadius: 99,
                    opacity,
                }} />
            </div>
        );
    }

    // ── Logo / Image ──
    if (type === 'logo') {
        if (!src) {
            return (
                <div
                    onClick={editMode ? onUploadLogo : undefined}
                    style={{
                        ...outerStyle,
                        display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center',
                        background: editMode ? 'rgba(255,255,255,0.04)' : 'transparent',
                        border: editMode ? '1px dashed rgba(255,255,255,0.15)' : 'none',
                        cursor: editMode ? 'pointer' : 'default',
                        gap: 4,
                    }}
                >
                    {editMode && <>
                        <span style={{ fontSize: 20, opacity: 0.3 }}>⌼</span>
                        <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: 1 }}>
                            Click to upload
                        </span>
                    </>}
                </div>
            );
        }
        return (
            <div style={{ ...outerStyle, padding: imgPadding }}>
                <img
                    src={src}
                    alt="logo"
                    style={{ width: '100%', height: '100%', objectFit, display: 'block', borderRadius }}
                />
            </div>
        );
    }

    // ── Clock ──
    if (type === 'clock') {
        return (
            <div style={{ ...outerStyle, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ClockElement element={element} />
            </div>
        );
    }

    return null;
};

export default ElementRenderer;
