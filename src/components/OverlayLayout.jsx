import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { BACKEND_HTTP, BACKEND_WS } from '../config.js';
import { useOBS } from '../context/OBSContext';
import AICompanion from './AICompanion';
import CurrentTask from './CurrentTask';
import DraggableBox from './DraggableBox';
import BackgroundPanel, { bgToStyle } from './BackgroundPanel';
import ElementEditor from './ElementEditor';
import ElementLibrary from './ElementLibrary';
import ElementRenderer, { defaultElement } from './ElementRenderer';
import SettingsModal from './SettingsModal';
import SocialFeed from './SocialFeed';

// Default box layout — percentages of the canvas (designed to match the old flex layout)
// x/y = top-left corner, w/h = dimensions — all as % of canvas width/height
const DEFAULT_BOXES = {
    faceCam:     { x: 80,  y: 0,    w: 20,   h: 20   },
    socialFeed:  { x: 80,  y: 20,   w: 20,   h: 18   },
    aiCompanion: { x: 80,  y: 38,   w: 20,   h: 37   },
    handCam:     { x: 80,  y: 75,   w: 10,   h: 10   },
    roomCam:     { x: 90,  y: 75,   w: 10,   h: 10   },
    currentTask: { x: 0,   y: 85,   w: 80,   h: 15   },
};

