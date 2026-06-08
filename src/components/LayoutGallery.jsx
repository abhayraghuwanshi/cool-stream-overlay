import { motion } from 'framer-motion';
import { Check, Plus, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { bgToStyle } from './BackgroundPanel';

// Layouts gallery — each card is a LAYOUT (a "show": a named container of
// scenes). Switching a layout makes it active and loads its active scene.
// Thumbnails are lightweight wireframes of the layout's active scene, drawn
// from its percentage coordinates (no screenshotting).

const BOX_COLORS = {
    faceCam: '#8b5cf6', handCam: '#a78bfa', roomCam: '#c4b5fd',
    aiCompanion: '#10b981', currentTask: '#f59e0b',
};

const Thumb = ({ snapshot = {} }) => {
    const boxes = snapshot.boxes ?? {};
    const vis = snapshot.boxVisibility ?? {};
    const els = (snapshot.elements ?? []).filter(e => !e.hidden && e.box);
    const present = Object.entries(boxes).filter(([id]) => vis[id]);

    return (
        <div style={{
            position: 'relative', width: '100%', aspectRatio: '16 / 9', borderRadius: 8, overflow: 'hidden',
            border: '1px solid rgba(255,255,255,0.08)',
            background: '#0a0a14', // base so transparent layouts still read
            ...bgToStyle(snapshot.background),
        }}>
            {present.map(([id, b]) => {
                const c = BOX_COLORS[id] ?? '#64748b';
                return (
                    <div key={id} style={{
                        position: 'absolute', left: `${b.x}%`, top: `${b.y}%`, width: `${b.w}%`, height: `${b.h}%`,
                        background: `${c}26`, border: `1px solid ${c}cc`, borderRadius: 3,
                    }} />
                );
            })}
            {els.map((e) => (
                <div key={e.id} style={{
                    position: 'absolute', left: `${e.box.x}%`, top: `${e.box.y}%`, width: `${e.box.w}%`, height: `${e.box.h}%`,
                    background: 'rgba(236,72,153,0.16)', border: '1px solid rgba(236,72,153,0.7)', borderRadius: 2,
                }} />
            ))}
            {present.length === 0 && els.length === 0 && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.2)', fontSize: 9, fontFamily: 'monospace' }}>empty</div>
            )}
        </div>
    );
};

const GalleryBtn = ({ onClick, title, danger, children }) => (
    <button
        onClick={onClick}
        title={title}
        style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
            padding: '4px 8px', borderRadius: 6, cursor: 'pointer', flex: 1,
            fontSize: 9, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: 0.5,
            background: danger ? 'rgba(127,29,29,0.25)' : 'rgba(255,255,255,0.05)',
            border: `1px solid ${danger ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.1)'}`,
            color: danger ? '#fca5a5' : 'rgba(255,255,255,0.6)', transition: 'all 0.12s',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = danger ? 'rgba(127,29,29,0.45)' : 'rgba(255,255,255,0.1)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = danger ? 'rgba(127,29,29,0.25)' : 'rgba(255,255,255,0.05)'; }}
    >
        {children}
    </button>
);

const LayoutCard = ({ layout, active, onSwitch, onRename, onDelete }) => {
    const [editing, setEditing] = useState(false);
    const [name, setName] = useState(layout.name);
    const [confirmDel, setConfirmDel] = useState(false);

    const commitName = () => { onRename(layout.id, name); setEditing(false); };

    // Thumbnail = this layout's active scene (or first scene).
    const scenes = layout.scenes ?? [];
    const scene = scenes.find(s => s.id === layout.activeSceneId) ?? scenes[0];

    return (
        <div style={{
            display: 'flex', flexDirection: 'column', gap: 7, padding: 8, borderRadius: 10,
            background: active ? 'rgba(99,102,241,0.12)' : 'rgba(255,255,255,0.03)',
            border: `1px solid ${active ? 'rgba(99,102,241,0.5)' : 'rgba(255,255,255,0.07)'}`,
        }}>
            <div style={{ cursor: 'pointer', position: 'relative' }} onClick={() => onSwitch(layout.id)} title="Open this layout">
                <Thumb snapshot={scene?.snapshot} />
                {active && (
                    <span style={{ position: 'absolute', top: 5, right: 5, display: 'flex', alignItems: 'center', gap: 3, background: 'rgba(79,70,229,0.85)', borderRadius: 5, padding: '2px 6px', fontSize: 8, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: 0.5, color: '#fff' }}>
                        <Check size={9} /> Active
                    </span>
                )}
            </div>

            {editing ? (
                <input
                    autoFocus
                    value={name}
                    onChange={e => setName(e.target.value)}
                    onBlur={commitName}
                    onKeyDown={e => { if (e.key === 'Enter') commitName(); if (e.key === 'Escape') { setName(layout.name); setEditing(false); } }}
                    style={{
                        background: '#15152a', border: '1px solid rgba(99,102,241,0.4)', borderRadius: 5,
                        color: '#fff', fontSize: 11, padding: '3px 6px', outline: 'none', fontFamily: 'inter, system-ui',
                    }}
                />
            ) : (
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 6 }}>
                    <span
                        onClick={() => setEditing(true)}
                        title="Rename"
                        style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)', fontWeight: 600, cursor: 'text', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                    >
                        {layout.name}
                    </span>
                    <span style={{ fontSize: 8.5, color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace', flexShrink: 0 }}>
                        {scenes.length} {scenes.length === 1 ? 'scene' : 'scenes'}
                    </span>
                </div>
            )}

            <div style={{ display: 'flex', gap: 5 }}>
                <GalleryBtn onClick={() => onSwitch(layout.id)} title="Switch to this layout"><Check size={11} /> {active ? 'Reload' : 'Open'}</GalleryBtn>
                {confirmDel ? (
                    <GalleryBtn onClick={() => onDelete(layout.id)} title="Click to confirm delete" danger>Sure?</GalleryBtn>
                ) : (
                    <GalleryBtn onClick={() => setConfirmDel(true)} title="Delete layout" danger><Trash2 size={11} /></GalleryBtn>
                )}
            </div>
        </div>
    );
};

