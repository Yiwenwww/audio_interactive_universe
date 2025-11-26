import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { Engine } from '../../core/Engine';
import { AudioManager } from '../../core/Audio';

interface Props {
    audioManager: AudioManager;
    onEngineInit?: (engine: Engine) => void;
}

export interface SceneRef {
    engine: Engine | null;
}

export const SceneContainer = forwardRef<SceneRef, Props>(({ audioManager, onEngineInit }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const engineRef = useRef<Engine | null>(null);

    useImperativeHandle(ref, () => ({
        engine: engineRef.current
    }));

    useEffect(() => {
        if (!containerRef.current) return;

        // Initialize Engine
        const newEngine = new Engine(containerRef.current, audioManager);
        engineRef.current = newEngine;

        if (onEngineInit) {
            onEngineInit(newEngine);
        }

        return () => {
            if (engineRef.current) {
                engineRef.current.dispose();
            }
            if (containerRef.current) containerRef.current.innerHTML = '';
        };
    }, [audioManager, onEngineInit]);

    return <div ref={containerRef} style={{ width: '100vw', height: '100vh', position: 'absolute', top: 0, left: 0, zIndex: 0, pointerEvents: 'none' }} />;
});
