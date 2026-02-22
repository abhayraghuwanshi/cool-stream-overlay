import { AnimatePresence, motion } from 'framer-motion';
import { Bot, Image as ImageIcon, Link as LinkIcon, User } from 'lucide-react';
import { useEffect, useState } from 'react';
import { BACKEND_WS } from '../config.js';

const AICompanion = () => {
    const [messages, setMessages] = useState([]);
    const [isTyping, setIsTyping] = useState(false);

    useEffect(() => {
        let ws;
        let reconnectTimeout;
        let isMounted = true;

        const connectWs = () => {
            if (!isMounted) return;

            ws = new WebSocket(BACKEND_WS);

            ws.onopen = () => {
                console.log('Connected to AI Companion WebSocket');
            };

            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    console.log("AICompanion Received WS Data:", data);

                    // Filter out system and control messages so they don't break the chat feed
                    if (data.type?.startsWith('llm-') || data.type === 'system' || data.type === 'layout-update') return;

                    if (data.type === 'typing') {
                        setIsTyping(Boolean(data.payload));
                        return;
                    }

                    // Determine Role
                    let isAi = data.role === 'ai';
                    let displayPayload = data.payload;
                    if (typeof displayPayload === 'string') {
                        if (displayPayload.includes('🤖 AI:')) {
                            isAi = true;
                            displayPayload = displayPayload.replace(/🤖 AI:\s*/g, '').trim();
                        } else if (displayPayload.includes('AI: ')) {
                            isAi = true;
                            displayPayload = displayPayload.replace(/AI:\s*/g, '').trim();
                        }
                    }

                    // Failsafe: if payload is somehow an object here, skip it to avoid React crashes
                    if (typeof displayPayload === 'object') return;

                    // Add new message and keep up to 15 to allow a readable history
                    setMessages(prev => {
                        // Prevent consecutive duplicate payloads
                        if (prev.length > 0 && prev[prev.length - 1].payload === displayPayload) {
                            return prev;
                        }

                        const newMsg = {
                            id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Date.now() + Math.random(),
                            type: data.type,
                            payload: displayPayload,
                            isAi: isAi,
                            timestamp: new Date()
                        };
                        return [...prev, newMsg].slice(-15);
                    });
                } catch (e) {
                    console.error("Invalid WS Payload", e);
                }
            };

            ws.onclose = () => {
                if (!isMounted) return;
                // Reconnect after 3 seconds
                reconnectTimeout = setTimeout(connectWs, 3000);
            };
        };

        connectWs();

        return () => {
            isMounted = false;
            clearTimeout(reconnectTimeout);
            if (ws) {
                // Remove onclose listener so it doesn't trigger when we explicitly close it
                ws.onclose = null;
                ws.close();
            }
        };
    }, []);

    const getIcon = (type, isAi) => {
        if (isAi) return <Bot size={14} className="text-purple-400" />;
        if (type === 'image') return <ImageIcon size={14} className="text-pink-400" />;
        if (type === 'link' || type === 'url') return <LinkIcon size={14} className="text-blue-400" />;
        return <User size={14} className="text-blue-400" />;
    };

    return (
        <div className="w-full bg-black/80 backdrop-blur-md rounded-xl border border-white/10 p-3 flex flex-col gap-2 shadow-lg h-full overflow-hidden">
            {/* Header */}
            <div className="flex items-center gap-2 border-b border-white/5 pb-2">
                <div className="p-1.5 bg-purple-500/20 rounded-md">
                    <Bot className="text-purple-400" size={16} />
                </div>
                <span className="text-xs font-bold text-white/80 uppercase tracking-widest flex-1">AI Companion</span>

                <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                    </span>
                    <span className="text-[10px] text-green-400 font-mono">SYNCED</span>
                </div>
            </div>

            {/* Messages Feed */}
            <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0 flex flex-col pr-1">
                <div className="flex flex-col gap-2 mt-auto pb-1">
                    {messages.length === 0 ? (
                        <div className="text-center text-white/20 text-[10px] uppercase font-bold tracking-widest py-4">Waiting for data...</div>
                    ) : (
                        <AnimatePresence initial={false}>
                            {messages.map((msg) => (
                                <motion.div
                                    key={msg.id}
                                    initial={{ opacity: 0, x: msg.isAi ? -20 : 20, scale: 0.95 }}
                                    animate={{ opacity: 1, x: 0, scale: 1 }}
                                    className={`p-2.5 rounded-2xl flex gap-3 items-start relative overflow-hidden group flex-shrink-0 max-w-[95%]
                                        ${msg.isAi
                                            ? "bg-purple-500/10 border border-purple-500/20 self-start rounded-tl-sm ml-1"
                                            : "bg-blue-500/10 border border-blue-500/20 self-end rounded-tr-sm flex-row-reverse mr-1 text-left"
                                        }`}
                                >
                                    {/* Glowing corner effect for AI vibe */}
                                    {msg.isAi && <div className="absolute top-0 left-0 w-8 h-8 bg-purple-500/20 blur-xl rounded-full pointer-events-none" />}
                                    {!msg.isAi && <div className="absolute top-0 right-0 w-8 h-8 bg-blue-500/20 blur-xl rounded-full pointer-events-none" />}

                                    <div className="mt-0.5 relative z-10 shrink-0 bg-black/40 p-1.5 rounded-lg border border-white/5">
                                        {getIcon(msg.type, msg.isAi)}
                                    </div>
                                    <div className="flex-1 min-w-0 relative z-10 leading-snug">
                                        {msg.type === 'image' ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img src={msg.payload} alt="Shared" className="w-full rounded-md object-cover max-h-32 border border-white/10" />
                                        ) : (
                                            <p className={`text-[13px] break-words font-medium ${msg.isAi ? "text-gray-200 whitespace-pre-wrap" : "text-blue-100/90 whitespace-pre-wrap"}`}>
                                                {msg.payload}
                                            </p>
                                        )}
                                    </div>
                                </motion.div>
                            ))}
                            {isTyping && (
                                <motion.div
                                    key="typing-indicator"
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                                    className="bg-purple-500/10 border border-purple-500/20 p-2.5 rounded-2xl rounded-tl-sm flex gap-3 items-center relative overflow-hidden group flex-shrink-0 w-24 self-start ml-1"
                                >
                                    <div className="absolute top-0 left-0 w-8 h-8 bg-purple-500/20 blur-xl rounded-full pointer-events-none" />
                                    <div className="relative z-10 shrink-0 bg-black/40 p-1.5 rounded-lg border border-white/5"><Bot size={14} className="text-purple-400" /></div>
                                    <div className="flex-1 relative z-10 flex justify-center items-center gap-1 mt-0.5">
                                        <span className="w-1.5 h-1.5 bg-white/50 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                        <span className="w-1.5 h-1.5 bg-white/50 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                        <span className="w-1.5 h-1.5 bg-white/50 rounded-full animate-bounce"></span>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AICompanion;
