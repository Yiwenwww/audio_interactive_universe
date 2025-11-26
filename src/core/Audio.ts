export class AudioManager {
    ctx: AudioContext | null = null;
    analyser: AnalyserNode | null = null;
    source: MediaElementAudioSourceNode | MediaStreamAudioSourceNode | null = null;
    gainNode: GainNode | null = null;
    distortionNode: WaveShaperNode | null = null;
    filterNode: BiquadFilterNode | null = null;

    freqData: Uint8Array | null = null;
    timeData: Uint8Array | null = null;

    micStream: MediaStream | null = null;
    tabStream: MediaStream | null = null; // For tab audio capture
    audioElement: HTMLAudioElement | null = null; // Track audio element for control
    isMicActive = false;
    isFilePlaying = false;
    isTabCapture = false; // Track if using tab audio capture

    // Theremin
    oscillator: OscillatorNode | null = null;
    thereminGain: GainNode | null = null;
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
        this.isMicActive = false;
        this.isTabCapture = false;
    }

    async toggleMic(): Promise<boolean> {
        this.initContext();
        if (!this.ctx) return false;

        if (!this.isMicActive) {
            await this.resume();
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
                this.micStream = stream;
                if (this.source) this.source.disconnect();

                this.source = this.ctx.createMediaStreamSource(stream);
                this.source.connect(this.gainNode!);
                // Do NOT connect to destination to avoid feedback loop

                this.isMicActive = true;
                this.isFilePlaying = false;
                return true;
            } catch (err) {
                console.error("Mic Error:", err);
                return false;
            }
        } else {
            if (this.micStream) {
                this.micStream.getTracks().forEach(track => track.stop());
                this.micStream = null;
            }
            if (this.source) {
                this.source.disconnect();
                this.source = null;
            }
            this.isMicActive = false;
            return false;
        }
    }

    async setupTabCapture(): Promise<boolean> {
        this.initContext();
        if (!this.ctx) return false;

        await this.resume();

        try {
            // Request tab audio capture (works for browser tabs playing audio)
            const stream = await (navigator.mediaDevices as any).getDisplayMedia({
                audio: true,
                video: true // Required by some browsers even if we only want audio
            });

            // Get only audio tracks
            const audioTracks = stream.getAudioTracks();
            if (audioTracks.length === 0) {
                console.error("No audio track in captured tab");
                return false;
            }

            this.tabStream = stream;
            if (this.source) this.source.disconnect();

            this.source = this.ctx.createMediaStreamSource(stream);
            this.source.connect(this.gainNode!);
            // Don't connect to destination to avoid audio playback

            this.isTabCapture = true;
            this.isFilePlaying = false;
            this.isMicActive = false;
            return true;
        } catch (err) {
            console.error("Tab Capture Error:", err);
            return false;
        }
    }

    stopTabCapture() {
        if (this.tabStream) {
            this.tabStream.getTracks().forEach(track => track.stop());
            this.tabStream = null;
        }
        if (this.source) {
            this.source.disconnect();
            this.source = null;
        }
        this.isTabCapture = false;
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

        // Stop mic/tab capture as they conflict with output
        if (this.micStream) {
            this.micStream.getTracks().forEach(track => track.stop());
            this.micStream = null;
            this.isMicActive = false;
        }
        if (this.tabStream) {
            this.tabStream.getTracks().forEach(track => track.stop());
            this.tabStream = null;
            this.isTabCapture = false;
        }

        // Create Oscillator
        this.oscillator = this.ctx.createOscillator();
        this.thereminGain = this.ctx.createGain();

        this.oscillator.type = 'sine';
        this.oscillator.frequency.value = 440; // Start at A4
        this.thereminGain.gain.value = 0; // Start silent

        // Connect: Osc -> Gain -> Main Gain -> Distortion -> Filter -> Analyser -> Destination
        this.oscillator.connect(this.thereminGain);
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
            } catch (e) { /* ignore if already stopped */ }
            this.oscillator = null;
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
        if (this.thereminGain) {
            this.thereminGain.gain.setTargetAtTime(volume, this.ctx.currentTime, 0.05);
        }
    }

    // Play/Pause controls for file playback
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

        if (analyser && freqData && timeData && (this.isFilePlaying || this.isMicActive || this.isTabCapture || this.isThereminActive)) {
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
