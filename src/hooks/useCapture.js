import { useCallback, useEffect, useRef, useState } from 'react';

const CAMERA_SLOTS = ['faceCam', 'handCam', 'roomCam'];

// Camera sources for the overlay. The overlay is an OBS browser source —
// OBS owns screen capture, mic, and recording, so this hook only manages
// the framed camera widgets the overlay composites itself.
const useCapture = () => {
    const [devices, setDevices] = useState({ cameras: [] });

    const [streams, setStreams] = useState({
        faceCam: null,
        handCam: null,
        roomCam: null,
    });

    const [selectedDevices, setSelectedDevices] = useState(() => {
        try {
            const saved = localStorage.getItem('overlay_selected_devices');
            return saved ? JSON.parse(saved) : { faceCam: null, handCam: null, roomCam: null };
        } catch { return { faceCam: null, handCam: null, roomCam: null }; }
    });

    const [errors, setErrors] = useState({ faceCam: null, handCam: null, roomCam: null });

    const streamsRef   = useRef(streams);
    streamsRef.current = streams;

    // ── Device enumeration ────────────────────────────────────────────────────
    const enumerateDevices = useCallback(async () => {
        try {
            const all = await navigator.mediaDevices.enumerateDevices();
            setDevices({
                cameras: all.filter(d => d.kind === 'videoinput' && d.deviceId)
                             .map((d, i) => ({ deviceId: d.deviceId, label: d.label || `Camera ${i + 1}` })),
            });
        } catch (e) { console.error('enumerateDevices failed', e); }
    }, []);

    useEffect(() => {
        // On Windows, enumerateDevices returns empty deviceIds until permission is granted.
        // Request access briefly upfront so subsequent enumerations return real IDs/labels.
        navigator.mediaDevices
            .getUserMedia({ video: true })
            .then(s => s.getTracks().forEach(t => t.stop()))
            .catch(() => {})
            .finally(() => enumerateDevices());
    }, [enumerateDevices]);

    // ── Helpers ───────────────────────────────────────────────────────────────
    const setStream = (key, stream) => setStreams(s => ({ ...s, [key]: stream }));
    const setError  = (key, msg)    => setErrors(e  => ({ ...e, [key]: msg   }));

    const stopStream = (key) => {
        const s = streamsRef.current[key];
        if (s) s.getTracks().forEach(t => t.stop());
        setStream(key, null);
        setError(key, null);
    };

    // ── Camera streams ────────────────────────────────────────────────────────
    const startCameraStream = useCallback(async (slot, deviceId) => {
        if (!deviceId) { setError(slot, 'No camera selected'); return; }
        const existing = streamsRef.current[slot];
        if (existing) existing.getTracks().forEach(t => t.stop());
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { deviceId: { exact: deviceId } }, audio: false,
            });
            setStream(slot, stream);
            setError(slot, null);
            enumerateDevices();
        } catch (e) {
            setError(slot, e.name === 'NotAllowedError' ? 'Permission denied' : e.message);
        }
    }, [enumerateDevices]); // eslint-disable-line react-hooks/exhaustive-deps

    const stopCameraStream = useCallback((slot) => stopStream(slot), []); // eslint-disable-line

    const setSelectedDevice = useCallback((slot, deviceId) => {
        setSelectedDevices(s => {
            const next = { ...s, [slot]: deviceId };
            try { localStorage.setItem('overlay_selected_devices', JSON.stringify(next)); } catch {}
            return next;
        });
    }, []);

    // ── Cleanup ───────────────────────────────────────────────────────────────
    useEffect(() => () => {
        CAMERA_SLOTS.forEach(key => streamsRef.current[key]?.getTracks().forEach(t => t.stop()));
    }, []);

    return {
        devices,
        streams,
        errors,
        selectedDevices,
        setSelectedDevice,
        startCameraStream,
        stopCameraStream,
    };
};

export default useCapture;