const LayoutGallery = ({ layouts = [], activeLayoutId, onClose, onCreate, onSwitch, onRename, onDelete }) => {
    const [newName, setNewName] = useState('');

    const create = () => { onCreate(newName); setNewName(''); };

    return (
        <div
            onClick={onClose}
            style={{
                position: 'fixed', inset: 0, zIndex: 1000,
                background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
            }}
        >
            <motion.div
                onClick={e => e.stopPropagation()}
                initial={{ opacity: 0, scale: 0.97, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.16 }}
                style={{
                    width: 'min(760px, 100%)', maxHeight: '88vh', display: 'flex', flexDirection: 'column',
                    background: 'rgba(12,12,22,0.98)', border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 14, boxShadow: '0 20px 70px rgba(0,0,0,0.7)', overflow: 'hidden',
                }}
            >
                {/* Header */}
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)',
                }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                        <span style={{ fontSize: 12, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: 2, color: 'rgba(255,255,255,0.7)' }}>
                            Layouts
                        </span>
                        <span style={{ fontSize: 10, fontFamily: 'monospace', color: 'rgba(255,255,255,0.3)' }}>
                            {layouts.length} {layouts.length === 1 ? 'show' : 'shows'}
                        </span>
                    </div>
                    <button onClick={onClose} title="Close" style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', display: 'flex', padding: 2 }}>
                        <X size={16} />
                    </button>
                </div>

                {/* New layout — snapshots the current canvas as its first scene */}
                <div style={{ display: 'flex', gap: 6, padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <input
                        value={newName}
                        onChange={e => setNewName(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') create(); }}
                        placeholder="New layout name (e.g. Valorant Stream)…"
                        style={{
                            flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: 7, color: '#fff', fontSize: 12, padding: '7px 10px', outline: 'none', fontFamily: 'inter, system-ui',
                        }}
                    />
                    <button
                        onClick={create}
                        title="Create a new layout from the current canvas"
                        style={{
                            display: 'flex', alignItems: 'center', gap: 5, padding: '0 14px', borderRadius: 7,
                            background: 'rgba(79,70,229,0.5)', border: '1px solid rgba(99,102,241,0.5)', color: '#fff',
                            fontSize: 10, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: 1, cursor: 'pointer', whiteSpace: 'nowrap',
                        }}
                    >
                        <Plus size={13} /> New layout
                    </button>
                </div>

                {/* Grid */}
                <div style={{ overflowY: 'auto', padding: 16 }}>
                    {layouts.length === 0 ? (
                        <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 12, fontFamily: 'monospace', lineHeight: 1.7, padding: '40px 20px' }}>
                            No layouts yet.<br />
                            Name one above and hit <span style={{ color: '#a5b4fc' }}>New layout</span> — it captures the current canvas as its first scene.
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 12 }}>
                            {layouts.map(l => (
                                <LayoutCard
                                    key={l.id}
                                    layout={l}
                                    active={l.id === activeLayoutId}
                                    onSwitch={onSwitch}
                                    onRename={onRename}
                                    onDelete={onDelete}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    );
};

export default LayoutGallery;
