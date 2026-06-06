import { motion } from 'framer-motion';
import { Check, Circle, RotateCcw } from 'lucide-react';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BACKEND_HTTP, BACKEND_WS } from '../config.js';
import { useOBS } from '../context/OBSContext';
import useCapture from '../hooks/useCapture';
import AICompanion from './AICompanion';
import BackgroundPanel, { bgToStyle } from './BackgroundPanel';
import CurrentTask from './CurrentTask';
import DraggableBox from './DraggableBox';
import ElementEditor from './ElementEditor';
import ElementRenderer, { defaultElement } from './ElementRenderer';
import LayersPanel from './LayersPanel';
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

const elementTitle = (type) => type.charAt(0).toUpperCase() + type.slice(1);

const ElementBox = memo(
    ({
        element, zIndex, selected, editMode, canvasRef, extraStyle,
        onSelect, onBoxChange, onUploadLogo,
    }) => {
        const handleUploadLogo = useCallback(() => onUploadLogo(element.id), [element.id, onUploadLogo]);

        return (
            <DraggableBox
                id={element.id}
                title={elementTitle(element.type)}
                box={element.box}
                zIndex={zIndex}
                selected={selected}
                onSelect={onSelect}
                onBoxChange={onBoxChange}
                editMode={editMode}
                canvasRef={canvasRef}
                extraStyle={extraStyle}
            >
                <ElementRenderer element={element} editMode={editMode} onUploadLogo={handleUploadLogo} />
            </DraggableBox>
        );
    },
    (prev, next) => (
        prev.element === next.element &&
        prev.zIndex === next.zIndex &&
        prev.selected === next.selected &&
        prev.editMode === next.editMode &&
        prev.canvasRef === next.canvasRef &&
        prev.extraStyle === next.extraStyle &&
        prev.onSelect === next.onSelect &&
        prev.onBoxChange === next.onBoxChange &&
        prev.onUploadLogo === next.onUploadLogo
    )
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

    const [showBgPanel, setShowBgPanel] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [selectedBox, setSelectedBox] = useState(null);
    const [selectedElementId, setSelectedElementId] = useState(null);
    const [zOrder, setZOrder] = useState(Object.keys(DEFAULT_BOXES));

    const capture = useCapture();
    const { streams } = capture;

    // ── OBS recording — close edit panels ───────────────────────────────────────
    useEffect(() => {
        if (isRecording) {
            setEditMode(false);
            setSelectedBox(null);
            setSelectedElementId(null);
            setShowBgPanel(false);
        }
    }, [isRecording]);

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

    // ── Scenes ───────────────────────────────────────────────────────────────
    // A scene snapshot = { boxes, boxVisibility, elements, background, zOrder }.
    // Applying replaces the whole visual layout in one shot (and persists it).
    // Camera device streams are untouched — a scene only positions/shows boxes.
    const applyScene = useCallback((snapshot = {}) => {
        const nBoxes = { ...DEFAULT_BOXES, ...(snapshot.boxes ?? {}) };
        const nVis   = { ...DEFAULT_VISIBILITY, ...(snapshot.boxVisibility ?? {}) };
        const nEls   = snapshot.elements ?? [];
        const nBg    = snapshot.background ?? { type: 'solid', color: '#0a0a0f' };
        const nZ     = snapshot.zOrder ?? Object.keys(DEFAULT_BOXES);

        boxesRef.current = nBoxes;
        setBoxes(nBoxes);
        setZOrder(nZ);
        setSelectedBox(null);
        setSelectedElementId(null);
        setLayoutSettings(s => ({
            ...s,
            elements: nEls,
            background: nBg,
            boxVisibility: nVis,
            showFaceCam: nVis.faceCam,
            showHandCam: nVis.handCam,
            showRoomCam: nVis.roomCam,
        }));
        fetch(`${BACKEND_HTTP}/layout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                boxes: nBoxes, elements: nEls, background: nBg, boxVisibility: nVis,
                showFaceCam: nVis.faceCam, showHandCam: nVis.handCam, showRoomCam: nVis.roomCam,
                _clientId: SESSION_ID,
            }),
        }).catch(console.error);
    }, []);

    const saveScene = useCallback((name) => {
        const snapshot = {
            boxes: boxesRef.current,
            boxVisibility: layoutSettings.boxVisibility ?? DEFAULT_VISIBILITY,
            elements: layoutSettings.elements ?? [],
            background: layoutSettings.background,
            zOrder,
        };
        const scenes = layoutSettings.scenes ?? [];
        const scene = {
            id: `scene_${Date.now()}`,
            name: (name || '').trim() || `Scene ${scenes.length + 1}`,
            snapshot,
        };
        updateLayout({ scenes: [...scenes, scene] });
    }, [zOrder, layoutSettings.boxVisibility, layoutSettings.elements, layoutSettings.background, layoutSettings.scenes, updateLayout]);

    const deleteScene = useCallback((id) => {
        updateLayout({ scenes: (layoutSettings.scenes ?? []).filter(s => s.id !== id) });
    }, [layoutSettings.scenes, updateLayout]);

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

    const selectElement = useCallback((id) => {
        setSelectedElementId(id);
        setSelectedBox(null);
    }, []);

    const onUploadLogo = useCallback((id) => {
        setSelectedElementId(id);
    }, []);

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

    const shouldRenderBox = (id) => getBoxVisible(id);

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

    // In edit mode the canvas is a 16:9 preview inside the editor shell.
    // In live mode the canvas is position:absolute filling the viewport.
    // canvasRef always points to the same DOM node so video streams survive the toggle.
    const inEditor = editMode && !isRecording;
    const canvasBg = (!background || background.type === 'transparent')
        ? (inEditor ? {
            backgroundImage: 'linear-gradient(45deg,#1a1a1a 25%,transparent 25%),linear-gradient(-45deg,#1a1a1a 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#1a1a1a 75%),linear-gradient(-45deg,transparent 75%,#1a1a1a 75%)',
            backgroundSize: '20px 20px', backgroundPosition: '0 0,0 10px,10px -10px,-10px 0px', backgroundColor: '#111',
          } : {})
        : bgToStyle(background);
    const editorWorkspaceBg = inEditor && background && background.type !== 'transparent'
        ? bgToStyle(background)
        : { background: '#050510' };
    const activeCanvasBg = inEditor ? {} : canvasBg;

    return (
        <div style={{
            width: '100vw', height: '100vh', overflow: 'hidden', position: 'relative',
            background: inEditor ? '#0a0a12' : 'transparent',
        }}>
            {/* OBS recording flash */}
            {isRecording && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0, 0.2, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    style={{ position: 'absolute', inset: 0, background: 'rgba(239,68,68,1)', pointerEvents: 'none', zIndex: 0 }}
                />
            )}

            {/* ── EDITOR CHROME — header + panels, hidden in live / OBS mode ── */}
            {inEditor && (<>
                {/* Header bar */}
                <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, height: 40, zIndex: 400,
                    background: 'rgba(8,8,18,0.98)', borderBottom: '1px solid rgba(255,255,255,0.07)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '0 12px 0 10px',
                }}>
                    {/* Left: logo + title */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{
                            width: 18, height: 18, borderRadius: 4, flexShrink: 0,
                            background: 'rgba(99,102,241,0.25)', border: '1px solid rgba(99,102,241,0.45)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: '#a5b4fc',
                        }}><Circle size={8} fill="#a5b4fc" strokeWidth={0} /></div>
                        <span style={{ fontSize: 10, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: 3, color: 'rgba(255,255,255,0.45)' }}>
                            Overlay Studio
                        </span>
                    </div>
                    {/* Right: actions */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <HdrBtn onClick={resetLayout}><RotateCcw size={12} style={{ marginRight: 4 }} />Reset</HdrBtn>
                        <HdrSep />
                        <button
                            onClick={() => { setEditMode(false); setSelectedBox(null); setSelectedElementId(null); setShowBgPanel(false); }}
                            style={{ padding: '3px 12px', borderRadius: 5, fontSize: 9, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: 1, border: '1px solid rgba(99,102,241,0.45)', background: 'rgba(79,70,229,0.4)', color: '#fff', cursor: 'pointer' }}
                        ><Check size={11} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 3 }} />Done</button>
                    </div>
                </div>

                {/* Left panel: layers + sources */}
                <div style={{
                    position: 'absolute', top: 40, left: 0, bottom: 0, width: 240, zIndex: 300,
                    background: 'rgba(7,7,16,0.98)', borderRight: '1px solid rgba(255,255,255,0.07)',
                    overflow: 'hidden', display: 'flex', flexDirection: 'column',
                }}>
                    <LayersPanel
                        boxVisibility={boxVisibility}
                        onToggleBuiltin={toggleBuiltinVisibility}
                        elements={elements}
                        selectedElementId={selectedElementId}
                        selectedBox={selectedBox}
                        onToggleElement={toggleElementVisibility}
                        onDeleteElement={deleteElement}
                        onSelectElement={selectElement}
                        onSelectBox={selectBox}
                        onAddElement={addElement}
                        scenes={layoutSettings.scenes ?? []}
                        onApplyScene={applyScene}
                        onSaveScene={saveScene}
                        onDeleteScene={deleteScene}
                        onOpenBackground={() => setShowBgPanel(v => !v)}
                        onResetLayout={resetLayout}
                        devices={capture.devices}
                        streams={streams}
                        selectedDevices={capture.selectedDevices}
                        setSelectedDevice={capture.setSelectedDevice}
                        startCameraStream={capture.startCameraStream}
                        stopCameraStream={capture.stopCameraStream}
                        errors={capture.errors}
                        zOrder={zOrder}
                        onLayerUp={layerUp}
                        onLayerDown={layerDown}
                    />
                </div>

                {/* Right panel: element editor */}
                {selectedElement && (
                    <div style={{
                        position: 'absolute', top: 40, right: 0, bottom: 0, width: 260, zIndex: 300,
                        background: 'rgba(7,7,16,0.98)', borderLeft: '1px solid rgba(255,255,255,0.07)',
                        overflow: 'auto',
                    }}>
                        <ElementEditor
                            element={selectedElement}
                            onChange={(changes) => updateElement(selectedElement.id, changes)}
                            onDelete={() => deleteElement(selectedElement.id)}
                        />
                    </div>
                )}

                {/* Background panel */}
                {showBgPanel && (
                    <BackgroundPanel
                        bg={background}
                        onChange={(newBg) => updateLayout({ background: newBg })}
                        onClose={() => setShowBgPanel(false)}
                    />
                )}
            </>)}

            {/* ── CANVAS POSITIONING WRAPPER ── */}
            {/* In editor: offset by header + left/right panels, canvas is 16:9 preview */}
            {/* In live:   fills the entire viewport absolutely */}
            <div style={{
                position: 'absolute',
                top:    inEditor ? 40 : 0,
                left:   inEditor ? 240 : 0,
                right:  inEditor ? (selectedElement ? 260 : 0) : 0,
                bottom: 0,
                overflow: inEditor ? 'auto' : undefined,
                padding: inEditor ? 16 : 0,
                boxSizing: 'border-box',
                ...(inEditor ? editorWorkspaceBg : { background: 'transparent' }),
            }}>
                {/* Dot-grid backdrop */}
                {inEditor && (
                    <div style={{
                        position: 'absolute', inset: 0, pointerEvents: 'none',
                        backgroundImage: 'radial-gradient(rgba(99,102,241,0.10) 1px, transparent 1px)',
                        backgroundSize: '24px 24px',
                    }} />
                )}
                {/* ── THE CANVAS ──
                    Live mode  → position:absolute filling the viewport (OBS sees this).
                    Editor mode → fills content area of wrapper (16px padding on each side),
                                  height from aspect-ratio so 16:9 is always maintained.
                    The 16px padding ensures resize handles at canvas edges stay reachable.
                */}
                <div
                    ref={canvasRef}
                    onMouseDown={onCanvasMouseDown}
                    className={`font-inter overflow-hidden ${isRecording ? 'outline outline-4 outline-red-500/50' : ''}`}
                    style={{
                        isolation: 'isolate', // required for Element Capture (RestrictionTarget)
                        ...(inEditor ? {
                            position: 'relative',
                            width: '100%',
                            aspectRatio: '16 / 9',
                            boxShadow: '0 0 0 1px rgba(255,255,255,0.08)',
                        } : {
                            position: 'absolute',
                            inset: 0,
                        }),
                        ...activeCanvasBg,
                    }}
                >
                    {/* ── Custom elements ── */}
                    {elements.map((el, i) => {
                        if (el.hidden) return null;
                        return (
                            <ElementBox
                                key={el.id}
                                element={el}
                                zIndex={100 + i + (selectedElementId === el.id ? 50 : 0)}
                                selected={selectedElementId === el.id}
                                onSelect={selectElement}
                                onBoxChange={updateElementBox}
                                onUploadLogo={onUploadLogo}
                                editMode={editMode}
                                canvasRef={canvasRef}
                            />
                        );
                    })}

                    {shouldRenderBox('faceCam') && <DraggableBox id="faceCam" title="Face Cam" box={boxes.faceCam} zIndex={getZIndex('faceCam')} selected={selectedBox === 'faceCam'} onSelect={selectBox} onLayerUp={layerUp} onLayerDown={layerDown} onBoxChange={updateBox} editMode={editMode} canvasRef={canvasRef}>{faceCamChild}</DraggableBox>}
                    {shouldRenderBox('socialFeed') && <DraggableBox id="socialFeed" title="Social Feed" box={boxes.socialFeed} zIndex={getZIndex('socialFeed')} selected={selectedBox === 'socialFeed'} onSelect={selectBox} onLayerUp={layerUp} onLayerDown={layerDown} onBoxChange={updateBox} editMode={editMode} canvasRef={canvasRef}>{socialFeedChild}</DraggableBox>}
                    {shouldRenderBox('aiCompanion') && <DraggableBox id="aiCompanion" title="AI Companion" box={boxes.aiCompanion} zIndex={getZIndex('aiCompanion')} selected={selectedBox === 'aiCompanion'} onSelect={selectBox} onLayerUp={layerUp} onLayerDown={layerDown} onBoxChange={updateBox} editMode={editMode} canvasRef={canvasRef}>{aiCompanionChild}</DraggableBox>}
                    {shouldRenderBox('handCam') && <DraggableBox id="handCam" title="Hand Cam" box={boxes.handCam} zIndex={getZIndex('handCam')} selected={selectedBox === 'handCam'} onSelect={selectBox} onLayerUp={layerUp} onLayerDown={layerDown} onBoxChange={updateBox} editMode={editMode} canvasRef={canvasRef}>{handCamChild}</DraggableBox>}
                    {shouldRenderBox('roomCam') && <DraggableBox id="roomCam" title="Room Cam" box={boxes.roomCam} zIndex={getZIndex('roomCam')} selected={selectedBox === 'roomCam'} onSelect={selectBox} onLayerUp={layerUp} onLayerDown={layerDown} onBoxChange={updateBox} editMode={editMode} canvasRef={canvasRef}>{roomCamChild}</DraggableBox>}
                    {shouldRenderBox('currentTask') && <DraggableBox id="currentTask" title="Current Task" box={boxes.currentTask} zIndex={getZIndex('currentTask')} selected={selectedBox === 'currentTask'} onSelect={selectBox} onLayerUp={layerUp} onLayerDown={layerDown} onBoxChange={updateBox} editMode={editMode} canvasRef={canvasRef}>{currentTaskChild}</DraggableBox>}
                </div>
            </div>

            {/* ── LIVE MODE DOCK — minimal pill, hidden when OBS is recording ── */}
            {!editMode && !isRecording && (
                <div style={{ position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 200 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 2, background: 'rgba(6,6,16,0.88)', backdropFilter: 'blur(24px)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '5px 7px', boxShadow: '0 8px 40px rgba(0,0,0,0.72)', whiteSpace: 'nowrap' }}>
                        <DockBtn onClick={() => setEditMode(true)}>Edit Layout</DockBtn>
                    </div>
                </div>
            )}
        </div>
    );
};

const HdrBtn = ({ children, active, icon, onClick }) => (
    <button onClick={onClick} style={{ padding: icon ? '3px 6px' : '3px 9px', borderRadius: 5, fontSize: 9, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: 1, border: '1px solid', cursor: 'pointer', display: 'flex', alignItems: 'center', transition: 'all 0.1s', ...(active ? { background: 'rgba(99,102,241,0.2)', borderColor: 'rgba(99,102,241,0.4)', color: '#a5b4fc' } : { background: 'transparent', borderColor: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.38)' }) }}>
        {children}
    </button>
);

const HdrSep = () => <div style={{ width: 1, height: 14, background: 'rgba(255,255,255,0.07)', flexShrink: 0 }} />;

const DockBtn = ({ children, active, icon, disabled, onClick, title }) => (
    <button
        onClick={onClick}
        disabled={disabled}
        title={title}
        style={{
            padding: icon ? '4px 7px' : '4px 10px',
            borderRadius: 8,
            fontSize: 9,
            fontFamily: 'monospace',
            textTransform: 'uppercase',
            letterSpacing: 1,
            border: '1px solid',
            cursor: disabled ? 'not-allowed' : 'pointer',
            opacity: disabled ? 0.45 : 1,
            transition: 'all 0.12s',
            display: 'flex', alignItems: 'center', gap: 4,
            lineHeight: 1,
            ...(active
                ? { background: 'rgba(79,70,229,0.52)', borderColor: 'rgba(99,102,241,0.5)', color: '#fff' }
                : { background: 'transparent', borderColor: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.45)' }
            ),
        }}
    >
        {children}
    </button>
);

export default OverlayLayout;
