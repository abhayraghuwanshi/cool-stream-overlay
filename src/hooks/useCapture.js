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

    // ── Canvas composite from existing live video elements ────────────────────
    // videoEls: { boxId → <video> } queried from the overlay canvas before record.
    // These elements are already decoded and rendering — drawImage works reliably.
    // No getDisplayMedia needed → no sharing dialog, no green bar, no banner.
    const buildCompositeStream = ({ background, zOrder = [], elements = [], videoEls = {} } = {}) => {
        const W = 1920, H = 1080;
        const canvas = document.createElement('canvas');
        canvas.width = W; canvas.height = H;
        canvas.style.cssText = 'position:fixed;top:0;left:0;opacity:0.001;pointer-events:none;z-index:-9999;';
        document.body.appendChild(canvas);
        const ctx = canvas.getContext('2d', { alpha: false });

        const drawVid = (id) => {
            const vid = videoEls[id]; const box = boxesRef.current[id];
            if (!vid || !box) return;
            try { ctx.drawImage(vid, (box.x/100)*W, (box.y/100)*H, (box.w/100)*W, (box.h/100)*H); } catch (_) {}
        };

        const drawCustomEl = (el) => {
            if (el.hidden || !el.box) return;
            const bx=(el.box.x/100)*W, by=(el.box.y/100)*H, bw=(el.box.w/100)*W, bh=(el.box.h/100)*H;
            ctx.save(); ctx.fillStyle=el.color??'#fff'; ctx.textAlign='center'; ctx.textBaseline='middle';
            if (el.type==='clock') { ctx.font=`bold ${Math.round(bh*0.5)}px monospace`; ctx.fillText(new Date().toLocaleTimeString(),bx+bw/2,by+bh/2); }
            else if (el.type==='text') { ctx.font=`${Math.round(bh*0.5)}px sans-serif`; ctx.fillText(el.text??'',bx+bw/2,by+bh/2); }
            ctx.restore();
        };

        const stream = canvas.captureStream(30);

        let rafId;
        const paint = () => {
            const bg = background;
            if (!bg||bg.type==='transparent') { ctx.clearRect(0,0,W,H); }
            else if (bg.type==='gradient') {
                const angle=(parseFloat(bg.dir)||135)*Math.PI/180, len=Math.hypot(W,H);
                const g=ctx.createLinearGradient(W/2-Math.cos(angle)*len/2,H/2-Math.sin(angle)*len/2,W/2+Math.cos(angle)*len/2,H/2+Math.sin(angle)*len/2);
                g.addColorStop(0,bg.from); g.addColorStop(1,bg.to); ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
            } else { ctx.fillStyle=bg.color??'#0a0a0f'; ctx.fillRect(0,0,W,H); }
            const order = zOrder.length ? zOrder : Object.keys(boxesRef.current);
            for (const id of order) drawVid(id);
            for (const el of elements) drawCustomEl(el);
            rafId = requestAnimationFrame(paint);
        };
        paint();

        // Mix audio: mic + any screen-capture audio
        try {
            const actx = new AudioContext();
            const dest = actx.createMediaStreamDestination();
            let hasAudio = false;
            const addAudio = (s) => {
                const alive = s.getAudioTracks().filter(t=>t.readyState!=='ended');
                if (!alive.length) return;
                actx.createMediaStreamSource(new MediaStream(alive)).connect(dest);
                hasAudio = true;
            };
            const cur = streamsRef.current;
            if (cur.mic) addAudio(cur.mic);
            for (const sc of screensRef.current) addAudio(sc.stream);
            if (hasAudio) dest.stream.getAudioTracks().forEach(t=>stream.addTrack(t));
        } catch (_) {}

        const stop = () => { cancelAnimationFrame(rafId); canvas.remove(); stream.getTracks().forEach(t=>t.stop()); };
        return { stream, stop };
    };

    // ── Single-track recording ────────────────────────────────────────────────
    const startRecording = useCallback(async ({ background, zOrder, elements, videoEls = {} } = {}) => {
        if (isObsRecording || recorderRef.current) return;
        try {
            const { stream, stop: stopComposite } = buildCompositeStream({ background, zOrder, elements, videoEls });
            const mimeType = getMimeTypeForStream(stream);
            const recorder = makeRecorder(stream, mimeType);
            chunksRef.current = []; discardRef.current = false;
            recorder.ondataavailable = (e) => { if (e.data.size>0) chunksRef.current.push(e.data); };
            recorder.onstop = () => {
                stopTimer(); stopComposite();
                const blob = discardRef.current ? null : new Blob(chunksRef.current, { type: mimeType||'video/webm' });
                setRecording(r => ({ ...r, active: false, paused: false, blob, error: null }));
                recorderRef.current = null; discardRef.current = false;
            };
            recorder.start(1000);
            recorderRef.current = recorder;
            startTimer();
            setRecording({ active: true, paused: false, elapsed: 0, blob: null, error: null, mode: 'single' });
        } catch (e) {
            console.error('Recording failed:', e);
            setRecording(r => ({ ...r, error: e.message||'Recording failed.' }));
        }
    }, [isObsRecording]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Multi-track recording ─────────────────────────────────────────────────
    const startMultiTrackRecording = useCallback(async ({ background, zOrder, elements, videoEls = {} } = {}) => {
        if (isObsRecording || recorderRef.current) return;
        try {
            const currentScreens = screensRef.current;
            const currentStreams  = streamsRef.current;
            const currentBoxes   = boxesRef.current ?? {};
            const startTime      = Date.now();

            const { stream: tabStream, stop: stopComposite } = buildCompositeStream({ background, zOrder, elements, videoEls });

            const tracks = [];
            for (const sc of currentScreens) {
                tracks.push({ id:`screen_${sc.slot}`, label:sc.label, type:'screen', stream: new MediaStream([
                    ...sc.stream.getVideoTracks(), ...sc.stream.getAudioTracks(),
                    ...(currentStreams.mic?.getAudioTracks().filter(t=>t.readyState!=='ended')??[]),
                ]) });
            }
            for (const { id, label } of [{ id:'faceCam',label:'Face Cam' },{ id:'handCam',label:'Hand Cam' },{ id:'roomCam',label:'Room Cam' }]) {
                const camStream = currentStreams[id];
                if (!camStream) continue;
                tracks.push({ id, label, type:'camera', stream: new MediaStream([
                    ...camStream.getVideoTracks(),
                    ...(currentStreams.mic?.getAudioTracks().filter(t=>t.readyState!=='ended')??[]),
                ]) });
            }
            tracks.push({ id:'composite', label:'Final Output', type:'composite', stream: tabStream });

            let doneCount=0, resolveAll;
            const allStopped = new Promise(resolve => { resolveAll=resolve; });
            const trackRecorders = tracks.map(track => {
                const chunks=[], trackMimeType=getMimeTypeForStream(track.stream);
                const recorder=makeRecorder(track.stream, trackMimeType);
                recorder.ondataavailable=(e)=>{ if(e.data.size>0)chunks.push(e.data); };
                recorder.onstop=()=>{ if(++doneCount===trackRecorders.length)resolveAll(); };
                return { ...track, recorder, chunks, mimeType:trackMimeType };
            });

            recorderRef.current = trackRecorders.find(t=>t.id==='composite')?.recorder??null;
            discardRef.current = false;
            multiTrackRef.current = {
                trackRecorders, stopComposite, allStopped,
                layoutSnapshot: { startTime, background, zOrder, boxes: currentBoxes, elements: elements??[] },
            };
            trackRecorders.forEach(tr=>tr.recorder.start(1000));
            startTimer();
            setRecording({ active: true, paused: false, elapsed: 0, blob: null, error: null, mode: 'multi' });
        } catch (e) {
            console.error('Multi-track recording failed:', e);
            setRecording(r => ({ ...r, error: e.message||'Recording failed.' }));
        }
    }, [isObsRecording]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Build ZIP and finish multi-track session ───────────────────────────────
    const stopMultiTrackRecording = useCallback(async () => {
        const mt = multiTrackRef.current;
        if (!mt) return;
        const { trackRecorders, stopComposite, allStopped, layoutSnapshot } = mt;
        trackRecorders.forEach(tr => { if (tr.recorder.state!=='inactive') tr.recorder.stop(); });
        stopTimer();
        await allStopped;
        stopComposite();
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
