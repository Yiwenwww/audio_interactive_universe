import { useState, useRef } from 'react';
import { SceneContainer, SceneRef } from './components/Canvas/SceneContainer';
import { MainPanel } from './components/UI/MainPanel';
import { AudioManager } from './core/Audio';

function App() {
    const [audioManager] = useState(() => new AudioManager());
    const sceneRef = useRef<SceneRef>(null);
    const [activeEngine, setActiveEngine] = useState<any>(null);

    return (
        <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
            <SceneContainer ref={sceneRef} audioManager={audioManager} onEngineInit={setActiveEngine} />
            {activeEngine && <MainPanel engine={activeEngine} />}

            {/* Loading Overlay */}
            {!activeEngine && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                    background: '#000', display: 'flex', justifyContent: 'center', alignItems: 'center',
                    color: '#0ff', zIndex: 100, flexDirection: 'column'
                }}>
                    <div>INITIALIZING MORPH CORE...</div>
                </div>
            )}
        </div>
    );
}

export default App;
