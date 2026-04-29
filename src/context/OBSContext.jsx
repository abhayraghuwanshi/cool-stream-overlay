import OBSWebSocket from 'obs-websocket-js';
import { createContext, useContext, useEffect, useRef, useState } from 'react';

const OBSContext = createContext(null);

export const useOBS = () => useContext(OBSContext);

const RETRY_INTERVAL = 5000; // ms between reconnect attempts

export const OBSProvider = ({ children }) => {
    const [obs] = useState(() => new OBSWebSocket());
    const [isConnected, setIsConnected] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const retryRef = useRef(null);
    const mountedRef = useRef(true);

    useEffect(() => {
        const connect = async () => {
            try {
                await obs.connect('ws://localhost:4455', '');
                if (!mountedRef.current) return;
                setIsConnected(true);

                const status = await obs.call('GetRecordStatus');
                if (mountedRef.current) setIsRecording(status.outputActive);
            } catch {
                // OBS is likely not open — retry silently
                if (!mountedRef.current) return;
                setIsConnected(false);
                retryRef.current = setTimeout(connect, RETRY_INTERVAL);
            }
        };

        obs.on('RecordStateChanged', (data) => {
            setIsRecording(data.outputActive);
        });

        obs.on('ConnectionClosed', () => {
            if (!mountedRef.current) return;
            setIsConnected(false);
            setIsRecording(false);
            retryRef.current = setTimeout(connect, RETRY_INTERVAL);
        });

        connect();

        return () => {
            mountedRef.current = false;
            clearTimeout(retryRef.current);
            obs.disconnect();
        };
    }, [obs]);

    return (
        <OBSContext.Provider value={{ obs, isConnected, isRecording }}>
            {children}
        </OBSContext.Provider>
    );
};
