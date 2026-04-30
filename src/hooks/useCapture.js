import { useCallback, useEffect, useRef, useState } from 'react';

export const formatElapsed = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return [h, m, s].map(v => String(v).padStart(2, '0')).join(':');
};

const MAX_SCREENS  = 4;
const CAMERA_SLOTS = ['faceCam', 'handCam', 'roomCam'];
const CAMERA_IDS   = new Set(CAMERA_SLOTS);

// Recording canvas resolution — matches standard 1080p stream output
const REC_W = 1920;
const REC_H = 1080;

const getMimeType = () => {
    const types = [
        'video/mp4;codecs=avc1.640028,mp4a.40.2',
        'video/webm;codecs=h264,opus',
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm',
    ];
    return types.find(t => MediaRecorder.isTypeSupported(t)) ?? '';
};

const HIGH_QUALITY_VIDEO = { frameRate: { ideal: 60 } };

// 20 Mbps — clean headroom for 1080p60; H.264 hardware encoder handles it easily
const VIDEO_BITS_PER_SECOND = 20_000_000;

// Mirror a MediaStream into a detached <video> element for canvas drawing
const makeVideoEl = (stream) => {
    const v = document.createElement('video');
    v.srcObject = stream;
    v.muted = true;
    v.autoplay = true;
    v.playsInline = true;
    v.play().catch(() => {});
    return v;
};

