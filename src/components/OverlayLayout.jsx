import { AnimatePresence, memo, motion } from 'framer-motion';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BACKEND_HTTP, BACKEND_WS } from '../config.js';
import { useOBS } from '../context/OBSContext';
import useCapture, { formatElapsed } from '../hooks/useCapture';
import AICompanion from './AICompanion';
import BackgroundPanel, { bgToStyle } from './BackgroundPanel';
import CapturePanel from './CapturePanel';
import CurrentTask from './CurrentTask';
import DraggableBox from './DraggableBox';
import ElementEditor from './ElementEditor';
import ElementRenderer, { defaultElement } from './ElementRenderer';
import LayersPanel from './LayersPanel';
import SettingsModal from './SettingsModal';
import SocialFeed from './SocialFeed';
import VideoFeed from './VideoFeed';

const DEFAULT_BOXES = {
    faceCam: { x: 80, y: 0, w: 20, h: 20 },
    socialFeed: { x: 80, y: 20, w: 20, h: 18 },
    aiCompanion: { x: 80, y: 38, w: 20, h: 37 },
    handCam: { x: 80, y: 75, w: 10, h: 10 },
    roomCam: { x: 90, y: 75, w: 10, h: 10 },
    currentTask: { x: 0, y: 85, w: 80, h: 15 },
};

const DEFAULT_SCREEN_BOX = { x: 0, y: 0, w: 79, h: 84 };

// Memoised wrapper so the VideoFeed inside a screen-capture box doesn't
// re-render every time OverlayLayout re-renders (e.g. on box drag).
// The `sc` object reference is stable (same object from useCapture state).
const ScreenCaptureBox = memo(
    (props) => {
        if (!props || !props.sc) return null;
        const { sc, box, zIndex, selected, editMode, canvasRef, extraStyle,
            onBoxChange, onSelect, onLayerUp, onLayerDown } = props;
        const boxId = `screen_${sc.slot}`;
        return (
            <DraggableBox
                id={boxId} title={sc.label}
                box={box} zIndex={zIndex} selected={selected}
                onSelect={onSelect} onLayerUp={onLayerUp} onLayerDown={onLayerDown}
                onBoxChange={onBoxChange} editMode={editMode} canvasRef={canvasRef}
                extraStyle={extraStyle}
            >
                <VideoFeed stream={sc.stream} label={sc.label} muted />
            </DraggableBox>
        );
    },
    (prev, next) => {
        const pb = prev.box, nb = next.box;
        return (
            prev.sc === next.sc &&
            pb.x === nb.x && pb.y === nb.y && pb.w === nb.w && pb.h === nb.h &&
            prev.zIndex === next.zIndex &&
            prev.selected === next.selected &&
            prev.editMode === next.editMode &&
            prev.extraStyle === next.extraStyle
        );
    }
);

const DEFAULT_VISIBILITY = {
    faceCam: true,
    handCam: true,
    roomCam: true,
    socialFeed: true,
    aiCompanion: true,
    currentTask: true,
};

// Per-session ID to suppress WS echoes of our own updates.
const SESSION_ID = Math.random().toString(36).slice(2);

