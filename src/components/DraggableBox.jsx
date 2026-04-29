import { memo, useRef, useState } from 'react';

const MIN_W_PCT = 4;
const MIN_H_PCT = 3;
const DRAG_THRESHOLD = 5; // Minimum px of movement before a mousedown counts as a drag

const RESIZE_HANDLES = [
    { id: 'n',  style: { top: 0,    left: '50%', transform: 'translateX(-50%)', cursor: 'n-resize', width: 40, height: 8  } },
    { id: 's',  style: { bottom: 0, left: '50%', transform: 'translateX(-50%)', cursor: 's-resize', width: 40, height: 8  } },
    { id: 'e',  style: { right: 0,  top: '50%',  transform: 'translateY(-50%)', cursor: 'e-resize', width: 8,  height: 40 } },
    { id: 'w',  style: { left: 0,   top: '50%',  transform: 'translateY(-50%)', cursor: 'w-resize', width: 8,  height: 40 } },
    { id: 'ne', style: { top: 0,    right: 0,    cursor: 'ne-resize', width: 14, height: 14 } },
    { id: 'nw', style: { top: 0,    left: 0,     cursor: 'nw-resize', width: 14, height: 14 } },
    { id: 'se', style: { bottom: 0, right: 0,    cursor: 'se-resize', width: 14, height: 14 } },
    { id: 'sw', style: { bottom: 0, left: 0,     cursor: 'sw-resize', width: 14, height: 14 } },
];

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// Module-level flag — shared across all DraggableBox instances.
// While any box is being dragged or resized, suppress hover-state changes
// so other boxes don't re-render as the mouse passes over them.
let anyDragging = false;

