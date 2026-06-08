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
        mountedRef.current = true;
        // Guard against overlapping connect attempts. A single failed connection
        // both rejects connect() AND emits ConnectionClosed; without these guards
        // each failure would schedule TWO retries, doubling every interval into a
        // storm of dead WebSockets (ERR_INSUFFICIENT_RESOURCES + memory growth).
        let connecting = false;

        // Only ever one pending retry: clearing first means duplicate callers
        // (catch + ConnectionClosed) collapse to a single scheduled attempt.
        const scheduleRetry = () => {
            if (!mountedRef.current) return;
            clearTimeout(retryRef.current);
            retryRef.current = setTimeout(connect, RETRY_INTERVAL);
        };

        const connect = async () => {
            if (!mountedRef.current || connecting) return;
            connecting = true;
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
                scheduleRetry();
            } finally {
                connecting = false;
            }
        };

        obs.on('RecordStateChanged', (data) => {
            setIsRecording(data.outputActive);
        });

        obs.on('ConnectionClosed', () => {
            if (!mountedRef.current) return;
            setIsConnected(false);
            setIsRecording(false);
            scheduleRetry();
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
