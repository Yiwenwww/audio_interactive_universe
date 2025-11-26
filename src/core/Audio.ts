export class AudioManager {
    ctx: AudioContext | null = null;
    analyser: AnalyserNode | null = null;
    source: MediaElementAudioSourceNode | MediaStreamAudioSourceNode | null = null;
    gainNode: GainNode | null = null;
    distortionNode: WaveShaperNode | null = null;
    filterNode: BiquadFilterNode | null = null;

    freqData: Uint8Array | null = null;
    timeData: Uint8Array | null = null;

    audioElement: HTMLAudioElement | null = null; // Track audio element for control
    isFilePlaying = false;

    // Theremin
    oscillator: OscillatorNode | null = null;
    thereminGain: GainNode | null = null;
    thereminFilter: BiquadFilterNode | null = null; // New filter for synth sweep
    isThereminActive = false;

    constructor() { }

    initContext() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            this.gainNode = this.ctx.createGain();
            this.distortionNode = this.ctx.createWaveShaper();
            this.filterNode = this.ctx.createBiquadFilter();
            this.analyser = this.ctx.createAnalyser();

            this.distortionNode.curve = this.makeDistortionCurve(0);
            this.distortionNode.oversample = '4x';
            this.filterNode.type = "lowpass";
            this.filterNode.frequency.value = 20000;
            this.filterNode.Q.value = 1;
            this.analyser.fftSize = 1024;
            this.analyser.smoothingTimeConstant = 0.85;

            this.freqData = new Uint8Array(this.analyser.frequencyBinCount);
            this.timeData = new Uint8Array(this.analyser.frequencyBinCount);

            this.gainNode.connect(this.distortionNode);
            this.distortionNode.connect(this.filterNode);
            this.filterNode.connect(this.analyser);
            // Analyser connects to destination only for file playback, handled in setupFile
        }
    }

    async resume() {
        if (this.ctx && this.ctx.state === 'suspended') {
            await this.ctx.resume();
        }
    }

    async setupFile(audioElement: HTMLAudioElement) {
        this.initContext();
        if (!this.ctx) return;

        await this.resume();

        // Disconnect old source if exists
        if (this.source) this.source.disconnect();

        this.audioElement = audioElement; // Store reference for play/pause
        this.source = this.ctx.createMediaElementSource(audioElement);
        this.source.connect(this.gainNode!);
        this.analyser!.connect(this.ctx.destination);
        this.isFilePlaying = true;
    }

    // --- Theremin Synthesis ---
    async startTheremin() {
        this.initContext();
        if (!this.ctx) return;
        await this.resume();

        // Pause file playback if active, but don't disconnect
        if (this.audioElement && !this.audioElement.paused) {
            this.audioElement.pause();
            this.isFilePlaying = false; // Mark as not playing for analysis
        }

        // Create Oscillator & Filter
        this.oscillator = this.ctx.createOscillator();
        this.thereminGain = this.ctx.createGain();
        this.thereminFilter = this.ctx.createBiquadFilter();

        // Synth Setup: Sawtooth wave for rich harmonics
        this.oscillator.type = 'sawtooth';
        this.oscillator.frequency.value = 440;

        // Filter Setup: Lowpass for "wah" effect
        this.thereminFilter.type = 'lowpass';
        this.thereminFilter.Q.value = 10; // High resonance for "synth" sound
        this.thereminFilter.frequency.value = 1000;

        this.thereminGain.gain.value = 0; // Start silent

        // Connect: Osc -> Filter -> Gain -> Main Gain
        this.oscillator.connect(this.thereminFilter);
        this.thereminFilter.connect(this.thereminGain);
        this.thereminGain.connect(this.gainNode!);

        // Ensure main path connects to destination for hearing
        this.analyser!.connect(this.ctx.destination);

        this.oscillator.start();
        this.isThereminActive = true;
    }

    stopTheremin() {
        if (this.oscillator) {
            try {
                this.oscillator.stop();
                this.oscillator.disconnect();
            } catch (e) { /* ignore */ }
            this.oscillator = null;
        }
        if (this.thereminFilter) {
            this.thereminFilter.disconnect();
            this.thereminFilter = null;
        }
        if (this.thereminGain) {
            this.thereminGain.disconnect();
            this.thereminGain = null;
        }
        this.isThereminActive = false;
    }

    updateTheremin(frequency: number, volume: number) {
        if (!this.ctx || !this.isThereminActive) return;

        if (this.oscillator) {
            this.oscillator.frequency.setTargetAtTime(frequency, this.ctx.currentTime, 0.05);
        }
        if (this.thereminFilter) {
            // Map volume (Y-axis) to Filter Cutoff as well for "sweep" effect
            // Low volume = Closed filter (muffled), High volume = Open filter (bright)
            const minCutoff = 100;
            const maxCutoff = 8000;
            const cutoff = minCutoff + (maxCutoff - minCutoff) * volume;
            this.thereminFilter.frequency.setTargetAtTime(cutoff, this.ctx.currentTime, 0.05);
        }
        if (this.thereminGain) {
            this.thereminGain.gain.setTargetAtTime(volume, this.ctx.currentTime, 0.05);
        }
    }
    play() {
        if (this.audioElement && !this.audioElement.paused) return; // Already playing
        this.audioElement?.play();
    }

    pause() {
        this.audioElement?.pause();
    }

    togglePlayPause(): boolean {
        if (!this.audioElement) return false;
        if (this.audioElement.paused) {
            this.audioElement.play();
            return true; // Now playing
        } else {
            this.audioElement.pause();
            return false; // Now paused
        }
    }

    isPlaying(): boolean {
        return this.audioElement ? !this.audioElement.paused : false;
    }

    makeDistortionCurve(amount: number) {
        const k = typeof amount === 'number' ? amount : 50;
        const n_samples = 44100;
        const curve = new Float32Array(n_samples);
        const deg = Math.PI / 180;
        for (let i = 0; i < n_samples; ++i) {
            const x = i * 2 / n_samples - 1;
            curve[i] = (3 + k) * x * 20 * deg / (Math.PI + k * Math.abs(x));
        }
        return curve;
    }

    getAnalysis() {
        const analyser = this.analyser;
        const freqData = this.freqData;
        const timeData = this.timeData;

        if (analyser && freqData && timeData && (this.isFilePlaying || this.isThereminActive)) {
            // @ts-ignore
            analyser.getByteFrequencyData(freqData);
            // @ts-ignore
            analyser.getByteTimeDomainData(timeData);
            return { freq: freqData!, time: timeData! };
        }
        return null;
    }

    setVolume(val: number) {
        if (this.gainNode) this.gainNode.gain.value = val;
    }

    setFilter(freq: number, q: number) {
        if (this.filterNode && this.ctx) {
            this.filterNode.frequency.setTargetAtTime(freq, this.ctx.currentTime, 0.1);
            this.filterNode.Q.setTargetAtTime(q, this.ctx.currentTime, 0.1);
        }
    }

    setDistortion(amount: number) {
        if (this.distortionNode) {
            this.distortionNode.curve = this.makeDistortionCurve(amount);
        }
    }
}
