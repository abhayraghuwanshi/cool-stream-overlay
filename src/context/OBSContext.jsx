import OBSWebSocket from 'obs-websocket-js';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

const OBSContext = createContext(null);

export const useOBS = () => useContext(OBSContext);

const RETRY_INTERVAL = 5000; // ms between reconnect attempts

// Input kinds that are physical cameras (dshow = Windows, v4l2 = Linux,
// av_capture/avcapture = macOS).
const CAMERA_KIND = /dshow|v4l2|av_capture|avcapture|video_capture|camera/i;

// Map OBS camera sources to overlay cam slots. Source names win when they hint
// at a slot ("hand cam", "room cam", "face cam"); any remaining cameras fill
// the leftover slots in faceCam → handCam → roomCam order, so a single unnamed
// webcam lands on faceCam.
const assignCamSlots = (cams) => {
    const slots = ['faceCam', 'handCam', 'roomCam'];
    const out = {};
    const rest = [];
    for (const cam of cams) {
        const name = cam.sourceName ?? '';
        const named =
            (/hand/i.test(name) && 'handCam') ||
            (/room/i.test(name) && 'roomCam') ||
            (/face/i.test(name) && 'faceCam');
        if (named && !out[named]) out[named] = cam;
        else rest.push(cam);
    }
    for (const cam of rest) {
        const free = slots.find(s => !out[s]);
        if (!free) break;
        out[free] = cam;
    }
    return out;
};

export const OBSProvider = ({ children }) => {
    const [obs] = useState(() => new OBSWebSocket());
    const [isConnected, setIsConnected] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const retryRef = useRef(null);
    const mountedRef = useRef(true);
    // Mirror isConnected into a ref so placeCameras stays referentially stable
    // (callers keep it in useCallback deps) while still seeing live state.
    const isConnectedRef = useRef(false);
    isConnectedRef.current = isConnected;

    // Auto-place native OBS camera sources to match the overlay's cam boxes.
    // boxes/visibility use the overlay's percent coordinates on its 16:9 canvas;
    // we convert them to OBS canvas pixels and pin each camera into its frame
    // with fill-crop bounds (so circles/odd aspect frames are filled, overflow
    // cropped), and enable/disable it to match the scene. No-op when OBS isn't
    // connected, so it's always safe to call.
    const placeCameras = useCallback(async (boxes, visibility) => {
        if (!isConnectedRef.current) return;
        try {
            const { baseWidth, baseHeight } = await obs.call('GetVideoSettings');
            const { currentProgramSceneName: sceneName } = await obs.call('GetCurrentProgramScene');
            const { sceneItems } = await obs.call('GetSceneItemList', { sceneName });
            const bySlot = assignCamSlots(sceneItems.filter(it => CAMERA_KIND.test(it.inputKind ?? '')));
            for (const [slot, item] of Object.entries(bySlot)) {
                const visible = !!visibility?.[slot];
                await obs.call('SetSceneItemEnabled', {
                    sceneName, sceneItemId: item.sceneItemId, sceneItemEnabled: visible,
                });
                const b = boxes?.[slot];
                if (!visible || !b) continue;
                const sceneItemTransform = {
                    positionX: (b.x / 100) * baseWidth,
                    positionY: (b.y / 100) * baseHeight,
                    alignment: 5, // top-left anchor → position == box origin
                    boundsType: 'OBS_BOUNDS_SCALE_OUTER', // fill the frame
                    boundsAlignment: 0,
                    boundsWidth: Math.max(1, (b.w / 100) * baseWidth),
                    boundsHeight: Math.max(1, (b.h / 100) * baseHeight),
                    cropToBounds: true,
                };
                try {
                    await obs.call('SetSceneItemTransform', {
                        sceneName, sceneItemId: item.sceneItemId, sceneItemTransform,
                    });
                } catch {
                    // cropToBounds needs OBS 30.2+ — retry without it on older OBS.
                    const { cropToBounds: _c, ...legacy } = sceneItemTransform;
                    await obs.call('SetSceneItemTransform', {
                        sceneName, sceneItemId: item.sceneItemId, sceneItemTransform: legacy,
                    });
                }
            }
        } catch (e) {
            console.warn('[obs] camera auto-place failed:', e?.message ?? e);
        }
    }, [obs]);

    useEffect(() => {
        mountedRef.current = true;
        // Guard against overlapping connect attempts. A single failed connection
        // both rejects connect() AND emits ConnectionClosed; without these guards
        // each failure would schedule TWO retries, doubling every interval into a
        // storm of dead WebSockets (ERR_INSUFFICIENT_RESOURCES + memory growth).
        let connecting = false;

        // Only ever one pending retry: clearing first means duplicate callers
        // (catch + ConnectionClosed) collapse to a single scheduled attempt.
        const scheduleRetry = () => {
            if (!mountedRef.current) return;
            clearTimeout(retryRef.current);
            retryRef.current = setTimeout(connect, RETRY_INTERVAL);
        };

        const connect = async () => {
            if (!mountedRef.current || connecting) return;
            connecting = true;
            try {
                await obs.connect('ws://localhost:4455', '');
                if (!mountedRef.current) return;
                setIsConnected(true);

                const status = await obs.call('GetRecordStatus');
                if (mountedRef.current) setIsRecording(status.outputActive);
            } catch {
                // OBS is likely not open — retry silently
                if (!mountedRef.current) return;
                setIsConnected(false);
                scheduleRetry();
            } finally {
                connecting = false;
            }
        };

        obs.on('RecordStateChanged', (data) => {
            setIsRecording(data.outputActive);
        });

        obs.on('ConnectionClosed', () => {
            if (!mountedRef.current) return;
            setIsConnected(false);
            setIsRecording(false);
            scheduleRetry();
        });

        connect();

        return () => {
            mountedRef.current = false;
            clearTimeout(retryRef.current);
            obs.disconnect();
        };
    }, [obs]);

    return (
        <OBSContext.Provider value={{ obs, isConnected, isRecording, placeCameras }}>
            {children}
        </OBSContext.Provider>
    );
};
