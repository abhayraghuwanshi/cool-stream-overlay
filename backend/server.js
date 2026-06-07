import fs from 'fs';
import http from 'http';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer } from 'ws';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const { PORTS } = await import(`file://${join(__dirname, '..', 'ports.config.js').replace(/\\/g, '/')}`);

let chat, loadModel, getStatus, getAvailableModels, downloadModel, unloadModel, onProgress;
// Import your existing Local LLM script natively from the local file!
const llmPath = './locaLLM.js';
let llmModulePromise = null;

async function ensureLLMModule() {
    if (llmModulePromise) return llmModulePromise;

    llmModulePromise = (async () => {
        try {
            console.log('Loading local LLM module on demand...');
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

            console.log('Local LLM module ready. Model loading is manual.');
        } catch (e) {
            llmModulePromise = null;
            console.error('Failed to prepare Local LLM module:', e);
        }
    })();

    return llmModulePromise;
}

// Local LLM is intentionally lazy. Do not initialize llama.cpp or load a model
// on server startup; slow laptops should stay responsive until the user clicks
// Download/Load in the Local AI settings.

const layoutSettingsFile = './layout-settings.json';
let layoutSettings = {
    showFaceCam: true,
    showHandCam: true,
    showRoomCam: true,
    tasks: [{ id: 1, text: "Refactoring Overlay", status: "active" }]
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

const server = http.createServer(async (req, res) => {
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
        res.end(JSON.stringify(getStatus ? getStatus() : {
            initialized: false,
            modelLoaded: false,
            currentModel: null,
            isLoading: false,
            loadProgress: 0,
            lazy: true
        }));
        return;
    }

    if (req.method === 'GET' && req.url === '/llm/models') {
        await ensureLLMModule();
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
                    await ensureLLMModule();
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
                    await ensureLLMModule();
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
                    await ensureLLMModule();
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
                    // Strip internal routing field before persisting
                    const { _clientId, ...updateData } = data;
                    layoutSettings = { ...layoutSettings, ...updateData };
                    saveLayoutSettings();
                    // Let all connected OBS overlays see the change instantly.
                    // Include _clientId so the sender can skip its own echo.
                    broadcast(JSON.stringify({ type: 'layout-update', payload: layoutSettings, _clientId }));
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
        if (chat && getStatus?.().modelLoaded && parsedData.type !== 'system' && parsedData.payload) {
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

server.listen(PORTS.BACKEND, () => {
    console.log(`WebSocket & HTTP Server running on http://localhost:${PORTS.BACKEND}`);
});
