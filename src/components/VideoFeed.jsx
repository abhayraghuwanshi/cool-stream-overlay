import { memo, useEffect, useRef } from 'react';

const VideoFeed = ({ stream, label, muted = true }) => {
    const videoRef = useRef(null);

    useEffect(() => {
        const el = videoRef.current;
        if (!el) return;
        el.srcObject = stream ?? null;
        if (stream) el.play().catch(() => {});
    }, [stream]);

    // Resume playback when switching back to this tab — browsers can pause
    // video elements in background tabs, causing them to freeze on return.
    useEffect(() => {
        const el = videoRef.current;
        if (!el) return;
        const handleVisibility = () => {
            if (!document.hidden && el.srcObject && el.paused) {
                el.play().catch(() => {});
            }
        };
        document.addEventListener('visibilitychange', handleVisibility);
        return () => document.removeEventListener('visibilitychange', handleVisibility);
    }, []);

    return (
        <div className="w-full h-full bg-black relative overflow-hidden">
            {stream && (
                <video
                    ref={videoRef}
                    autoPlay
                    muted={muted}
                    playsInline
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
            )}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-black/60 backdrop-blur rounded-full border border-white/5 z-10">
                <span className="text-[8px] uppercase font-bold text-white/80 tracking-widest">{label}</span>
            </div>
        </div>
    );
};

export default memo(VideoFeed);