// objectFit: contain — shows full frame, letterboxed (used for screens)
const drawContain = (ctx, vid, x, y, w, h) => {
    if (vid.readyState < 2) return;
    const vw = vid.videoWidth || w;
    const vh = vid.videoHeight || h;
    const scale = Math.min(w / vw, h / vh);
    const dw = vw * scale;
    const dh = vh * scale;
    ctx.drawImage(vid, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
};

// objectFit: cover — fills box, crops overflow (used for cameras)
const drawCover = (ctx, vid, x, y, w, h) => {
    if (vid.readyState < 2) return;
    const vw = vid.videoWidth || w;
    const vh = vid.videoHeight || h;
    const scale = Math.max(w / vw, h / vh);
    const dw = vw * scale;
    const dh = vh * scale;
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    ctx.drawImage(vid, x - (dw - w) / 2, y - (dh - h) / 2, dw, dh);
    ctx.restore();
};

const useCapture = ({ isObsRecording, boxes }) => {
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

    const [recording, setRecording] = useState({ active: false, paused: false, elapsed: 0, blob: null, error: null });
    const [errors, setErrors]       = useState({
        faceCam: null, handCam: null, roomCam: null, mic: null, screen: null,
    });

    const recorderRef  = useRef(null);
    const chunksRef    = useRef([]);
    const timerRef     = useRef(null);
    const discardRef   = useRef(false);
    const rafRef       = useRef(null);
    const streamsRef   = useRef(streams);
    const screensRef   = useRef(screens);
    const boxesRef     = useRef(boxes);
    streamsRef.current = streams;
    screensRef.current = screens;
    boxesRef.current   = boxes;

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
                video: HIGH_QUALITY_VIDEO,
                audio: true,
                selfBrowserSurface: 'exclude',
            });
            const label  = `Screen ${slot + 1}`;
            const screen = { slot, stream, label };

            stream.getVideoTracks()[0].onended = () =>
                setScreens(prev => prev.filter(s => s.slot !== slot));

            setScreens(prev => [...prev, screen]);
            setError('screen', null);
            return screen;
        } catch (e) {
            if (e.name !== 'NotAllowedError') setError('screen', e.message);
            return null;
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

    // ── Timer ─────────────────────────────────────────────────────────────────
    const startTimer = () => {
        clearInterval(timerRef.current);
        timerRef.current = setInterval(() =>
            setRecording(r => r.active && !r.paused ? { ...r, elapsed: r.elapsed + 1 } : r), 1000);
    };

    const stopTimer = () => {
        clearInterval(timerRef.current);
        timerRef.current = null;
    };

    // ── Tab capture recording ─────────────────────────────────────────────────
    // Captures this overlay tab exactly as rendered — screen boxes, camera boxes,
    // and all UI elements (tasks, social feed, etc.) composited by the browser.
    const startRecording = useCallback(async () => {
        if (isObsRecording || recorderRef.current) return;

        try {
            const tabStream = await navigator.mediaDevices.getDisplayMedia({
                video: {
                    displaySurface: 'browser',
                    ...HIGH_QUALITY_VIDEO,
                },
                audio: true,
                preferCurrentTab: true,
                selfBrowserSurface: 'include',
            });

            // Mix in mic if active
            const micStream = streamsRef.current.mic;
            if (micStream) {
                micStream.getAudioTracks()
                    .filter(t => t.readyState !== 'ended')
                    .forEach(t => tabStream.addTrack(t));
            }

            const mimeType = getMimeType();
            const recorder = new MediaRecorder(tabStream, {
                ...(mimeType ? { mimeType } : {}),
                videoBitsPerSecond: VIDEO_BITS_PER_SECOND,
            });

            chunksRef.current  = [];
            discardRef.current = false;

            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data);
            };

            recorder.onstop = () => {
                stopTimer();
                tabStream.getTracks().forEach(t => t.stop());
                const blob = discardRef.current
                    ? null
                    : new Blob(chunksRef.current, { type: mimeType || 'video/webm' });
                setRecording(r => ({ ...r, active: false, paused: false, blob, error: null }));
                recorderRef.current = null;
                discardRef.current  = false;
            };

            // Auto-stop when user clicks "Stop sharing" in the browser bar
            tabStream.getVideoTracks()[0]?.addEventListener('ended', () => {
                stopTimer();
                if (recorderRef.current && recorderRef.current.state !== 'inactive') {
                    recorderRef.current.stop();
                }
            }, { once: true });

            recorder.start(1000);
            recorderRef.current = recorder;
            startTimer();
            setRecording({ active: true, paused: false, elapsed: 0, blob: null, error: null });

        } catch (e) {
            if (e.name !== 'NotAllowedError') {
                console.error('Recording failed:', e);
                setRecording(r => ({ ...r, error: e.message || 'Recording failed.' }));
            }
        }
    }, [isObsRecording]);

    const stopRecording = useCallback(() => {
        if (recorderRef.current && recorderRef.current.state !== 'inactive') recorderRef.current.stop();
        stopTimer();
    }, []);

    const pauseRecording = useCallback(() => {
        if (recorderRef.current?.state !== 'recording') return;
        recorderRef.current.pause();
        stopTimer();
        setRecording(r => ({ ...r, paused: true }));
    }, []);

    const resumeRecording = useCallback(() => {
        if (recorderRef.current?.state !== 'paused') return;
        recorderRef.current.resume();
        startTimer();
        setRecording(r => ({ ...r, paused: false }));
    }, []);

    const discardRecording = useCallback(() => {
        discardRef.current = true;
        chunksRef.current = [];
        if (recorderRef.current && recorderRef.current.state !== 'inactive') {
            recorderRef.current.stop();
        } else {
            cancelAnimationFrame(rafRef.current);
            rafRef.current = null;
            setRecording({ active: false, paused: false, elapsed: 0, blob: null, error: null });
        }
        stopTimer();
    }, []);

    const clearRecording = useCallback(() => {
        chunksRef.current = [];
        setRecording({ active: false, paused: false, elapsed: 0, blob: null, error: null });
    }, []);

    const downloadRecording = useCallback((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const ext = blob.type.includes('mp4') ? 'mp4' : 'webm';
        const a   = Object.assign(document.createElement('a'), { href: url, download: `capture-${Date.now()}.${ext}` });
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
        cancelAnimationFrame(rafRef.current);
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
        pauseRecording,
        resumeRecording,
        discardRecording,
        clearRecording,
        downloadRecording,
    };
};

export default useCapture;
