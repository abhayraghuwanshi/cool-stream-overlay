// ⚙️ Backend WebSocket URL — change the port here if you changed it in ports.config.js
const BACKEND_WS = 'ws://127.0.0.1:3388';

document.getElementById('sendBtn').addEventListener('click', () => {
    const text = document.getElementById('msgInput').value;
    if (!text.trim()) return;

    const statusDiv = document.getElementById('status');
    statusDiv.textContent = 'Sending...';

    const ws = new WebSocket(BACKEND_WS);

    ws.onopen = () => {
        ws.send(JSON.stringify({ type: 'text', payload: text }));
        document.getElementById('msgInput').value = '';

        // UI Feedback
        const btn = document.getElementById('sendBtn');
        btn.textContent = "Sent! 🚀";
        btn.style.background = "#10b981";
        statusDiv.textContent = 'Message sent to stream overlay.';

        setTimeout(() => {
            btn.textContent = "Send Message";
            btn.style.background = "#3b82f6";
            statusDiv.textContent = '';
            ws.close();
        }, 1500);
    };

    ws.onerror = (err) => {
        statusDiv.textContent = "Error: Cannot connect to WebSocket server. Is node server.js running?";
        statusDiv.style.color = "#ef4444";
    }
});
