// Mood vocabulary shared by the Sentiment Mood-ring and the Channel Pet so the
// two stay visually in sync. OverlayLayout resolves the *live* mood (manual pick
// or auto-cycle) once and threads it to every element, so a pet placed anywhere
// reacts to whatever the mood-ring is showing.
//
// Each mood carries: a colour (ring aura / pet tint), an emoji, a short label,
// and a `mouth` shape the pet draws.

export const MOODS = [
    { id: 'chill', label: 'Chill', color: '#38bdf8', emoji: '😌', mouth: 'soft' },
    { id: 'hype',  label: 'Hype',  color: '#fb7185', emoji: '🤩', mouth: 'open' },
    { id: 'focus', label: 'Focus', color: '#a78bfa', emoji: '😐', mouth: 'flat' },
    { id: 'cozy',  label: 'Cozy',  color: '#fbbf24', emoji: '☺️', mouth: 'smile' },
];

export const DEFAULT_MOOD = MOODS[0];

export const getMood = (id) => MOODS.find(m => m.id === id) ?? DEFAULT_MOOD;
