import { useCallback, useEffect, useRef, useState } from 'react';

export const formatElapsed = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return [h, m, s].map(v => String(v).padStart(2, '0')).join(':');
};

const MAX_SCREENS  = 4;
const CAMERA_SLOTS = ['faceCam', 'handCam', 'roomCam'];

const getMimeType = () => {
    const types = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
    return types.find(t => MediaRecorder.isTypeSupported(t)) ?? '';
};

const useCapture = ({ isObsRecording }) => {
    const [devices, setDevices] = useState({ cameras: [], mics: [] });

    const [streams, setStreams] = useState({
        faceCam: null,
        handCam:  null,
        roomCam:  null,
        mic:      null,
    });

    // Screen captures — each entry: { slot: 0|1|2|3, stream: MediaStream, label: string }
    const [screens, setScreens] = useState([]);

    const [selectedDevices, setSelectedDevices] = useState({
        faceCam: null, handCam: null, roomCam: null, mic: null,
    });

    const [recording, setRecording] = useState({ active: false, elapsed: 0, blob: null });
    const [errors, setErrors]       = useState({
        faceCam: null, handCam: null, roomCam: null, mic: null, screen: null,
    });

    const recorderRef  = useRef(null);
    const chunksRef    = useRef([]);
    const timerRef     = useRef(null);
    const streamsRef   = useRef(streams);
    const screensRef   = useRef(screens);
    streamsRef.current = streams;
    screensRef.current = screens;

    // ── Device enumeration ────────────────────────────────────────────────────
    const enumerateDevices = useCallback(async () => {
        try {
            const all = await navigator.mediaDevices.enumerateDevices();
            setDevices({
                cameras: all.filter(d => d.kind === 'videoinput')
                             .map((d, i) => ({ deviceId: d.deviceId, label: d.label || `Camera ${i + 1}` })),
                mics:    all.filter(d => d.kind === 'audioinput')
                             .map((d, i) => ({ deviceId: d.deviceId, label: d.label || `Microphone ${i + 1}` })),
            });
        } catch (e) { console.error('enumerateDevices failed', e); }
    }, []);

    useEffect(() => { enumerateDevices(); }, [enumerateDevices]);

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

    // ── Screen captures — multiple displays ───────────────────────────────────
    const addScreenCapture = useCallback(async () => {
        const usedSlots = screensRef.current.map(s => s.slot);
        const slot = [0, 1, 2, 3].find(n => !usedSlots.includes(n));
        if (slot === undefined) return;

        try {
            const stream = await navigator.mediaDevices.getDisplayMedia({
                video: true,
                audio: true,
                selfBrowserSurface: 'exclude', // prevent selecting this tab (avoids infinity mirror)
            });
            const label  = `Screen ${slot + 1}`;

            stream.getVideoTracks()[0].onended = () =>
                setScreens(prev => prev.filter(s => s.slot !== slot));

            setScreens(prev => [...prev, { slot, stream, label }]);
            setError('screen', null);
        } catch (e) {
            if (e.name !== 'NotAllowedError') setError('screen', e.message);
        }
    }, []); // eslint-disable-line

    const removeScreenCapture = useCallback((slot) => {
        setScreens(prev => {
            const entry = prev.find(s => s.slot === slot);
            entry?.stream.getTracks().forEach(t => t.stop());
            return prev.filter(s => s.slot !== slot);
        });
    }, []);

    // ── Mic capture ───────────────────────────────────────────────────────────
    const startMicCapture = useCallback(async (deviceId) => {
        if (!deviceId) { setError('mic', 'No microphone selected'); return; }
        const existing = streamsRef.current.mic;
        if (existing) existing.getTracks().forEach(t => t.stop());
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: { deviceId: { exact: deviceId } }, video: false,
            });
            setStream('mic', stream);
            setError('mic', null);
            enumerateDevices();
        } catch (e) {
            setError('mic', e.name === 'NotAllowedError' ? 'Permission denied' : e.message);
        }
    }, [enumerateDevices]); // eslint-disable-line

    const stopMicCapture = useCallback(() => stopStream('mic'), []); // eslint-disable-line

    // ── Recording — captures the browser tab (full composited overlay) ────────
    //
    // We use getDisplayMedia to record the tab itself rather than trying to
    // composite raw streams. This captures EVERYTHING: CSS, video feeds, overlays,
    // background — exactly what the user sees.
    //
    // The caller (OverlayLayout) hides all UI panels before calling this so that
    // the picker shows (and records) the clean overlay without any control chrome.
    //
    const startRecording = useCallback(async () => {
        if (isObsRecording || recorderRef.current) return;

        try {
            const tabStream = await navigator.mediaDevices.getDisplayMedia({
                video: {
                    displaySurface: 'browser', // start picker on the Tab panel
                    frameRate: { ideal: 30 },
                },
                audio: true,               // capture tab audio (screen audio etc.)
                preferCurrentTab: true,    // Chrome 107+: pre-select this tab
                selfBrowserSurface: 'include',
            });

            // Also mix in the microphone if one is active
            const micStream = streamsRef.current.mic;
            if (micStream) {
                micStream.getAudioTracks().forEach(t => tabStream.addTrack(t));
            }

            const mimeType = getMimeType();
            const recorder = new MediaRecorder(tabStream, mimeType ? { mimeType } : {});

            chunksRef.current = [];
            recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
            recorder.onstop = () => {
                tabStream.getTracks().forEach(t => t.stop());
                const blob = new Blob(chunksRef.current, { type: mimeType || 'video/webm' });
                setRecording(r => ({ ...r, active: false, blob }));
                recorderRef.current = null;
            };

            // Auto-stop if user clicks "Stop sharing" in the browser bar
            tabStream.getVideoTracks()[0].onended = () => {
                clearInterval(timerRef.current);
                timerRef.current = null;
                if (recorderRef.current?.state === 'recording') {
                    recorderRef.current.stop();
                }
            };

            recorder.start(1000);
            recorderRef.current = recorder;

            timerRef.current = setInterval(() =>
                setRecording(r => ({ ...r, elapsed: r.elapsed + 1 })), 1000);

            setRecording({ active: true, elapsed: 0, blob: null });
        } catch (e) {
            if (e.name !== 'NotAllowedError') {
                console.error('Tab recording failed:', e);
            }
        }
    }, [isObsRecording]);

    const stopRecording = useCallback(() => {
        recorderRef.current?.stop();
        clearInterval(timerRef.current);
        timerRef.current = null;
    }, []);

    const downloadRecording = useCallback((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a   = Object.assign(document.createElement('a'), { href: url, download: `capture-${Date.now()}.webm` });
        a.click();
        URL.revokeObjectURL(url);
    }, []);

    const setSelectedDevice = useCallback((slot, deviceId) =>
        setSelectedDevices(s => ({ ...s, [slot]: deviceId })), []);

    // ── Cleanup ───────────────────────────────────────────────────────────────
    useEffect(() => () => {
        CAMERA_SLOTS.concat('mic').forEach(key => streamsRef.current[key]?.getTracks().forEach(t => t.stop()));
        screensRef.current.forEach(s => s.stream?.getTracks().forEach(t => t.stop()));
        try { recorderRef.current?.stop(); } catch (_) {}
        clearInterval(timerRef.current);
    }, []);

    const activeScreenCount = screens.length;
    const canAddScreen      = activeScreenCount < MAX_SCREENS;

    return {
        devices,
        streams,
        screens,
        activeScreenCount,
        canAddScreen,
        errors,
        selectedDevices,
        setSelectedDevice,
        startCameraStream,
        stopCameraStream,
        addScreenCapture,
        removeScreenCapture,
        startMicCapture,
        stopMicCapture,
        recording,
        startRecording,
        stopRecording,
        downloadRecording,
    };
};

export default useCapture;
