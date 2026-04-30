import JSZip from 'jszip';
import { useCallback, useEffect, useRef, useState } from 'react';

export const formatElapsed = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return [h, m, s].map(v => String(v).padStart(2, '0')).join(':');
};

const MAX_SCREENS  = 4;
const CAMERA_SLOTS = ['faceCam', 'handCam', 'roomCam'];


const HIGH_QUALITY_VIDEO = { frameRate: { ideal: 60 } };

// 20 Mbps — headroom for 1080p60 with H.264 hardware encode
const VIDEO_BITS_PER_SECOND = 20_000_000;

// Pick the best supported mimeType for a given stream.
// If the stream has no audio tracks, strip the audio codec from the spec
// so the browser doesn't reject it for a missing audio track.
const getMimeTypeForStream = (stream) => {
    const hasAudio = stream.getAudioTracks().length > 0;
    const types = hasAudio
        ? [
            'video/mp4;codecs=avc1.640028,mp4a.40.2',
            'video/webm;codecs=h264,opus',
            'video/webm;codecs=vp9,opus',
            'video/webm;codecs=vp8,opus',
            'video/webm',
          ]
        : [
            'video/mp4;codecs=avc1.640028',
            'video/webm;codecs=h264',
            'video/webm;codecs=vp9',
            'video/webm;codecs=vp8',
            'video/webm',
          ];
    return types.find(t => MediaRecorder.isTypeSupported(t)) ?? '';
};

