const ITEMS = [
    {
        type: 'text',
        label: 'Title Text',
        icon: 'T',
        preview: (
            <div style={{ fontSize: 14, fontWeight: 'bold', color: '#fff', textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>
                Title
            </div>
        ),
    },
    {
        type: 'lowerthird',
        label: 'Lower Third',
        icon: '▬',
        preview: (
            <div style={{ background: 'rgba(0,0,0,0.75)', padding: '3px 6px', borderRadius: 2, lineHeight: 1.3 }}>
                <div style={{ fontSize: 10, color: '#fff', fontWeight: 'bold' }}>Your Name</div>
                <div style={{ fontSize: 8,  color: '#aaa' }}>Role</div>
            </div>
        ),
    },
    {
        type: 'logo',
        label: 'Logo / Image',
        icon: '⌼',
        preview: (
            <div style={{ width: 36, height: 28, border: '1px dashed rgba(255,255,255,0.2)', borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 16, opacity: 0.3 }}>⌼</span>
            </div>
        ),
    },
    {
        type: 'shape',
        label: 'Shape',
        icon: '■',
        preview: (
            <div style={{ width: 40, height: 24, background: 'rgba(79,70,229,0.8)', borderRadius: 4 }} />
        ),
    },
    {
        type: 'divider',
        label: 'Divider',
        icon: '─',
        preview: (
            <div style={{ width: 44, height: 2, background: 'rgba(255,255,255,0.3)', borderRadius: 1 }} />
        ),
    },
    {
        type: 'clock',
        label: 'Clock',
        icon: '◷',
        preview: (
            <div style={{ fontSize: 10, fontFamily: 'monospace', color: '#fff', letterSpacing: 1 }}>
                12:00:00
            </div>
        ),
    },
];

const ElementLibrary = ({ onAdd, onClose }) => (
    <div
        style={{
            position: 'absolute',
            left: 8, top: 56,
            width: 176,
            background: 'rgba(9,9,18,0.92)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 10,
            zIndex: 200,
            overflow: 'hidden',
            boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
        }}
    >
        {/* Header */}
        <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 12px 8px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}>
            <span style={{ fontSize: 10, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: 2, color: 'rgba(255,255,255,0.5)' }}>
                Elements
            </span>
            <button
                onClick={onClose}
                style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: 14, lineHeight: 1, padding: 0 }}
            >
                ×
            </button>
        </div>

        {/* Items */}
        <div style={{ padding: '8px 8px' }}>
            {ITEMS.map(item => (
                <button
                    key={item.type}
                    onClick={() => onAdd(item.type)}
                    style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        width: '100%', padding: '8px 8px',
                        background: 'none', border: 'none', borderRadius: 7,
                        cursor: 'pointer', textAlign: 'left',
                        transition: 'background 0.12s',
                        marginBottom: 2,
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.07)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}
                >
                    {/* Mini preview */}
                    <div style={{
                        width: 52, height: 34,
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.06)',
                        borderRadius: 5,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                        overflow: 'hidden',
                    }}>
                        {item.preview}
                    </div>
                    {/* Label */}
                    <div>
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.85)', fontFamily: 'inter, system-ui', fontWeight: 500 }}>
                            {item.label}
                        </div>
                    </div>
                </button>
            ))}
        </div>

        <div style={{ padding: '6px 12px 10px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', fontFamily: 'monospace' }}>
                Click to add · drag to place
            </span>
        </div>
    </div>
);

export default ElementLibrary;
