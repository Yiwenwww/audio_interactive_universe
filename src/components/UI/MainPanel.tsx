import React, { useState, useEffect, useRef } from 'react';
import { Engine } from '../../core/Engine';
import { ControlSection } from './ControlSection';
import { Slider } from './Slider';
import { Toggle } from './Toggle';

interface Props {
    engine: Engine | null;
}

export const MainPanel: React.FC<Props> = ({ engine }) => {
    const [fps, setFps] = useState(60);
    const [minimized, setMinimized] = useState(false);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // Local state for UI feedback
    const [particleCount, setParticleCount] = useState(20000);
    const [simSpeed, setSimSpeed] = useState(1.0);
    const [rotationSpeed, setRotationSpeed] = useState(2.0); // Increased initial rotation speed
    const [morphSpeed, setMorphSpeed] = useState(0.05);
    const [pulse, setPulse] = useState(0.0);
    const [autoRotate, setAutoRotate] = useState(true);
    const [autoColor, setAutoColor] = useState(false);
    const [rgb, setRgb] = useState({ r: 255, g: 255, b: 255 });
    const [neuralDensity, setNeuralDensity] = useState(0); // Initial neural density set to 0
    const [particleSize, setParticleSize] = useState(6.0);
    const [xyMode, setXyMode] = useState(false);
    const [thereminActive, setThereminActive] = useState(false); // Track Theremin mode
    const [isAudioPlaying, setIsAudioPlaying] = useState(false); // Track play/pause state

    // Lists for cycling
    const renderStyles = ['Universe', 'Ink', 'Oil', 'Sketch', 'Forest', 'Ocean', 'Fire', 'Cell'];
    const materialEffects = ['Particle', 'Glass', 'Plant', 'Silk', 'Metal', 'Rock'];

    const [currentStyle, setCurrentStyle] = useState('Universe');
    const [currentEffect, setCurrentEffect] = useState('Particle');
    const [currentShape, setCurrentShape] = useState('Sphere'); // Track selected shape for button highlighting

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Tab') {
                e.preventDefault();
                const currentIndex = renderStyles.indexOf(currentStyle);
                const nextIndex = (currentIndex + 1) % renderStyles.length;
                const nextStyle = renderStyles[nextIndex];
                setCurrentStyle(nextStyle);
                if (engine) engine.setRenderStyle(nextStyle);
            } else if (e.code === 'Space') {
                e.preventDefault();
                const currentIndex = materialEffects.indexOf(currentEffect);
                const nextIndex = (currentIndex + 1) % materialEffects.length;
                const nextEffect = materialEffects[nextIndex];
                setCurrentEffect(nextEffect);
                if (engine) engine.setMaterialEffect(nextEffect);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [currentStyle, currentEffect, engine]);

    useEffect(() => {
        const interval = setInterval(() => {
            setFps(Math.round(60)); // Simplified FPS
        }, 1000);

        // Monitor Animation Loop
        let animId: number;
        const updateMonitors = () => {
            if (engine && engine.material) {
                const useXY = engine.xyMode;
                const val1 = useXY ? engine.material.uniforms.uModX.value : engine.material.uniforms.uBass.value;
                const val2 = useXY ? engine.material.uniforms.uModY.value : engine.material.uniforms.uTreble.value;

                const cutoffBar = document.getElementById('monitor-cutoff');
                const resBar = document.getElementById('monitor-res');

                if (cutoffBar) cutoffBar.style.width = `${Math.min(100, val1 * 100)}%`;
                if (resBar) resBar.style.width = `${Math.min(100, val2 * 100)}%`;

                // Audio Visualization
                if (canvasRef.current && engine.audioManager) {
                    const ctx = canvasRef.current.getContext('2d');
                    const analysis = engine.audioManager.getAnalysis();
                    if (ctx && analysis) {
                        const { freq } = analysis;
                        const w = ctx.canvas.width;
                        const h = ctx.canvas.height;
                        ctx.clearRect(0, 0, w, h);

                        // Draw Spectrum
                        const barWidth = w / 64;
                        const step = Math.floor(freq.length / 64);

                        ctx.fillStyle = 'rgba(0, 255, 255, 0.5)';
                        for (let i = 0; i < 64; i++) {
                            const value = freq[i * step];
                            const barHeight = (value / 255) * h;
                            ctx.fillRect(i * barWidth, h - barHeight, barWidth - 1, barHeight);
                        }
                    }
                }
            }
            animId = requestAnimationFrame(updateMonitors);
        };
        updateMonitors();

        return () => {
            clearInterval(interval);
            cancelAnimationFrame(animId);
        };
    }, [engine]);

    if (!engine) return null;

    const handleStyle = (name: string) => {
        console.log('MainPanel: handleStyle clicked', name);
        setCurrentStyle(name);
        engine.setRenderStyle(name);
    };

    const handleEffect = (name: string) => {
        console.log('MainPanel: handleEffect clicked', name);
        setCurrentEffect(name);
        engine.setMaterialEffect(name);
    };

    const handleShape = (name: string) => {
        console.log('MainPanel: handleShape clicked', name);
        setCurrentShape(name); // Update selected shape state
        engine.morphTo(name);
    };

    const Tag = ({ label, onClick, selected }: { label: string, onClick: () => void, selected?: boolean }) => (
        <div
            onClick={onClick}
            style={{
                fontSize: 9, color: selected ? '#000' : 'rgba(0,255,255,0.7)',
                border: selected ? '1px solid #fff' : '1px solid rgba(0,255,255,0.3)',
                padding: '4px 8px', cursor: 'pointer', transition: 'all 0.2s',
                background: selected ? 'rgba(0, 255, 255, 0.6)' : 'rgba(0,0,0,0.3)',
                userSelect: 'none', textTransform: 'uppercase', flexGrow: 1, textAlign: 'center'
            }}
        >
            {label}
        </div>
    );

    const [isMobile, setIsMobile] = useState(window.innerWidth < 600);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 600);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return (
        <div
            id="hologram-ui"
            style={{
                position: 'absolute', top: 20, left: isMobile ? 10 : 20,
                width: isMobile ? 'calc(100% - 40px)' : 380,
                pointerEvents: 'auto', zIndex: 1000, maxHeight: minimized ? 45 : '90vh',
                overflowY: minimized ? 'hidden' : 'auto', paddingRight: 5,
                transition: 'max-height 0.3s ease, width 0.3s ease',
                background: 'rgba(0, 20, 40, 0.85)',
                border: '1px solid rgba(0, 255, 255, 0.3)',
                borderLeft: '4px solid rgba(0, 255, 255, 0.8)',
                padding: 15, backdropFilter: 'blur(6px)',
                boxShadow: '0 0 20px rgba(0, 255, 255, 0.15)',
                cursor: 'default' // Restore cursor
            }}
        >
            <h1 style={{
                color: '#0ff', fontSize: 16, margin: '0 0 12px 0', textTransform: 'uppercase',
                letterSpacing: 2, textShadow: '0 0 5px #0ff', borderBottom: '1px solid rgba(0, 255, 255, 0.3)',
                paddingBottom: 5, display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
                SYSTEM STATUS
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 12, background: 'rgba(0, 255, 255, 0.2)', padding: '2px 6px', borderRadius: 2 }}>{fps} FPS</span>
                    <div onClick={() => setMinimized(!minimized)} style={{ cursor: 'pointer', fontWeight: 'bold', padding: '0 8px' }}>
                        {minimized ? '[ + ]' : '[ - ]'}
                    </div>
                </div>
            </h1>

            <ControlSection title=">> VISUAL STYLE & MATERIAL">
                <div style={{ fontSize: 9, color: '#0ff', margin: '5px 0 2px 0', opacity: 0.7, borderBottom: '1px solid rgba(0,255,255,0.2)' }}>RENDER STYLE (ENV)</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 10 }}>
                    {['Universe', 'Ink', 'Oil', 'Sketch'].map(s => <Tag key={s} label={s} onClick={() => handleStyle(s)} selected={currentStyle === s} />)}
                </div>
                <div style={{ fontSize: 9, color: '#0ff', margin: '5px 0 2px 0', opacity: 0.7, borderBottom: '1px solid rgba(0,255,255,0.2)' }}>ELEMENTAL REALMS</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 10 }}>
                    {['Forest', 'Ocean', 'Fire', 'Cell'].map(s => <Tag key={s} label={s} onClick={() => handleStyle(s)} selected={currentStyle === s} />)}
                </div>
                <div style={{ fontSize: 9, color: '#0ff', margin: '5px 0 2px 0', opacity: 0.7, borderBottom: '1px solid rgba(0,255,255,0.2)' }}>MATERIAL EFFECT</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 10 }}>
                    {['Particle', 'Glass', 'Plant', 'Silk', 'Metal', 'Rock'].map(s => <Tag key={s} label={s} onClick={() => handleEffect(s)} selected={currentEffect === s} />)}
                </div>
            </ControlSection>

            <ControlSection title=">> SIMULATION CORE">
                <Slider label="PARTICLE DENSITY" value={particleCount} min={5000} max={40000} step={1000}
                    onChange={(v) => { setParticleCount(v); engine.initParticles(v); engine.generateConnections(); }}
                    displayValue={particleCount.toLocaleString()}
                />
                <Slider label="TIME DILATION" value={simSpeed} min={0} max={3} step={0.1}
                    onChange={(v) => { setSimSpeed(v); engine.simSpeed = v; }}
                    displayValue={simSpeed.toFixed(1) + 'x'}
                />
                <Slider label="MORPH SPEED" value={morphSpeed} min={0.01} max={0.2} step={0.01}
                    onChange={(v) => { setMorphSpeed(v); engine.morphSpeed = v; }}
                    displayValue={morphSpeed.toFixed(2)}
                />

            </ControlSection>

            <ControlSection title=">> SONIC RESONANCE FIELD" defaultCollapsed>
                <div style={{ marginBottom: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'rgba(0, 255, 255, 0.8)', fontSize: 10, marginBottom: 2 }}>
                        <span>AUDIO SOURCE</span>
                    </div>
                    <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                        <input
                            type="file"
                            accept=".mp3,audio/*"
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file && engine.audioManager) {
                                    const audio = new Audio(URL.createObjectURL(file));
                                    audio.loop = true;
                                    audio.play().then(() => {
                                        engine.audioManager.setupFile(audio);
                                    });
                                }
                            }}
                            style={{
                                fontSize: 10, color: 'rgba(0, 255, 255, 0.8)', width: '100%',
                                background: 'rgba(0, 0, 0, 0.3)', border: '1px dashed rgba(0, 255, 255, 0.3)',
                                padding: 5, cursor: 'pointer'
                            }}
                        />
                    </div>

                    {/* Play/Pause Button */}
                    <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                        <button
                            onClick={() => {
                                const nowPlaying = engine.audioManager.togglePlayPause();
                                setIsAudioPlaying(nowPlaying);
                            }}
                            style={{
                                fontSize: 10, color: isAudioPlaying ? '#000' : '#0ff',
                                background: isAudioPlaying ? 'rgba(0, 255, 255, 0.6)' : 'rgba(0,0,0,0.3)',
                                border: '1px solid rgba(0, 255, 255, 0.3)',
                                padding: '6px 12px', cursor: 'pointer', flexGrow: 1,
                                textTransform: 'uppercase', transition: 'all 0.2s'
                            }}
                        >
                            {isAudioPlaying ? '❚❚ PAUSE' : '▶ PLAY'}
                        </button>
                    </div>





                    <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px dashed rgba(0,255,255,0.2)', paddingTop: 5 }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: 9, color: '#0ff' }}>THEREMIN MODE</span>
                            <span style={{ fontSize: 8, color: 'rgba(0, 255, 255, 0.5)' }}>(TOUCH INTERACTIVE)</span>
                        </div>
                        <Toggle label="" active={thereminActive} onToggle={async () => {
                            if (!thereminActive) {
                                await engine.audioManager.startTheremin();
                                setThereminActive(true);
                                setIsAudioPlaying(false); // Sync UI state since audio is paused
                                // Disable others
                            } else {
                                engine.audioManager.stopTheremin();
                                setThereminActive(false);
                            }
                        }} />
                    </div>

                    <div style={{ marginTop: 10 }}>
                        <label style={{ fontSize: '10px', color: '#888' }}>VOLUME</label>
                        <input type="range" min="0" max="1" step="0.01" defaultValue="0.5"
                            onChange={(e) => engine.audioManager.setVolume(parseFloat(e.target.value))}
                            style={{ width: '100%', accentColor: '#0ff' }}
                        />
                    </div>
                    <div style={{ marginTop: 5 }}>
                        <label style={{ fontSize: '10px', color: '#888' }}>BASS SENSITIVITY</label>
                        <input type="range" min="0" max="5" step="0.1" defaultValue="1.0"
                            onChange={(e) => engine.bassSensitivity = parseFloat(e.target.value)}
                            style={{ width: '100%', accentColor: '#0ff' }}
                        />
                    </div>
                    <div style={{ marginTop: 5 }}>
                        <label style={{ fontSize: '10px', color: '#888' }}>TREBLE SENSITIVITY</label>
                        <input type="range" min="0" max="5" step="0.1" defaultValue="1.0"
                            onChange={(e) => engine.trebleSensitivity = parseFloat(e.target.value)}
                            style={{ width: '100%', accentColor: '#0ff' }}
                        />
                    </div>
                    <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px dashed rgba(0,255,255,0.2)', paddingTop: 5 }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: 9, color: '#0ff' }}>XY MODE</span>
                        </div>
                        <Toggle label="" active={xyMode} onToggle={() => {
                            const newMode = !xyMode;
                            setXyMode(newMode);
                            engine.xyMode = newMode;
                            if (engine.material) {
                                engine.material.uniforms.uModY.value = newMode ? 1.0 : 0.0;
                            }
                        }} />
                    </div>

                    <div style={{ marginTop: 10 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'rgba(0,255,255,0.7)', marginBottom: 2 }}>
                            <span>CUTOFF / BRIGHTNESS</span>
                            <span>RES / RIPPLE</span>
                        </div>
                        <div style={{ display: 'flex', gap: 5, height: 4 }}>
                            <div style={{ flex: 1, background: 'rgba(0,255,255,0.1)', borderRadius: 2, overflow: 'hidden' }}>
                                <div id="monitor-cutoff" style={{ width: '0%', height: '100%', background: '#0ff', transition: 'width 0.05s' }} />
                            </div>
                            <div style={{ flex: 1, background: 'rgba(0,255,255,0.1)', borderRadius: 2, overflow: 'hidden' }}>
                                <div id="monitor-res" style={{ width: '0%', height: '100%', background: '#0ff', transition: 'width 0.05s' }} />
                            </div>
                        </div>
                    </div>

                    <div style={{ marginTop: 10 }}>
                        <div style={{ fontSize: 9, color: 'rgba(0,255,255,0.7)', marginBottom: 2 }}>AUDIO SPECTRUM</div>
                        <div style={{ border: '1px solid rgba(0,255,255,0.2)', background: 'rgba(0,0,0,0.3)' }}>
                            <canvas ref={canvasRef} width={300} height={40} style={{ width: '100%', height: '40px', display: 'block' }} />
                        </div>
                    </div>
                </div>
            </ControlSection>

            <ControlSection title=">> DYNAMICS & MOTION" defaultCollapsed>
                <Toggle label="AUTO ROTATION" active={autoRotate} onToggle={() => { setAutoRotate(!autoRotate); engine.autoRotate = !autoRotate; }} />
                <Slider label="ROTATION SPEED" value={rotationSpeed} min={0} max={5} step={0.1}
                    onChange={(v) => { setRotationSpeed(v); engine.rotationSpeed = v; }}
                    displayValue={rotationSpeed.toFixed(1) + 'x'}
                />
                <Slider label="PULSE INTENSITY" value={pulse} min={0} max={1} step={0.01}
                    onChange={(v) => { setPulse(v); engine.pulseIntensity = v; }}
                    displayValue={(pulse * 100).toFixed(0) + '%'}
                />
            </ControlSection>

            <ControlSection title=">> FINE TUNING" defaultCollapsed>
                <Toggle label="COLOR CYCLE" active={autoColor} onToggle={() => { setAutoColor(!autoColor); engine.autoColorCycle = !autoColor; if (engine.material) engine.material.uniforms.uPlayColor.value = !autoColor ? 1.0 : 0.0; }} />
                <Slider label="NEURAL DENSITY" value={neuralDensity} min={0} max={100} step={1}
                    onChange={(v) => { setNeuralDensity(v); engine.updateLines(v); }}
                    displayValue="%"
                />
                <Slider label="PARTICLE SIZE" value={particleSize} min={1.0} max={20.0} step={0.1}
                    onChange={(v) => { setParticleSize(v); if (engine.material) engine.material.uniforms.size.value = v; }}
                    displayValue="px"
                />
                <div style={{ marginBottom: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'rgba(0,255,255,0.8)' }}>
                        <span>SPECTRAL FILTER (RGB)</span>
                        <span style={{ color: '#fff' }}>{rgb.r}, {rgb.g}, {rgb.b}</span>
                    </div>
                    <input type="range" min="0" max="255" value={rgb.r} onChange={(e) => {
                        const v = parseInt(e.target.value);
                        setRgb({ ...rgb, r: v });
                        if (engine.material) engine.material.uniforms.uColorTint.value.r = v / 255;
                        engine.updateLineColor(v / 255, rgb.g / 255, rgb.b / 255);
                    }} style={{ width: '100%', accentColor: 'red' }} />
                    <input type="range" min="0" max="255" value={rgb.g} onChange={(e) => {
                        const v = parseInt(e.target.value);
                        setRgb({ ...rgb, g: v });
                        if (engine.material) engine.material.uniforms.uColorTint.value.g = v / 255;
                        engine.updateLineColor(rgb.r / 255, v / 255, rgb.b / 255);
                    }} style={{ width: '100%', accentColor: 'green' }} />
                    <input type="range" min="0" max="255" value={rgb.b} onChange={(e) => {
                        const v = parseInt(e.target.value);
                        setRgb({ ...rgb, b: v });
                        if (engine.material) engine.material.uniforms.uColorTint.value.b = v / 255;
                        engine.updateLineColor(rgb.r / 255, rgb.g / 255, v / 255);
                    }} style={{ width: '100%', accentColor: 'blue' }} />
                </div>
            </ControlSection>

            <ControlSection title=">> DIMENSIONAL RECONSTRUCTOR">
                <div style={{ fontSize: 9, color: '#0ff', margin: '5px 0 2px 0', opacity: 0.7, borderBottom: '1px solid rgba(0,255,255,0.2)' }}>GEOMETRY</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 10 }}>
                    {['Universe', 'Heart', 'Mobius', 'Penrose', 'Tornado'].map(s => <Tag key={s} label={s} onClick={() => handleShape(s)} selected={currentShape === s} />)}
                </div>
                <div style={{ fontSize: 9, color: '#0ff', margin: '5px 0 2px 0', opacity: 0.7, borderBottom: '1px solid rgba(0,255,255,0.2)' }}>ORGANIC & LIFE</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 10 }}>
                    {['Rose', 'Nautilus', 'Lily', 'Lotus', 'Fern', 'Butterfly', 'Jellyfish'].map(s => <Tag key={s} label={s} onClick={() => handleShape(s)} selected={currentShape === s} />)}
                </div>
                <div style={{ fontSize: 9, color: '#0ff', margin: '5px 0 2px 0', opacity: 0.7, borderBottom: '1px solid rgba(0,255,255,0.2)' }}>CHAOS ATTRACTORS</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 10 }}>
                    {['Lorenz', 'Rossler', 'Chen', 'Aizawa', 'Dadras'].map(s => <Tag key={s} label={s} onClick={() => handleShape(s)} selected={currentShape === s} />)}
                </div>
                <div style={{ fontSize: 9, color: '#0ff', margin: '5px 0 2px 0', opacity: 0.7, borderBottom: '1px solid rgba(0,255,255,0.2)' }}>FRACTALS</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 10 }}>
                    {['Sierpinski', 'Mandelbulb', 'Menger', 'Julia', 'Clifford', 'DNA', 'Atom'].map(s => <Tag key={s} label={s} onClick={() => handleShape(s)} selected={currentShape === s} />)}
                </div>
            </ControlSection>
        </div >
    );
};
