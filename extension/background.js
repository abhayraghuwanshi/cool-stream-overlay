// ⚙️ Backend WebSocket URL — change the port here if you changed it in ports.config.js
const BACKEND_WS = 'ws://127.0.0.1:3388';

chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: "send_to_overlay",
        title: "Send to OBS AI Overlay",
        contexts: ["selection", "image", "link", "page"]
    });
});

function sendToOverlay(type, payload) {
    const ws = new WebSocket(BACKEND_WS);

    ws.onopen = () => {
        ws.send(JSON.stringify({ type, payload }));
        ws.close();
    };

    ws.onerror = (error) => {
        console.error("WebSocket Error, is the local server running?", error);
    };
}

chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "send_to_overlay") {
        let payload = "";
        let type = "text";

        if (info.selectionText) {
            payload = info.selectionText;
            type = "text";
        } else if (info.srcUrl) {
            payload = info.srcUrl;
            type = "image";
        } else if (info.linkUrl) {
            payload = info.linkUrl;
            type = "link";
        } else {
            payload = info.pageUrl;
            type = "url";
        }

        sendToOverlay(type, payload);
    }
});
