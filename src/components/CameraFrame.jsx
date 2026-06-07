// Styled frames for camera feeds. A frame wraps a VideoFeed and applies a
// border / glow / shape so the cam reads as a designed element rather than a
// bare rectangle. Frames are pure CSS so they composite correctly into the
// recording canvas and OBS.

export const CAMERA_FRAMES = [
    { id: 'none',     label: 'None' },
    { id: 'soft',     label: 'Soft' },
    { id: 'ring',     label: 'Ring' },
    { id: 'neon',     label: 'Neon' },
    { id: 'gradient', label: 'Gradient' },
    { id: 'glass',    label: 'Glass' },
    { id: 'circle',   label: 'Circle' },
];

export const DEFAULT_CAM_STYLE = { frame: 'soft', radius: 14 };

// Returns { outer, inner } style objects. `outer` carries the visible frame
// (border / glow / gradient padding); `inner` clips the video to the matching
// radius so corners stay clean.
const buildFrame = (frame, accent, accent2, radius) => {
    const r = typeof radius === 'number' ? radius : 14;
    const clip = { overflow: 'hidden' };
    switch (frame) {
        case 'soft':
            return {
                outer: { borderRadius: r, ...clip, boxShadow: '0 10px 34px rgba(0,0,0,0.55)' },
                inner: { borderRadius: r, ...clip },
            };
        case 'ring':
            return {
                outer: { borderRadius: r, ...clip, border: `3px solid ${accent}`, boxShadow: '0 8px 28px rgba(0,0,0,0.5)' },
                inner: { borderRadius: Math.max(r - 3, 0), ...clip },
            };
        case 'neon':
            return {
                outer: {
                    borderRadius: r, ...clip, border: `2px solid ${accent}`,
                    boxShadow: `0 0 16px ${accent}aa, 0 0 38px ${accent}55, inset 0 0 14px ${accent}33`,
                },
                inner: { borderRadius: Math.max(r - 2, 0), ...clip },
            };
        case 'gradient':
            return {
                outer: {
                    borderRadius: r, padding: 3,
                    background: `linear-gradient(135deg, ${accent}, ${accent2 || accent})`,
                    boxShadow: '0 10px 34px rgba(0,0,0,0.55)',
                },
                inner: { borderRadius: Math.max(r - 3, 0), ...clip },
            };
        case 'glass':
            return {
                outer: {
                    borderRadius: r, padding: 1.5,
                    background: 'linear-gradient(135deg, rgba(255,255,255,0.55), rgba(255,255,255,0.06) 45%, rgba(255,255,255,0.25))',
                    boxShadow: '0 10px 34px rgba(0,0,0,0.5)',
                },
                inner: { borderRadius: Math.max(r - 1.5, 0), ...clip },
            };
        case 'circle':
            return {
                outer: {
                    borderRadius: '50%', ...clip, border: `3px solid ${accent}`,
                    boxShadow: `0 0 22px ${accent}66, 0 8px 30px rgba(0,0,0,0.5)`,
                },
                inner: { borderRadius: '50%', ...clip },
            };
        default:
            return { outer: {}, inner: {} };
    }
};

const CameraFrame = ({ frame = 'none', accent = '#6366f1', accent2, radius, children }) => {
    if (!frame || frame === 'none') {
        return <div style={{ width: '100%', height: '100%' }}>{children}</div>;
    }
    const { outer, inner } = buildFrame(frame, accent, accent2, radius);
    return (
        <div style={{ width: '100%', height: '100%', boxSizing: 'border-box', ...outer }}>
            <div style={{ width: '100%', height: '100%', ...inner }}>{children}</div>
        </div>
    );
};

export default CameraFrame;