const makeRecorder = (stream, mimeType) =>
    new MediaRecorder(stream, {
        ...(mimeType ? { mimeType } : {}),
        videoBitsPerSecond: VIDEO_BITS_PER_SECOND,
    });

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

    const [recording, setRecording] = useState({
        active: false, paused: false, elapsed: 0,
        blob: null, error: null, mode: 'single',
    });
    const [errors, setErrors] = useState({
        faceCam: null, handCam: null, roomCam: null, mic: null, screen: null,
    });

    const recorderRef      = useRef(null);   // primary recorder (single or composite)
    const multiTrackRef    = useRef(null);   // { trackRecorders, tabStream, allStopped, layoutSnapshot }
    const chunksRef        = useRef([]);
    const timerRef         = useRef(null);
    const discardRef       = useRef(false);
    const streamsRef       = useRef(streams);
    const screensRef       = useRef(screens);
    const boxesRef         = useRef(boxes);
    streamsRef.current     = streams;
    screensRef.current     = screens;
    boxesRef.current       = boxes;

    // ── Device enumeration ────────────────────────────────────────────────────
    const enumerateDevices = useCallback(async () => {
        try {
            const all = await navigator.mediaDevices.enumerateDevices();
            setDevices({
                cameras: all.filter(d => d.kind === 'videoinput' && d.deviceId)
                             .map((d, i) => ({ deviceId: d.deviceId, label: d.label || `Camera ${i + 1}` })),
                mics:    all.filter(d => d.kind === 'audioinput' && d.deviceId)
                             .map((d, i) => ({ deviceId: d.deviceId, label: d.label || `Microphone ${i + 1}` })),
            });
        } catch (e) { console.error('enumerateDevices failed', e); }
    }, []);

    useEffect(() => {
        // On Windows, enumerateDevices returns empty deviceIds until permission is granted.
        // Request access briefly upfront so subsequent enumerations return real IDs/labels.
        navigator.mediaDevices
            .getUserMedia({ video: true, audio: true })
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

    // ── Single-track recording (tab capture — full overlay as seen on screen) ─
    const startRecording = useCallback(async () => {
        if (isObsRecording || recorderRef.current) return;

        try {
            const tabStream = await navigator.mediaDevices.getDisplayMedia({
                video: { displaySurface: 'browser', ...HIGH_QUALITY_VIDEO },
                audio: true,
                preferCurrentTab: true,
                selfBrowserSurface: 'include',
            });

            const micStream = streamsRef.current.mic;
            if (micStream) {
                micStream.getAudioTracks()
                    .filter(t => t.readyState !== 'ended')
                    .forEach(t => tabStream.addTrack(t));
            }

            const mimeType = getMimeTypeForStream(tabStream);
            const recorder = makeRecorder(tabStream, mimeType);

            chunksRef.current  = [];
            discardRef.current = false;

            recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
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

            tabStream.getVideoTracks()[0]?.addEventListener('ended', () => {
                stopTimer();
                if (recorderRef.current?.state !== 'inactive') recorderRef.current.stop();
            }, { once: true });

            recorder.start(1000);
            recorderRef.current = recorder;
            startTimer();
            setRecording({ active: true, paused: false, elapsed: 0, blob: null, error: null, mode: 'single' });

        } catch (e) {
            if (e.name !== 'NotAllowedError') {
                console.error('Recording failed:', e);
                setRecording(r => ({ ...r, error: e.message || 'Recording failed.' }));
            }
        }
    }, [isObsRecording]);

    // ── Multi-track recording ─────────────────────────────────────────────────
    // Records every active source as its own file PLUS the full composited tab.
    // On stop, bundles everything into a ZIP with a manifest.json for re-editing.
    const startMultiTrackRecording = useCallback(async ({ background, zOrder, elements } = {}) => {
        if (isObsRecording || recorderRef.current) return;

        try {
            const currentScreens = screensRef.current;
            const currentStreams  = streamsRef.current;
            const currentBoxes   = boxesRef.current ?? {};
            const startTime      = Date.now();

            // ── Capture composite tab ────────────────────────────────────────
            const tabStream = await navigator.mediaDevices.getDisplayMedia({
                video: { displaySurface: 'browser', ...HIGH_QUALITY_VIDEO },
                audio: true,
                preferCurrentTab: true,
                selfBrowserSurface: 'include',
            });

            if (currentStreams.mic) {
                currentStreams.mic.getAudioTracks()
                    .filter(t => t.readyState !== 'ended')
                    .forEach(t => tabStream.addTrack(t));
            }

            // ── Build individual track list ───────────────────────────────────
            // Each track: { id, label, type, stream, recorder, chunks }
            const tracks = [];

            for (const sc of currentScreens) {
                // Combine screen video + mic audio into each screen track
                const trackStream = new MediaStream([
                    ...sc.stream.getVideoTracks(),
                    ...sc.stream.getAudioTracks(),
                    ...(currentStreams.mic?.getAudioTracks().filter(t => t.readyState !== 'ended') ?? []),
                ]);
                tracks.push({ id: `screen_${sc.slot}`, label: sc.label, type: 'screen', stream: trackStream });
            }

            const camSlots = [
                { id: 'faceCam', label: 'Face Cam' },
                { id: 'handCam', label: 'Hand Cam' },
                { id: 'roomCam', label: 'Room Cam' },
            ];
            for (const { id, label } of camSlots) {
                const camStream = currentStreams[id];
                if (!camStream) continue;
                const trackStream = new MediaStream([
                    ...camStream.getVideoTracks(),
                    ...(currentStreams.mic?.getAudioTracks().filter(t => t.readyState !== 'ended') ?? []),
                ]);
                tracks.push({ id, label, type: 'camera', stream: trackStream });
            }

            // Composite goes last so it's easy to find
            tracks.push({ id: 'composite', label: 'Final Output', type: 'composite', stream: tabStream });

            // ── Wire up one MediaRecorder per track ───────────────────────────
            let doneCount = 0;
            let resolveAll;
            const allStopped = new Promise(resolve => { resolveAll = resolve; });

            const trackRecorders = tracks.map(track => {
                const chunks          = [];
                // Use per-stream mimeType so audio-codec spec doesn't reject video-only streams
                const trackMimeType   = getMimeTypeForStream(track.stream);
                const recorder        = makeRecorder(track.stream, trackMimeType);
                recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
                recorder.onstop = () => {
                    doneCount++;
                    if (doneCount === trackRecorders.length) resolveAll();
                };
                return { ...track, recorder, chunks, mimeType: trackMimeType };
            });

            // Use composite recorder as primary (for pause/resume controls)
            const compositeRec = trackRecorders.find(t => t.id === 'composite');
            recorderRef.current = compositeRec?.recorder ?? null;

            discardRef.current = false;

            multiTrackRef.current = {
                trackRecorders,
                tabStream,
                allStopped,
                layoutSnapshot: { startTime, background, zOrder, boxes: currentBoxes, elements: elements ?? [] },
            };

            // ── Start all recorders simultaneously ────────────────────────────
            trackRecorders.forEach(tr => tr.recorder.start(1000));
            startTimer();
            setRecording({ active: true, paused: false, elapsed: 0, blob: null, error: null, mode: 'multi' });

            tabStream.getVideoTracks()[0]?.addEventListener('ended', () => {
                // Check multiTrackRef, not recorderRef — the composite recorder may already
                // be inactive by the time this event fires (stream ended before we got here).
                if (multiTrackRef.current) stopMultiTrackRecording();
            }, { once: true });

        } catch (e) {
            if (e.name !== 'NotAllowedError') {
                console.error('Multi-track recording failed:', e);
                setRecording(r => ({ ...r, error: e.message || 'Recording failed.' }));
            }
        }
    }, [isObsRecording]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Build ZIP and finish multi-track session ───────────────────────────────
    const stopMultiTrackRecording = useCallback(async () => {
        const mt = multiTrackRef.current;
        if (!mt) return;

        const { trackRecorders, tabStream, allStopped, layoutSnapshot } = mt;

        // Stop every recorder
        trackRecorders.forEach(tr => {
            if (tr.recorder.state !== 'inactive') tr.recorder.stop();
        });
        stopTimer();

        // Wait for all onstop callbacks to fire
        await allStopped;

        tabStream.getTracks().forEach(t => t.stop());
        recorderRef.current  = null;
        multiTrackRef.current = null;

        if (discardRef.current) {
            discardRef.current = false;
            setRecording({ active: false, paused: false, elapsed: 0, blob: null, error: null, mode: 'single' });
            return;
        }

        // ── Bundle into ZIP ───────────────────────────────────────────────────
        const zip      = new JSZip();
        const manifest = { ...layoutSnapshot, tracks: [] };

        for (const tr of trackRecorders) {
            const trMime   = tr.mimeType || 'video/webm';
            const ext      = trMime.includes('mp4') ? 'mp4' : 'webm';
            const blob     = new Blob(tr.chunks, { type: trMime });
            const filename = tr.id === 'composite'
                ? `composite.${ext}`
                : `tracks/${tr.id}.${ext}`;
            zip.file(filename, blob);
            manifest.tracks.push({ id: tr.id, label: tr.label, type: tr.type, file: filename, mimeType: trMime });
        }

        zip.file('manifest.json', JSON.stringify(manifest, null, 2));

        // STORE = no re-compression on already-encoded video
        const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'STORE',
            mimeType: 'application/zip' });
        discardRef.current = false;
        setRecording(r => ({ ...r, active: false, paused: false, blob: zipBlob, error: null, mode: 'multi' }));
    }, []);

    // ── Unified stop — handles both modes ────────────────────────────────────
    const stopRecording = useCallback(() => {
        if (multiTrackRef.current) {
            stopMultiTrackRecording();
        } else {
            if (recorderRef.current && recorderRef.current.state !== 'inactive') recorderRef.current.stop();
            stopTimer();
        }
    }, [stopMultiTrackRecording]);

    const pauseRecording = useCallback(() => {
        if (multiTrackRef.current) {
            multiTrackRef.current.trackRecorders.forEach(tr => {
                if (tr.recorder.state === 'recording') tr.recorder.pause();
            });
        } else {
            if (recorderRef.current?.state !== 'recording') return;
            recorderRef.current.pause();
        }
        stopTimer();
        setRecording(r => ({ ...r, paused: true }));
    }, []);

    const resumeRecording = useCallback(() => {
        if (multiTrackRef.current) {
            multiTrackRef.current.trackRecorders.forEach(tr => {
                if (tr.recorder.state === 'paused') tr.recorder.resume();
            });
        } else {
            if (recorderRef.current?.state !== 'paused') return;
            recorderRef.current.resume();
        }
        startTimer();
        setRecording(r => ({ ...r, paused: false }));
    }, []);

    const discardRecording = useCallback(() => {
        discardRef.current = true;
        chunksRef.current  = [];
        if (multiTrackRef.current) {
            stopMultiTrackRecording();
        } else if (recorderRef.current && recorderRef.current.state !== 'inactive') {
            recorderRef.current.stop();
        } else {
            setRecording({ active: false, paused: false, elapsed: 0, blob: null, error: null, mode: 'single' });
        }
        stopTimer();
    }, [stopMultiTrackRecording]);

    const clearRecording = useCallback(() => {
        chunksRef.current = [];
        setRecording({ active: false, paused: false, elapsed: 0, blob: null, error: null, mode: 'single' });
    }, []);

    const downloadRecording = useCallback((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const ext = blob.type.includes('zip') ? 'zip'
                  : blob.type.includes('mp4') ? 'mp4'
                  : 'webm';
        const a = Object.assign(document.createElement('a'), {
            href: url, download: `capture-${Date.now()}.${ext}`,
        });
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
        multiTrackRef.current?.trackRecorders.forEach(tr => { try { tr.recorder.stop(); } catch (_) {} });
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
        startMultiTrackRecording,
        stopRecording,
        pauseRecording,
        resumeRecording,
        discardRecording,
        clearRecording,
        downloadRecording,
    };
};

export default useCapture;
