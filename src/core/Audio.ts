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
    isMicActive = false;
    isFilePlaying = false;

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

        this.source = this.ctx.createMediaElementSource(audioElement);
        this.source.connect(this.gainNode!);
        this.analyser!.connect(this.ctx.destination);
        this.isFilePlaying = true;
        this.isMicActive = false;
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

        if (analyser && freqData && timeData && (this.isFilePlaying || this.isMicActive)) {
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