const OverlayLayout = () => {
    const { isRecording, isConnected } = useOBS();
    const canvasRef = useRef(null);

    const [layoutSettings, setLayoutSettings] = useState({
        showFaceCam: true,
        showHandCam: true,
        showRoomCam: true,
        socialGithub: "/abhayraghuwanshi",
        socialTwitter: "@ab_nhi_hai",
        socialLinkedin: "/in/abhayraghuwanshi",
        useGPU: true,
        tasks: [{ id: 1, text: "Refactoring Overlay", status: "active" }],
        boxes: DEFAULT_BOXES,
        elements: [],
        background: { type: 'solid', color: '#0a0a0f' },
    });

    const [showSettings, setShowSettings] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [showLibrary, setShowLibrary] = useState(false);
    const [showBgPanel, setShowBgPanel] = useState(false);
    const [selectedBox, setSelectedBox] = useState(null);
    const [selectedElementId, setSelectedElementId] = useState(null);
    // zOrder: array of box IDs, last = topmost (highest z-index)
    const [zOrder, setZOrder] = useState(Object.keys(DEFAULT_BOXES));

    // Disable edit mode + clear selection when recording starts
    useEffect(() => {
        if (isRecording) { setEditMode(false); setSelectedBox(null); setSelectedElementId(null); setShowLibrary(false); setShowBgPanel(false); }
    }, [isRecording]);

    // Click canvas background → deselect all
    const onCanvasMouseDown = (e) => {
        if (e.target === e.currentTarget) { setSelectedBox(null); setSelectedElementId(null); }
    };

    // ── Element helpers ──────────────────────────────────────────────────────
    const addElement = (type) => {
        const el = defaultElement(type);
        const newElements = [...(layoutSettings.elements ?? []), el];
        updateLayout({ elements: newElements });
        setSelectedElementId(el.id);
    };

    const updateElement = (id, changes) => {
        const newElements = (layoutSettings.elements ?? []).map(el =>
            el.id === id ? { ...el, ...changes } : el
        );
        updateLayout({ elements: newElements });
    };

    const deleteElement = (id) => {
        const newElements = (layoutSettings.elements ?? []).filter(el => el.id !== id);
        updateLayout({ elements: newElements });
        setSelectedElementId(null);
    };

    const updateElementBox = (id, box) => {
        updateElement(id, { box });
    };

    // Bring a box to front and mark as selected
    const selectBox = (id) => {
        setSelectedBox(id);
        setZOrder(prev => {
            const rest = prev.filter(x => x !== id);
            return [...rest, id];
        });
    };

    // Move one step up in z-order
    const layerUp = (id) => {
        setZOrder(prev => {
            const i = prev.indexOf(id);
            if (i >= prev.length - 1) return prev;
            const next = [...prev];
            [next[i], next[i + 1]] = [next[i + 1], next[i]];
            return next;
        });
    };

    // Move one step down in z-order
    const layerDown = (id) => {
        setZOrder(prev => {
            const i = prev.indexOf(id);
            if (i <= 0) return prev;
            const next = [...prev];
            [next[i], next[i - 1]] = [next[i - 1], next[i]];
            return next;
        });
    };

    // z-index for each box = its position in zOrder array + base offset
    const getZIndex = (id) => zOrder.indexOf(id) + 10;

    useEffect(() => {
        fetch(`${BACKEND_HTTP}/layout`)
            .then(res => res.json())
            .then(data => setLayoutSettings(s => ({
                ...s,
                ...data,
                boxes: { ...DEFAULT_BOXES, ...(data.boxes ?? {}) },
            })))
            .catch(console.error);

        let ws;
        let reconnectTimeout;
        let isMounted = true;

        const connectWs = () => {
            if (!isMounted) return;
            ws = new WebSocket(BACKEND_WS);
            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.type === 'layout-update') {
                        setLayoutSettings(s => ({
                            ...s,
                            ...data.payload,
                            boxes: { ...s.boxes, ...(data.payload.boxes ?? {}) },
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

    const updateLayout = (updates) => {
        setLayoutSettings(s => ({ ...s, ...updates }));
        fetch(`${BACKEND_HTTP}/layout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates),
        }).catch(console.error);
    };

    // Called when a box is dragged or resized — updates one box's position
    const updateBox = (id, newBox) => {
        const updatedBoxes = { ...layoutSettings.boxes, [id]: newBox };
        updateLayout({ boxes: updatedBoxes });
    };

    // Reset all boxes to the default layout
    const resetLayout = () => updateLayout({ boxes: DEFAULT_BOXES });

    const {
        showFaceCam, showHandCam, showRoomCam,
        socialGithub, socialTwitter, socialLinkedin,
        useGPU, tasks = [], boxes = DEFAULT_BOXES, elements = [],
        background,
    } = layoutSettings;

    const selectedElement = elements.find(el => el.id === selectedElementId) ?? null;

    return (
        // Canvas: full screen, all boxes are absolutely positioned inside
        <div
            ref={canvasRef}
            onMouseDown={onCanvasMouseDown}
            className={`w-screen h-screen relative overflow-hidden font-inter ${isRecording ? 'border-[4px] border-red-500/50' : ''}`}
            style={{
                // Transparent bg shows checkerboard in edit mode so you can see it's see-through
                ...(!background || background.type === 'transparent'
                    ? editMode
                        ? {
                            backgroundImage: 'linear-gradient(45deg, #1a1a1a 25%, transparent 25%), linear-gradient(-45deg, #1a1a1a 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #1a1a1a 75%), linear-gradient(-45deg, transparent 75%, #1a1a1a 75%)',
                            backgroundSize: '20px 20px',
                            backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
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

            {/* Edit mode grid hint */}
            {editMode && (
                <div
                    className="absolute inset-0 pointer-events-none z-0"
                    style={{
                        backgroundImage: 'linear-gradient(rgba(99,102,241,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.04) 1px, transparent 1px)',
                        backgroundSize: '5% 5%',
                    }}
                />
            )}

            {/* ── Background panel ── */}
            {editMode && showBgPanel && (
                <BackgroundPanel
                    bg={background}
                    onChange={(newBg) => updateLayout({ background: newBg })}
                    onClose={() => setShowBgPanel(false)}
                />
            )}

            {/* ── Element Library panel ── */}
            {editMode && showLibrary && (
                <ElementLibrary
                    onAdd={(type) => { addElement(type); }}
                    onClose={() => setShowLibrary(false)}
                />
            )}

            {/* ── Custom elements (rendered below camera boxes by default) ── */}
            {elements.map((el, i) => (
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
                >
                    <ElementRenderer
                        element={el}
                        editMode={editMode}
                        onUploadLogo={() => {
                            // Trigger from editor panel instead
                            setSelectedElementId(el.id);
                        }}
                    />
                </DraggableBox>
            ))}

            {/* ── Face Cam ── */}
            {showFaceCam && (
                <DraggableBox
                    id="faceCam" title="Face Cam"
                    box={boxes.faceCam} zIndex={getZIndex('faceCam')}
                    selected={selectedBox === 'faceCam'}
                    onSelect={selectBox} onLayerUp={layerUp} onLayerDown={layerDown}
                    onBoxChange={updateBox} editMode={editMode} canvasRef={canvasRef}
                >
                    <div className="w-full h-full bg-black relative overflow-hidden">
                        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-black/60 backdrop-blur rounded-full border border-white/5 z-10">
                            <span className="text-[8px] uppercase font-bold text-white/80 tracking-widest">CAM 01</span>
                        </div>
                    </div>
                </DraggableBox>
            )}

            {/* ── Social Feed ── */}
            <DraggableBox
                id="socialFeed" title="Social Feed"
                box={boxes.socialFeed} zIndex={getZIndex('socialFeed')}
                selected={selectedBox === 'socialFeed'}
                onSelect={selectBox} onLayerUp={layerUp} onLayerDown={layerDown}
                onBoxChange={updateBox} editMode={editMode} canvasRef={canvasRef}
            >
                <div className="w-full h-full overflow-hidden">
                    <SocialFeed github={socialGithub} twitter={socialTwitter} linkedin={socialLinkedin} />
                </div>
            </DraggableBox>

            {/* ── AI Companion ── */}
            <DraggableBox
                id="aiCompanion" title="AI Companion"
                box={boxes.aiCompanion} zIndex={getZIndex('aiCompanion')}
                selected={selectedBox === 'aiCompanion'}
                onSelect={selectBox} onLayerUp={layerUp} onLayerDown={layerDown}
                onBoxChange={updateBox} editMode={editMode} canvasRef={canvasRef}
            >
                <div className="w-full h-full overflow-hidden">
                    <AICompanion />
                </div>
            </DraggableBox>

            {/* ── Hand Cam ── */}
            {showHandCam && (
                <DraggableBox
                    id="handCam" title="Hand Cam"
                    box={boxes.handCam} zIndex={getZIndex('handCam')}
                    selected={selectedBox === 'handCam'}
                    onSelect={selectBox} onLayerUp={layerUp} onLayerDown={layerDown}
                    onBoxChange={updateBox} editMode={editMode} canvasRef={canvasRef}
                >
                    <div className="w-full h-full bg-black flex items-center justify-center">
                        <span className="text-[9px] text-white/20 font-bold uppercase">HAND</span>
                    </div>
                </DraggableBox>
            )}

            {/* ── Room Cam ── */}
            {showRoomCam && (
                <DraggableBox
                    id="roomCam" title="Room Cam"
                    box={boxes.roomCam} zIndex={getZIndex('roomCam')}
                    selected={selectedBox === 'roomCam'}
                    onSelect={selectBox} onLayerUp={layerUp} onLayerDown={layerDown}
                    onBoxChange={updateBox} editMode={editMode} canvasRef={canvasRef}
                >
                    <div className="w-full h-full bg-black flex items-center justify-center">
                        <span className="text-[9px] text-white/20 font-bold uppercase">ROOM</span>
                    </div>
                </DraggableBox>
            )}

            {/* ── Current Task ── */}
            <DraggableBox
                id="currentTask" title="Current Task"
                box={boxes.currentTask} zIndex={getZIndex('currentTask')}
                selected={selectedBox === 'currentTask'}
                onSelect={selectBox} onLayerUp={layerUp} onLayerDown={layerDown}
                onBoxChange={updateBox} editMode={editMode} canvasRef={canvasRef}
            >
                <div className="w-full h-full bg-black/80 backdrop-blur-md border-t border-white/5 overflow-hidden">
                    <CurrentTask
                        tasks={tasks}
                        onTasksChange={(newTasks) => updateLayout({ tasks: newTasks })}
                    />
                </div>
            </DraggableBox>

            {/* ── Top-right controls ── */}
            <div className="absolute top-4 right-4 flex items-center gap-2 z-50">

                {/* Edit Layout toggle */}
                {!isRecording && (
                    <button
                        onClick={() => { setEditMode(v => !v); if (editMode) { setShowLibrary(false); setSelectedElementId(null); } }}
                        className={`px-2.5 py-1 rounded-full text-[10px] font-mono uppercase tracking-wider border transition-all ${
                            editMode
                                ? 'bg-indigo-600/80 border-indigo-400/50 text-white'
                                : 'bg-black/40 border-white/10 text-white/40 hover:text-white/70 hover:border-white/20'
                        }`}
                    >
                        {editMode ? 'Done' : 'Edit Layout'}
                    </button>
                )}

                {/* Elements library toggle — only in edit mode */}
                {editMode && (
                    <button
                        onClick={() => { setShowLibrary(v => !v); setShowBgPanel(false); }}
                        className={`px-2.5 py-1 rounded-full text-[10px] font-mono uppercase tracking-wider border transition-all ${
                            showLibrary
                                ? 'bg-violet-600/70 border-violet-400/50 text-white'
                                : 'bg-black/40 border-white/10 text-white/40 hover:text-white/70 hover:border-white/20'
                        }`}
                    >
                        + Elements
                    </button>
                )}

                {/* Background toggle — only in edit mode */}
                {editMode && (
                    <button
                        onClick={() => { setShowBgPanel(v => !v); setShowLibrary(false); }}
                        className={`px-2.5 py-1 rounded-full text-[10px] font-mono uppercase tracking-wider border transition-all ${
                            showBgPanel
                                ? 'bg-sky-600/70 border-sky-400/50 text-white'
                                : 'bg-black/40 border-white/10 text-white/40 hover:text-white/70 hover:border-white/20'
                        }`}
                    >
                        BG
                    </button>
                )}

                {/* Reset button — only in edit mode */}
                {editMode && (
                    <button
                        onClick={resetLayout}
                        className="px-2.5 py-1 rounded-full text-[10px] font-mono uppercase tracking-wider border bg-black/40 border-white/10 text-white/40 hover:text-red-400 hover:border-red-500/30 transition-all"
                    >
                        Reset
                    </button>
                )}

                {/* Settings */}
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
                            showFaceCam={showFaceCam} setShowFaceCam={(v) => updateLayout({ showFaceCam: v })}
                            showHandCam={showHandCam} setShowHandCam={(v) => updateLayout({ showHandCam: v })}
                            showRoomCam={showRoomCam} setShowRoomCam={(v) => updateLayout({ showRoomCam: v })}
                            socialGithub={socialGithub} setSocialGithub={(v) => updateLayout({ socialGithub: v })}
                            socialTwitter={socialTwitter} setSocialTwitter={(v) => updateLayout({ socialTwitter: v })}
                            socialLinkedin={socialLinkedin} setSocialLinkedin={(v) => updateLayout({ socialLinkedin: v })}
                            useGPU={useGPU} setUseGPU={(v) => updateLayout({ useGPU: v })}
                        />
                    )}
                </AnimatePresence>

                {/* OBS status */}
                <div className="flex items-center gap-2 bg-black/40 backdrop-blur px-3 py-1 rounded-full border border-white/5 pointer-events-none">
                    <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]' : 'bg-red-500'}`} />
                    <span className="text-[10px] font-mono text-white/50 tracking-wider">OBS {isConnected ? 'LINKED' : 'OFFLINE'}</span>
                </div>
            </div>

            {/* Element editor panel — shown when an element is selected in edit mode */}
            {editMode && selectedElement && (
                <ElementEditor
                    element={selectedElement}
                    onChange={(changes) => updateElement(selectedElement.id, changes)}
                    onDelete={() => deleteElement(selectedElement.id)}
                />
            )}

            {/* Edit mode tooltip — only when no element selected */}
            {editMode && !selectedElement && (
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-50 px-3 py-1.5 bg-indigo-950/80 border border-indigo-500/30 rounded-full backdrop-blur pointer-events-none">
                    <span className="text-[10px] font-mono text-indigo-300 tracking-wide">
                        Drag to reposition · Edges to resize · <strong>+ Elements</strong> to add · Click <strong>Done</strong> when finished
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
