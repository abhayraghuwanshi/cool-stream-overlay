import fs from 'fs';
import http from 'http';
import { WebSocketServer } from 'ws';

let chat, loadModel, getStatus, getAvailableModels, downloadModel, unloadModel, onProgress;
// Import your existing Local LLM script natively from the local file!
const llmPath = './locaLLM.js';

async function setupLLM() {
    try {
        console.log('Loading local LLM module...');
        const localLLM = await import(llmPath);
        chat = localLLM.chat;
        loadModel = localLLM.loadModel;
        getStatus = localLLM.getStatus;
        getAvailableModels = localLLM.getAvailableModels;
        downloadModel = localLLM.downloadModel;
        unloadModel = localLLM.unloadModel;
        onProgress = localLLM.onProgress;

        if (onProgress) {
            onProgress((type, progress, modelName, error) => {
                broadcast(JSON.stringify({
                    type: 'llm-progress',
                    payload: { type, progress, modelName, error }
                }));
            });
        }

        console.log('Initializing Llama.cpp...');
        await localLLM.initializeLLM();

        const models = getAvailableModels ? getAvailableModels() : {};
        let modelToLoad = null;

        // Check if the user already has ANY model downloaded locally
        for (const [modelKey, modelInfo] of Object.entries(models)) {
            if (modelInfo.downloaded) {
                modelToLoad = modelKey;
                break;
            }
        }

        if (modelToLoad) {
            console.log(`Found existing downloaded model. Auto-loading: ${modelToLoad}...`);
            await loadModel(modelToLoad);
            console.log('✅ Local LLM is completely ready! Send a message from the extension.');
        } else {
            console.log('⚠️ No AI models downloaded yet. Please download one from the Local AI Settings tab.');
        }
    } catch (e) {
        console.error('❌ Failed to initialize Local LLM:', e);
    }
}

// Start booting up the LLM in the background when the server starts
setupLLM();

const layoutSettingsFile = './layout-settings.json';
let layoutSettings = {
    showFaceCam: true,
    showHandCam: true,
    showRoomCam: true
};

try {
    if (fs.existsSync(layoutSettingsFile)) {
        layoutSettings = { ...layoutSettings, ...JSON.parse(fs.readFileSync(layoutSettingsFile, 'utf8')) };
    }
} catch (e) {
    console.error('Failed to load layout settings from file', e);
}

function saveLayoutSettings() {
    try {
        fs.writeFileSync(layoutSettingsFile, JSON.stringify(layoutSettings, null, 2));
    } catch (e) {
        console.error('Failed to save layout settings to file', e);
    }
}

const server = http.createServer((req, res) => {
    // Basic CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    if (req.method === 'GET' && req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok' }));
        return;
    }

    if (req.method === 'GET' && req.url === '/llm/status') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(getStatus ? getStatus() : { initialized: false }));
        return;
    }

    if (req.method === 'GET' && req.url === '/llm/models') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(getAvailableModels ? getAvailableModels() : {}));
        return;
    }

    if (req.method === 'GET' && req.url === '/layout') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(layoutSettings));
        return;
    }

    if (req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', async () => {
            let data = {};
            try { data = JSON.parse(body); } catch (e) { }

            if (req.url === '/llm/download') {
                try {
                    if (downloadModel) {
                        downloadModel(data.modelName).catch(e => console.error(e));
                    }
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ ok: true }));
                } catch (e) {
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ ok: false, error: e.message }));
                }
                return;
            }

            if (req.url === '/llm/load') {
                try {
                    if (loadModel) await loadModel(data.modelName);
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ ok: true }));
                } catch (e) {
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ ok: false, error: e.message }));
                }
                return;
            }

            if (req.url === '/llm/unload') {
                try {
                    if (unloadModel) await unloadModel();
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ ok: true }));
                } catch (e) {
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ ok: false, error: e.message }));
                }
                return;
            }

            if (req.url === '/layout') {
                try {
                    layoutSettings = { ...layoutSettings, ...data };
                    saveLayoutSettings();
                    // Let all connected OBS overlays see the change instantly
                    broadcast(JSON.stringify({ type: 'layout-update', payload: layoutSettings }));
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ ok: true }));
                } catch (e) {
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ ok: false, error: e.message }));
                }
                return;
            }

            res.writeHead(404);
            res.end();
        });
        return;
    }

    if (req.method !== 'POST') {
        res.writeHead(404);
        res.end();
    }
});

const wss = new WebSocketServer({ server });

wss.on('connection', function connection(ws) {
    console.log('New client connected to OBS Overlay!');

    ws.on('message', async function message(data) {
        console.log('Received payload from extension:', data);

        let parsedData;
        try {
            parsedData = JSON.parse(data);
        } catch (e) {
            parsedData = { type: 'text', payload: data.toString() };
        }

        // 1. Instantly forward what you highlighted so it shows up on stream
        broadcast(JSON.stringify(parsedData));

        // 2. If the LLM is loaded, feed it the context and get a reaction!
        if (chat && parsedData.type !== 'system' && parsedData.payload) {
            try {
                // Construct a prompt giving the AI context that it is on a stream
                const prompt = `You are an AI co-host for a tech stream. The streamer just highlighted this content on screen:
"${parsedData.payload}"

Give a witty, short (1-2 sentences) reaction to it for the live audience. Do NOT introduce yourself as an AI, just give direct, snappy commentary.`;

                // Note: Tell your overlay the AI is typing...
                broadcast(JSON.stringify({ type: 'typing', payload: true }));

                const aiResponse = await chat(prompt, { maxTokens: 100, temperature: 0.8 });

                // Send the AI's actual reaction back to your Overlay widget!
                broadcast(JSON.stringify({ type: 'typing', payload: false }));
                broadcast(JSON.stringify({ type: 'text', role: 'ai', payload: aiResponse.trim() }));

            } catch (err) {
                console.error('LLM Chat Error:', err);
                broadcast(JSON.stringify({ type: 'typing', payload: false }));
                broadcast(JSON.stringify({ type: 'text', role: 'ai', payload: `Core overloaded.` }));
            }
        } else if (!chat) {
            broadcast(JSON.stringify({ type: 'text', role: 'ai', payload: `Still booting up...` }));
        }
    });

    ws.on('close', () => {
        console.log('Client disconnected');
    });
});

function broadcast(msgStr) {
    wss.clients.forEach(function each(client) {
        if (client.readyState === 1 /* WebSocket.OPEN */) {
            client.send(msgStr);
        }
    });
}

server.listen(8080, () => {
    console.log('WebSocket & HTTP Server running on http://localhost:8080');
});