const OverlayLayout = () => {
    const { isRecording, isConnected } = useOBS();
    const canvasRef = useRef(null);

    // ── Boxes are separate state so dragging never re-renders the rest of the overlay ──
    const [boxes, setBoxes] = useState(DEFAULT_BOXES);
    const boxesRef = useRef(DEFAULT_BOXES);
    boxesRef.current = boxes;

    const [layoutSettings, setLayoutSettings] = useState({
        showFaceCam: true,
        showHandCam: true,
        showRoomCam: true,
        boxVisibility: DEFAULT_VISIBILITY,
        socialGithub: '/abhayraghuwanshi',
        socialTwitter: '@ab_nhi_hai',
        socialLinkedin: '/in/abhayraghuwanshi',
        useGPU: true,
        tasks: [{ id: 1, text: 'Refactoring Overlay', status: 'active' }],
        elements: [],
        background: { type: 'solid', color: '#0a0a0f' },
    });

    const [showSettings, setShowSettings] = useState(false);
    const [showBgPanel, setShowBgPanel] = useState(false);
    const [showCapturePanel, setShowCapturePanel] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [selectedBox, setSelectedBox] = useState(null);
    const [selectedElementId, setSelectedElementId] = useState(null);
    const [zOrder, setZOrder] = useState(Object.keys(DEFAULT_BOXES));

    const capture = useCapture({ isObsRecording: isRecording, boxes, canvasRef });
    const { streams, screens, addScreenCapture, removeScreenCapture, recording } = capture;

    // ── OBS recording — close edit panels ───────────────────────────────────────
    useEffect(() => {
        if (isRecording) {
            setEditMode(false);
            setSelectedBox(null);
            setSelectedElementId(null);
            setShowBgPanel(false);
            setShowCapturePanel(false);
        }
    }, [isRecording]);

    // ── In-app recording — close capture panel so overlay is clean ───────────
    useEffect(() => {
        if (recording?.active) setShowCapturePanel(false);
    }, [recording?.active]);

    // ── Canvas click — deselect ──────────────────────────────────────────────
    const onCanvasMouseDown = useCallback((e) => {
        if (e.target === e.currentTarget) {
            setSelectedBox(null);
            setSelectedElementId(null);
        }
    }, []);

    // ── Stable layout updater (non-box settings only) ───────────────────────
    const updateLayout = useCallback((updates) => {
        setLayoutSettings(s => ({ ...s, ...updates }));
        fetch(`${BACKEND_HTTP}/layout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...updates, _clientId: SESSION_ID }),
        }).catch(console.error);
    }, []);

    // ── Stable box updater — only updates boxes state, not layoutSettings ───
    const updateBox = useCallback((id, newBox) => {
        const updated = { ...boxesRef.current, [id]: newBox };
        boxesRef.current = updated;
        setBoxes(updated);
        fetch(`${BACKEND_HTTP}/layout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ boxes: updated, _clientId: SESSION_ID }),
        }).catch(console.error);
    }, []);

    const resetLayout = useCallback(() => {
        boxesRef.current = DEFAULT_BOXES;
        setBoxes(DEFAULT_BOXES);
        fetch(`${BACKEND_HTTP}/layout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ boxes: DEFAULT_BOXES, _clientId: SESSION_ID }),
        }).catch(console.error);
    }, []);

    // ── Element helpers ──────────────────────────────────────────────────────
    const addElement = useCallback((type) => {
        const el = defaultElement(type);
        setLayoutSettings(s => {
            const newElements = [...(s.elements ?? []), el];
            fetch(`${BACKEND_HTTP}/layout`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ elements: newElements, _clientId: SESSION_ID }),
            }).catch(console.error);
            return { ...s, elements: newElements };
        });
        setSelectedElementId(el.id);
    }, []);

    const updateElement = useCallback((id, changes) => {
        setLayoutSettings(s => {
            const newElements = (s.elements ?? []).map(el => el.id === id ? { ...el, ...changes } : el);
            fetch(`${BACKEND_HTTP}/layout`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ elements: newElements, _clientId: SESSION_ID }),
            }).catch(console.error);
            return { ...s, elements: newElements };
        });
    }, []);

    const deleteElement = useCallback((id) => {
        setLayoutSettings(s => {
            const newElements = (s.elements ?? []).filter(el => el.id !== id);
            fetch(`${BACKEND_HTTP}/layout`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ elements: newElements, _clientId: SESSION_ID }),
            }).catch(console.error);
            return { ...s, elements: newElements };
        });
        setSelectedElementId(null);
    }, []);

    const toggleElementVisibility = useCallback((id) => {
        setLayoutSettings(s => {
            const el = (s.elements ?? []).find(e => e.id === id);
            if (!el) return s;
            const newElements = (s.elements ?? []).map(e => e.id === id ? { ...e, hidden: !e.hidden } : e);
            return { ...s, elements: newElements };
        });
    }, []);

    const updateElementBox = useCallback((id, box) => updateElement(id, { box }), [updateElement]);

    // ── Sync zOrder when screens are added/removed ───────────────────────────
    useEffect(() => {
        setZOrder(prev => {
            const screenIds = screens.map(sc => `screen_${sc.slot}`);
            // Drop stale screen IDs; keep built-ins and still-active screens in place
            const filtered = prev.filter(id => !id.startsWith('screen_') || screenIds.includes(id));
            // Append any brand-new screen IDs at the top (highest z-index)
            const newIds = screenIds.filter(id => !prev.includes(id));
            return newIds.length === 0 && filtered.length === prev.length
                ? prev
                : [...filtered, ...newIds];
        });
    }, [screens]);

    // ── Box z-order ──────────────────────────────────────────────────────────
    const selectBox = useCallback((id) => {
        setSelectedBox(id);
        setZOrder(prev => [...prev.filter(x => x !== id), id]);
    }, []);

    const layerUp = useCallback((id) => {
        setZOrder(prev => {
            const i = prev.indexOf(id);
            if (i >= prev.length - 1) return prev;
            const next = [...prev];
            [next[i], next[i + 1]] = [next[i + 1], next[i]];
            return next;
        });
    }, []);

    const layerDown = useCallback((id) => {
        setZOrder(prev => {
            const i = prev.indexOf(id);
            if (i <= 0) return prev;
            const next = [...prev];
            [next[i], next[i - 1]] = [next[i - 1], next[i]];
            return next;
        });
    }, []);

    const getZIndex = useCallback((id) => zOrder.indexOf(id) + 10, [zOrder]);

    // ── Visibility helpers ───────────────────────────────────────────────────
    const getBoxVisible = useCallback((id) => {
        return (layoutSettings.boxVisibility ?? DEFAULT_VISIBILITY)[id] ?? true;
    }, [layoutSettings.boxVisibility]);

    const toggleBuiltinVisibility = useCallback((id) => {
        setLayoutSettings(s => {
            const bv = s.boxVisibility ?? DEFAULT_VISIBILITY;
            const updates = { boxVisibility: { ...bv, [id]: !(bv[id] ?? true) } };
            if (id === 'faceCam') updates.showFaceCam = !updates.boxVisibility[id];
            if (id === 'handCam') updates.showHandCam = !updates.boxVisibility[id];
            if (id === 'roomCam') updates.showRoomCam = !updates.boxVisibility[id];
            fetch(`${BACKEND_HTTP}/layout`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...updates, _clientId: SESSION_ID }),
            }).catch(console.error);
            return { ...s, ...updates };
        });
    }, []);

    // ── Backend sync ─────────────────────────────────────────────────────────
    useEffect(() => {
        let ws;
        let reconnectTimeout;
        let isMounted = true;

        const fetchLayout = () => {
            fetch(`${BACKEND_HTTP}/layout`)
                .then(res => res.json())
                .then(data => {
                    if (!isMounted) return;
                    // Boxes go into separate state
                    if (data.boxes) {
                        const newBoxes = { ...DEFAULT_BOXES, ...(data.boxes ?? {}) };
                        boxesRef.current = newBoxes;
                        setBoxes(newBoxes);
                    }
                    const { boxes: _b, ...rest } = data;
                    setLayoutSettings(s => ({
                        ...s,
                        ...rest,
                        boxVisibility: {
                            ...DEFAULT_VISIBILITY,
                            faceCam: data.showFaceCam ?? data.boxVisibility?.faceCam ?? true,
                            handCam: data.showHandCam ?? data.boxVisibility?.handCam ?? true,
                            roomCam: data.showRoomCam ?? data.boxVisibility?.roomCam ?? true,
                            ...(data.boxVisibility ?? {}),
                        },
                    }));
                })
                .catch(console.error);
        };

        const connectWs = () => {
            if (!isMounted) return;
            ws = new WebSocket(BACKEND_WS);
            ws.onopen = fetchLayout;
            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.type === 'layout-update') {
                        if (data._clientId === SESSION_ID) return; // skip our own echo
                        const { boxes: newBoxes, ...rest } = data.payload ?? {};
                        if (newBoxes) {
                            const merged = { ...DEFAULT_BOXES, ...newBoxes };
                            boxesRef.current = merged;
                            setBoxes(merged);
                        }
                        setLayoutSettings(s => ({
                            ...s,
                            ...rest,
                            ...(rest.boxes ? {} : {}), // boxes handled above
                        }));
                    }
                } catch (e) { }
            };
            ws.onclose = () => {
                if (!isMounted) return;
                reconnectTimeout = setTimeout(connectWs, 3000);
            };
        };
        connectWs();

        return () => {
            isMounted = false;
            clearTimeout(reconnectTimeout);
            if (ws) { ws.onclose = null; ws.close(); }
        };
    }, []);

    // ── Derived state ────────────────────────────────────────────────────────
    const {
        showFaceCam, showHandCam, showRoomCam,
        socialGithub, socialTwitter, socialLinkedin,
        useGPU, tasks = [], elements = [],
        background, boxVisibility = DEFAULT_VISIBILITY,
    } = layoutSettings;

    const selectedElement = elements.find(el => el.id === selectedElementId) ?? null;

    const shouldRenderBox = (id) => editMode || getBoxVisible(id);
    const hiddenOpacity = (id) => !getBoxVisible(id) ? { opacity: 0.25, pointerEvents: editMode ? 'auto' : 'none' } : undefined;

    // ── Stable callbacks for tasks ───────────────────────────────────────────
    const onTasksChange = useCallback((t) => updateLayout({ tasks: t }), [updateLayout]);

    // ── Memoised DraggableBox children — prevents re-renders on box drag ─────
    // Each child only re-creates when its own data changes (stream, social info, etc.)
    const faceCamChild = useMemo(() => <VideoFeed stream={streams.faceCam} label="CAM 01" />, [streams.faceCam]);
    const handCamChild = useMemo(() => <VideoFeed stream={streams.handCam} label="HAND" />, [streams.handCam]);
    const roomCamChild = useMemo(() => <VideoFeed stream={streams.roomCam} label="ROOM" />, [streams.roomCam]);
    const socialFeedChild = useMemo(() => (
        <div className="w-full h-full overflow-hidden">
            <SocialFeed github={socialGithub} twitter={socialTwitter} linkedin={socialLinkedin} />
        </div>
    ), [socialGithub, socialTwitter, socialLinkedin]);
    const aiCompanionChild = useMemo(() => (
        <div className="w-full h-full overflow-hidden"><AICompanion /></div>
    ), []);
    const currentTaskChild = useMemo(() => (
        <div className="w-full h-full bg-black/80 backdrop-blur-md border-t border-white/5 overflow-hidden">
            <CurrentTask tasks={tasks} onTasksChange={onTasksChange} />
        </div>
    ), [tasks, onTasksChange]);

    return (
        <div
            ref={canvasRef}
            onMouseDown={onCanvasMouseDown}
            className={`w-screen h-screen relative overflow-hidden font-inter ${isRecording ? 'border-[4px] border-red-500/50' : ''}`}
            style={{
                ...(!background || background.type === 'transparent'
                    ? editMode
                        ? {
                            backgroundImage: 'linear-gradient(45deg,#1a1a1a 25%,transparent 25%),linear-gradient(-45deg,#1a1a1a 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#1a1a1a 75%),linear-gradient(-45deg,transparent 75%,#1a1a1a 75%)',
                            backgroundSize: '20px 20px',
                            backgroundPosition: '0 0,0 10px,10px -10px,-10px 0px',
                            backgroundColor: '#111',
                        }
                        : {}
                    : bgToStyle(background)
                ),
            }}
        >
            {/* Recording flash */}
            {isRecording && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0, 0.2, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute inset-0 bg-red-500 pointer-events-none z-0"
                />
            )}

            {/* Edit mode grid */}
            {editMode && (
                <div
                    className="absolute inset-0 pointer-events-none z-0"
                    style={{
                        backgroundImage: 'linear-gradient(rgba(99,102,241,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(99,102,241,0.04) 1px,transparent 1px)',
                        backgroundSize: '5% 5%',
                    }}
                />
            )}

            {/* ── Panels ── */}
            <AnimatePresence>
                {editMode && (
                    <LayersPanel
                        key="layers"
                        boxVisibility={boxVisibility}
                        onToggleBuiltin={toggleBuiltinVisibility}
                        elements={elements}
                        selectedElementId={selectedElementId}
                        selectedBox={selectedBox}
                        onToggleElement={toggleElementVisibility}
                        onDeleteElement={deleteElement}
                        onSelectElement={(id) => { setSelectedElementId(id); setSelectedBox(null); }}
                        onSelectBox={selectBox}
                        onAddElement={addElement}
                        screens={screens}
                        onAddScreen={addScreenCapture}
                        onRemoveScreen={removeScreenCapture}
                        onOpenBackground={() => setShowBgPanel(v => !v)}
                        onResetLayout={resetLayout}
                    />
                )}
            </AnimatePresence>

            {editMode && showBgPanel && (
                <BackgroundPanel
                    bg={background}
                    onChange={(newBg) => updateLayout({ background: newBg })}
                    onClose={() => setShowBgPanel(false)}
                />
            )}

            <AnimatePresence>
                {showCapturePanel && (
                    <CapturePanel
                        capture={capture}
                        isObsRecording={isRecording}
                        onClose={() => setShowCapturePanel(false)}
                    />
                )}
            </AnimatePresence>

            {/* ── Custom elements ── */}
            {elements.map((el, i) => {
                if (!editMode && el.hidden) return null;
                return (
                    <DraggableBox
                        key={el.id}
                        id={el.id}
                        title={el.type.charAt(0).toUpperCase() + el.type.slice(1)}
                        box={el.box}
                        zIndex={100 + i + (selectedElementId === el.id ? 50 : 0)}
                        selected={selectedElementId === el.id}
                        onSelect={(id) => { setSelectedElementId(id); setSelectedBox(null); }}
                        onBoxChange={updateElementBox}
                        editMode={editMode}
                        canvasRef={canvasRef}
                        extraStyle={el.hidden ? { opacity: 0.25 } : undefined}
                    >
                        <ElementRenderer element={el} editMode={editMode} onUploadLogo={() => setSelectedElementId(el.id)} />
                    </DraggableBox>
                );
            })}

            {/* ── Screen Captures ── */}
            {screens.map(sc => {
                const boxId = `screen_${sc.slot}`;
                if (!editMode && !getBoxVisible(boxId)) return null;
                return (
                    <ScreenCaptureBox
                        key={boxId}
                        sc={sc}
                        box={boxes[boxId] ?? DEFAULT_SCREEN_BOX}
                        zIndex={getZIndex(boxId)}
                        selected={selectedBox === boxId}
                        onSelect={selectBox} onLayerUp={layerUp} onLayerDown={layerDown}
                        onBoxChange={updateBox} editMode={editMode} canvasRef={canvasRef}
                        extraStyle={hiddenOpacity(boxId)}
                    />
                );
            })}

            {/* ── Face Cam ── */}
            {shouldRenderBox('faceCam') && (
                <DraggableBox
                    id="faceCam" title="Face Cam"
                    box={boxes.faceCam} zIndex={getZIndex('faceCam')}
                    selected={selectedBox === 'faceCam'}
                    onSelect={selectBox} onLayerUp={layerUp} onLayerDown={layerDown}
                    onBoxChange={updateBox} editMode={editMode} canvasRef={canvasRef}
                    extraStyle={hiddenOpacity('faceCam')}
                >
                    {faceCamChild}
                </DraggableBox>
            )}

            {/* ── Social Feed ── */}
            {shouldRenderBox('socialFeed') && (
                <DraggableBox
                    id="socialFeed" title="Social Feed"
                    box={boxes.socialFeed} zIndex={getZIndex('socialFeed')}
                    selected={selectedBox === 'socialFeed'}
                    onSelect={selectBox} onLayerUp={layerUp} onLayerDown={layerDown}
                    onBoxChange={updateBox} editMode={editMode} canvasRef={canvasRef}
                    extraStyle={hiddenOpacity('socialFeed')}
                >
                    {socialFeedChild}
                </DraggableBox>
            )}

            {/* ── AI Companion ── */}
            {shouldRenderBox('aiCompanion') && (
                <DraggableBox
                    id="aiCompanion" title="AI Companion"
                    box={boxes.aiCompanion} zIndex={getZIndex('aiCompanion')}
                    selected={selectedBox === 'aiCompanion'}
                    onSelect={selectBox} onLayerUp={layerUp} onLayerDown={layerDown}
                    onBoxChange={updateBox} editMode={editMode} canvasRef={canvasRef}
                    extraStyle={hiddenOpacity('aiCompanion')}
                >
                    {aiCompanionChild}
                </DraggableBox>
            )}

            {/* ── Hand Cam ── */}
            {shouldRenderBox('handCam') && (
                <DraggableBox
                    id="handCam" title="Hand Cam"
                    box={boxes.handCam} zIndex={getZIndex('handCam')}
                    selected={selectedBox === 'handCam'}
                    onSelect={selectBox} onLayerUp={layerUp} onLayerDown={layerDown}
                    onBoxChange={updateBox} editMode={editMode} canvasRef={canvasRef}
                    extraStyle={hiddenOpacity('handCam')}
                >
                    {handCamChild}
                </DraggableBox>
            )}

            {/* ── Room Cam ── */}
            {shouldRenderBox('roomCam') && (
                <DraggableBox
                    id="roomCam" title="Room Cam"
                    box={boxes.roomCam} zIndex={getZIndex('roomCam')}
                    selected={selectedBox === 'roomCam'}
                    onSelect={selectBox} onLayerUp={layerUp} onLayerDown={layerDown}
                    onBoxChange={updateBox} editMode={editMode} canvasRef={canvasRef}
                    extraStyle={hiddenOpacity('roomCam')}
                >
                    {roomCamChild}
                </DraggableBox>
            )}

            {/* ── Current Task ── */}
            {shouldRenderBox('currentTask') && (
                <DraggableBox
                    id="currentTask" title="Current Task"
                    box={boxes.currentTask} zIndex={getZIndex('currentTask')}
                    selected={selectedBox === 'currentTask'}
                    onSelect={selectBox} onLayerUp={layerUp} onLayerDown={layerDown}
                    onBoxChange={updateBox} editMode={editMode} canvasRef={canvasRef}
                    extraStyle={hiddenOpacity('currentTask')}
                >
                    {currentTaskChild}
                </DraggableBox>
            )}

            {/* ── Top-right controls ── */}
            <div className="absolute top-4 right-4 flex items-center gap-2 z-50">

                {!isRecording && !recording?.active && (
                    <button
                        onClick={() => {
                            setEditMode(v => !v);
                            if (editMode) { setSelectedElementId(null); setShowBgPanel(false); setShowCapturePanel(false); }
                        }}
                        className={`px-3 py-1.5 rounded-full text-[10px] font-mono uppercase tracking-wider border transition-all ${editMode
                                ? 'bg-indigo-600/80 border-indigo-400/50 text-white shadow-lg shadow-indigo-500/20'
                                : 'bg-black/40 border-white/10 text-white/40 hover:text-white/70 hover:border-white/20'
                            }`}
                    >
                        {editMode ? '✓ Done' : 'Edit Layout'}
                    </button>
                )}

                {!isRecording && !recording?.active && (
                    <button
                        onClick={() => setShowCapturePanel(v => !v)}
                        className={`px-2.5 py-1 rounded-full text-[10px] font-mono uppercase tracking-wider border transition-all ${showCapturePanel
                                ? 'bg-violet-600/80 border-violet-400/50 text-white'
                                : 'bg-black/40 border-white/10 text-white/40 hover:text-white/70 hover:border-white/20'
                            }`}
                    >
                        Capture
                    </button>
                )}

                {/* In-app recording pill */}
                {!isRecording && recording?.active && (
                    <button
                        onClick={capture.stopRecording}
                        className="px-2.5 py-1 rounded-full text-[10px] font-mono uppercase tracking-wider border bg-red-900/60 border-red-500/40 text-red-300 animate-pulse"
                    >
                        ■ {formatElapsed(recording.elapsed)}
                    </button>
                )}
                {!isRecording && recording?.blob && !recording.active && (
                    <button
                        onClick={() => capture.downloadRecording(recording.blob)}
                        className="px-2.5 py-1 rounded-full text-[10px] font-mono uppercase tracking-wider border bg-emerald-900/60 border-emerald-500/40 text-emerald-300"
                    >
                        ↓ Save
                    </button>
                )}

                <button
                    onClick={() => setShowSettings(!showSettings)}
                    className="p-1.5 rounded-full bg-black/40 backdrop-blur border border-white/5 text-white/50 hover:text-white hover:bg-white/10 transition-colors"
                >
                    <SettingsIcon />
                </button>

                <AnimatePresence>
                    {showSettings && (
                        <SettingsModal
                            onClose={() => setShowSettings(false)}
                            showFaceCam={showFaceCam} setShowFaceCam={(v) => updateLayout({ showFaceCam: v, boxVisibility: { ...boxVisibility, faceCam: v } })}
                            showHandCam={showHandCam} setShowHandCam={(v) => updateLayout({ showHandCam: v, boxVisibility: { ...boxVisibility, handCam: v } })}
                            showRoomCam={showRoomCam} setShowRoomCam={(v) => updateLayout({ showRoomCam: v, boxVisibility: { ...boxVisibility, roomCam: v } })}
                            socialGithub={socialGithub} setSocialGithub={(v) => updateLayout({ socialGithub: v })}
                            socialTwitter={socialTwitter} setSocialTwitter={(v) => updateLayout({ socialTwitter: v })}
                            socialLinkedin={socialLinkedin} setSocialLinkedin={(v) => updateLayout({ socialLinkedin: v })}
                            useGPU={useGPU} setUseGPU={(v) => updateLayout({ useGPU: v })}
                        />
                    )}
                </AnimatePresence>

                <div className="flex items-center gap-2 bg-black/40 backdrop-blur px-3 py-1 rounded-full border border-white/5 pointer-events-none">
                    <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]' : 'bg-red-500'}`} />
                    <span className="text-[10px] font-mono text-white/50 tracking-wider">OBS {isConnected ? 'LINKED' : 'OFFLINE'}</span>
                </div>
            </div>

            {editMode && selectedElement && (
                <ElementEditor
                    element={selectedElement}
                    onChange={(changes) => updateElement(selectedElement.id, changes)}
                    onDelete={() => deleteElement(selectedElement.id)}
                />
            )}

            {editMode && !selectedElement && (
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-50 px-3 py-1.5 bg-black/60 border border-white/8 rounded-full backdrop-blur pointer-events-none">
                    <span className="text-[10px] font-mono text-white/30 tracking-wide">
                        Drag · Resize edges · Eye icon to hide · <strong className="text-white/50">+ Add Element</strong> in layers panel
                    </span>
                </div>
            )}
        </div>
    );
};

const SettingsIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.74v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
        <circle cx="12" cy="12" r="3" />
    </svg>
);

export default OverlayLayout;