const DraggableBox = ({
    id, title, box, zIndex,
    onBoxChange, onSelect, onLayerUp, onLayerDown,
    editMode, selected,
    canvasRef, children, extraStyle,
}) => {
    const elRef   = useRef(null);
    const boxRef  = useRef(box);
    boxRef.current = box;

    // Tracks whether the current press turned into a drag/resize.
    // onClick fires after mouseup — if didDrag is true, it's not a plain click so skip selection.
    const didDrag = useRef(false);

    const [hovered, setHovered] = useState(false);

    // ── Root click — select only on plain clicks, not after drag/resize ──────
    const onRootMouseDown = () => {
        didDrag.current = false; // reset on every new press
    };

    const onRootClick = () => {
        if (!didDrag.current) onSelect?.(id);
    };

    // ── Drag ──────────────────────────────────────────────────────────────────
    const onDragMouseDown = (e) => {
        if (!editMode) return;
        e.preventDefault();
        e.stopPropagation(); // prevent bubbling to root onMouseDown

        // Always reset here — stopPropagation means root onMouseDown won't run,
        // so this is the only place that resets it when the handle is clicked.
        didDrag.current = false;
        anyDragging = true;
        setHovered(false); // clear local hover so outline resets cleanly

        const canvas = canvasRef.current;
        if (!canvas) return;
        const { offsetWidth: W, offsetHeight: H } = canvas;
        const el = elRef.current;
        const b  = boxRef.current;

        const startMouseX = e.clientX;
        const startMouseY = e.clientY;
        const startLeft   = (b.x / 100) * W;
        const startTop    = (b.y / 100) * H;

        const onMove = (ev) => {
            const dx = ev.clientX - startMouseX;
            const dy = ev.clientY - startMouseY;
            // Only start dragging after the mouse moves beyond the dead-zone
            if (!didDrag.current && Math.abs(dx) < DRAG_THRESHOLD && Math.abs(dy) < DRAG_THRESHOLD) return;
            didDrag.current = true;
            el.style.left = `${clamp(startLeft + dx, 0, W - el.offsetWidth)}px`;
            el.style.top  = `${clamp(startTop  + dy, 0, H - el.offsetHeight)}px`;
        };

        const onUp = (ev) => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup',   onUp);
            anyDragging = false;
            if (didDrag.current) {
                const dx = ev.clientX - startMouseX;
                const dy = ev.clientY - startMouseY;
                const newLeft = clamp(startLeft + dx, 0, W - el.offsetWidth);
                const newTop  = clamp(startTop  + dy, 0, H - el.offsetHeight);
                onBoxChange(id, { ...boxRef.current, x: (newLeft / W) * 100, y: (newTop / H) * 100 });
            }
        };

        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup',   onUp);
    };

    // ── Resize ────────────────────────────────────────────────────────────────
    const onResizeMouseDown = (e, dir) => {
        e.preventDefault();
        e.stopPropagation();

        didDrag.current = false;
        anyDragging = true;

        const canvas = canvasRef.current;
        if (!canvas) return;
        const { offsetWidth: W, offsetHeight: H } = canvas;
        const el = elRef.current;
        const b  = boxRef.current;

        const left   = (b.x / 100) * W;
        const top    = (b.y / 100) * H;
        const width  = (b.w / 100) * W;
        const height = (b.h / 100) * H;
        const startMouseX = e.clientX;
        const startMouseY = e.clientY;
        const minW = (MIN_W_PCT / 100) * W;
        const minH = (MIN_H_PCT / 100) * H;

        const onMove = (ev) => {
            const dx = ev.clientX - startMouseX;
            const dy = ev.clientY - startMouseY;
            // Only start resizing after the mouse moves beyond the dead-zone
            if (!didDrag.current && Math.abs(dx) < DRAG_THRESHOLD && Math.abs(dy) < DRAG_THRESHOLD) return;
            didDrag.current = true;
            let nL = left, nT = top, nW = width, nH = height;
            if (dir.includes('e')) nW = Math.max(minW, width  + dx);
            if (dir.includes('s')) nH = Math.max(minH, height + dy);
            if (dir.includes('w')) { nW = Math.max(minW, width  - dx); nL = left + width  - nW; }
            if (dir.includes('n')) { nH = Math.max(minH, height - dy); nT = top  + height - nH; }
            el.style.left   = `${nL}px`;
            el.style.top    = `${nT}px`;
            el.style.width  = `${nW}px`;
            el.style.height = `${nH}px`;
        };

        const onUp = () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup',   onUp);
            anyDragging = false;
            if (didDrag.current) {
                const rect  = el.getBoundingClientRect();
                const pRect = canvas.getBoundingClientRect();
                onBoxChange(id, {
                    x: ((rect.left - pRect.left) / W) * 100,
                    y: ((rect.top  - pRect.top)  / H) * 100,
                    w: (rect.width  / W) * 100,
                    h: (rect.height / H) * 100,
                });
            }
        };

        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup',   onUp);
    };

    // ── Outline color ─────────────────────────────────────────────────────────
    const outlineColor = editMode
        ? selected
            ? 'rgba(99,102,241,0.9)'
            : hovered
                ? 'rgba(99,102,241,0.4)'
                : 'rgba(99,102,241,0.2)'
        : 'none';

    return (
        <div
            ref={elRef}
            onMouseDown={onRootMouseDown}
            onClick={onRootClick}
            onMouseEnter={() => { if (!anyDragging) setHovered(true);  }}
            onMouseLeave={() => { if (!anyDragging) setHovered(false); }}
            style={{
                position: 'absolute',
                left:     `${box.x}%`,
                top:      `${box.y}%`,
                width:    `${box.w}%`,
                height:   `${box.h}%`,
                overflow:     'hidden',
                boxSizing:    'border-box',
                outline:      `1px solid ${outlineColor}`,
                borderRadius: 4,
                zIndex,
                transition:   'outline-color 0.12s, opacity 0.15s',
                ...extraStyle,
            }}
        >
            {/* ── Drag handle — overlays top of content, never shifts it ── */}
            {editMode && (
                <div
                    onMouseDown={onDragMouseDown}
                    style={{
                        position: 'absolute',
                        top: 0, left: 0, right: 0,
                        height: 20,
                        zIndex: 31,
                        cursor: 'move',
                        background: selected ? 'rgba(24,22,64,0.92)' : 'rgba(6,6,18,0.76)',
                        borderBottom: '1px solid rgba(99,102,241,0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0 5px 0 6px',
                        userSelect: 'none',
                        backdropFilter: 'blur(8px)',
                    }}
                >
                    <span style={{
                        fontSize: 8, fontFamily: 'monospace',
                        textTransform: 'uppercase', letterSpacing: 2,
                        color: selected ? '#a5b4fc' : 'rgba(165,180,252,0.42)',
                        lineHeight: 1,
                    }}>
                        {title}
                    </span>
                    {selected && (
                        <span style={{ display: 'flex', gap: 2 }}>
                            <LayerBtn onClick={(e) => { e.stopPropagation(); onLayerUp?.(id); }} title="Bring forward">▲</LayerBtn>
                            <LayerBtn onClick={(e) => { e.stopPropagation(); onLayerDown?.(id); }} title="Send backward">▼</LayerBtn>
                        </span>
                    )}
                </div>
            )}

            {/* ── Hover label (non-edit mode) ── */}
            {!editMode && hovered && (
                <div style={{
                    position: 'absolute', top: 4, left: 4,
                    background: 'rgba(0,0,0,0.6)',
                    backdropFilter: 'blur(4px)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 99,
                    padding: '2px 8px',
                    fontSize: 9, fontFamily: 'monospace',
                    textTransform: 'uppercase', letterSpacing: 2,
                    color: 'rgba(255,255,255,0.5)',
                    pointerEvents: 'none',
                    zIndex: 31,
                }}>
                    {title}
                </div>
            )}

            {/* ── Content — always full height ── */}
            <div style={{ width: '100%', height: '100%', overflow: 'hidden' }}>
                {children}
            </div>

            {/* ── Resize handles (edit mode only) ── */}
            {editMode && RESIZE_HANDLES.map(h => (
                <div
                    key={h.id}
                    onMouseDown={(e) => onResizeMouseDown(e, h.id)}
                    style={{
                        position: 'absolute',
                        ...h.style,
                        zIndex: 32,
                        background: h.id.length === 2
                            ? selected ? 'rgba(99,102,241,0.85)' : 'rgba(99,102,241,0.45)'
                            : selected ? 'rgba(99,102,241,0.25)' : 'rgba(99,102,241,0.1)',
                        borderRadius: h.id.length === 2 ? 2 : 0,
                    }}
                />
            ))}
        </div>
    );
};

const LayerBtn = ({ onClick, title, children }) => (
    <button
        onClick={onClick}
        title={title}
        style={{
            background:   'rgba(99,102,241,0.2)',
            border:       '1px solid rgba(99,102,241,0.3)',
            borderRadius: 3,
            color:        '#a5b4fc',
            fontSize:     9,
            lineHeight:   1,
            padding:      '2px 4px',
            cursor:       'pointer',
        }}
    >
        {children}
    </button>
);

// Only re-render when the box position/size, selection, editMode, or children change.
// Callbacks (onBoxChange, onSelect, etc.) must be stable (useCallback) in the parent.
export default memo(DraggableBox, (prev, next) => {
    const pb = prev.box, nb = next.box;
    return (
        pb.x === nb.x && pb.y === nb.y && pb.w === nb.w && pb.h === nb.h &&
        prev.zIndex    === next.zIndex    &&
        prev.selected  === next.selected  &&
        prev.editMode  === next.editMode  &&
        prev.children  === next.children  &&
        // extraStyle: both undefined, or same opacity/pointerEvents
        prev.extraStyle === next.extraStyle
    );
});
