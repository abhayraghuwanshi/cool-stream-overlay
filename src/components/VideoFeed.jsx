import { memo, useEffect, useRef } from 'react';

const VideoFeed = ({ stream, label, muted = true, fit = 'cover' }) => {
    const videoRef = useRef(null);
    const attachedStreamRef = useRef(null);

    useEffect(() => {
        const el = videoRef.current;
        if (!el) return;
        // React never writes muted={true} as a DOM attribute (known React bug).
        // Set it via property first so Chrome's autoplay policy allows streams
        // that include an audio track (e.g. display captures with audio:true).
        el.muted = true;

        if (attachedStreamRef.current === stream && el.srcObject === stream) {
            if (stream && el.paused) {
                el.play().catch(err => {
                    console.warn('[VideoFeed] play() failed:', err.name, err.message);
                });
            }
            return;
        }

        attachedStreamRef.current = stream ?? null;
        el.srcObject = stream ?? null;
        if (stream) {
            // load() re-initialises the media pipeline after srcObject changes —
            // avoids stale state from a previous stream on the same element.
            el.load();
            el.play().catch(err => {
                // Log so we can see failures in DevTools instead of silent black screen.
                console.warn('[VideoFeed] play() failed:', err.name, err.message);
            });
        }
    }, [stream]);

    // Resume if the browser paused the video when the tab went to the background.
    useEffect(() => {
        const el = videoRef.current;
        if (!el) return;
        const resume = () => {
            if (!document.hidden && el.srcObject && el.paused) {
                el.play().catch(() => {});
            }
        };
        document.addEventListener('visibilitychange', resume);
        return () => document.removeEventListener('visibilitychange', resume);
    }, []);

    return (
        <div className="w-full h-full bg-black relative overflow-hidden">
            {/*
              Always keep <video> in the DOM so videoRef is set before the first
              stream arrives. Conditional rendering (`stream && <video>`) can race
              with React 18 concurrent renders and leave ref null when the effect fires.
              Use `visibility` instead of conditional rendering for the hide/show.
            */}
            <video
                ref={videoRef}
                autoPlay
                playsInline
                style={{
                    width: '100%', height: '100%',
                    objectFit: fit, display: 'block',
                    visibility: stream ? 'visible' : 'hidden',
                }}
            />
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-black/60 backdrop-blur rounded-full border border-white/5 z-10">
                <span className="text-[8px] uppercase font-bold text-white/80 tracking-widest">{label}</span>
            </div>
        </div>
    );
};

export default memo(VideoFeed);
