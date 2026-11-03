/**
 * Live audio streaming manager for Gemini 3.8 Live API
 * Handles 16kHz PCM recording -> base64 WebSocket streaming
 * and 24kHz PCM gapless playback from incoming audio chunks.
 */

// Convert Float32Array to 16-bit PCM ArrayBuffer then to base64
function floatTo16BitPCM(input: Float32Array): string {
  const output = new Int16Array(input.length);
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i]));
    output[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  let binary = '';
  const bytes = new Uint8Array(output.buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Convert base64 16-bit PCM to Float32Array for AudioBuffer playback
function base64To16BitPCM(base64: string): Float32Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const int16 = new Int16Array(bytes.buffer);
  const float32 = new Float32Array(int16.length);
  for (let i = 0; i < int16.length; i++) {
    float32[i] = int16[i] / 32768.0;
  }
  return float32;
}

export interface LiveSessionCallbacks {
  onStatusChange?: (status: 'disconnected' | 'connecting' | 'connected' | 'speaking' | 'listening') => void;
  onInputTranscript?: (text: string) => void;
  onOutputTranscript?: (text: string) => void;
  onError?: (err: string) => void;
  onVolumeChange?: (inputVol: number, outputVol: number) => void;
}

export class GeminiLiveClient {
  private ws: WebSocket | null = null;
  private inputAudioCtx: AudioContext | null = null;
  private outputAudioCtx: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private scriptProcessor: ScriptProcessorNode | null = null;
  private nextStartTime = 0;
  private activeSources: AudioBufferSourceNode[] = [];
  private callbacks: LiveSessionCallbacks = {};
  public isConnected = false;
  public isMicMuted = false;

  constructor(callbacks: LiveSessionCallbacks) {
    this.callbacks = callbacks;
  }

  public async connect(): Promise<void> {
    if (this.isConnected) return;
    this.callbacks.onStatusChange?.('connecting');

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/live`;

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = async () => {
          this.isConnected = true;
          this.callbacks.onStatusChange?.('connected');
          try {
            await this.startAudioCapture();
            resolve();
          } catch (micErr: any) {
            console.error('Microphone access failed:', micErr);
            this.callbacks.onError?.('Microphone access denied or unavailable.');
            resolve(); // Connection established even if mic denied
          }
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.error) {
              this.callbacks.onError?.(data.error);
            }
            if (data.inputTranscript) {
              this.callbacks.onInputTranscript?.(data.inputTranscript);
            }
            if (data.outputTranscript) {
              this.callbacks.onOutputTranscript?.(data.outputTranscript);
            }
            if (data.interrupted) {
              this.handleInterruption();
            }
            if (data.audio) {
              this.callbacks.onStatusChange?.('speaking');
              this.playAudioChunk(data.audio);
            }
          } catch (e) {
            console.error('Failed to parse WebSocket message:', e);
          }
        };

        this.ws.onerror = (e) => {
          console.error('WebSocket error:', e);
          this.callbacks.onError?.('Live connection error');
          reject(e);
        };

        this.ws.onclose = () => {
          this.isConnected = false;
          this.callbacks.onStatusChange?.('disconnected');
          this.cleanup();
        };
      } catch (err) {
        this.callbacks.onError?.('Could not create WebSocket');
        reject(err);
      }
    });
  }

  private async startAudioCapture() {
    this.inputAudioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({
      sampleRate: 16000,
    });
    this.outputAudioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({
      sampleRate: 24000,
    });

    if (this.inputAudioCtx.state === 'suspended') {
      await this.inputAudioCtx.resume();
    }
    if (this.outputAudioCtx.state === 'suspended') {
      await this.outputAudioCtx.resume();
    }

    this.mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        sampleRate: 16000,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });

    const source = this.inputAudioCtx.createMediaStreamSource(this.mediaStream);
    // Buffer size 2048 at 16kHz is ~128ms chunks
    this.scriptProcessor = this.inputAudioCtx.createScriptProcessor(2048, 1, 1);

    this.scriptProcessor.onaudioprocess = (e) => {
      if (!this.isConnected || this.isMicMuted || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
        return;
      }
      const channelData = e.inputBuffer.getChannelData(0);

      // Volume calculation for UI visualization
      let sum = 0;
      for (let i = 0; i < channelData.length; i++) {
        sum += channelData[i] * channelData[i];
      }
      const rms = Math.sqrt(sum / channelData.length);
      this.callbacks.onVolumeChange?.(rms, 0);

      const base64PCM = floatTo16BitPCM(channelData);
      this.ws.send(JSON.stringify({ audio: base64PCM }));
    };

    source.connect(this.scriptProcessor);
    this.scriptProcessor.connect(this.inputAudioCtx.destination);
  }

  private playAudioChunk(base64: string) {
    if (!this.outputAudioCtx) {
      this.outputAudioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 24000,
      });
    }

    const float32Data = base64To16BitPCM(base64);
    const audioBuffer = this.outputAudioCtx.createBuffer(1, float32Data.length, 24000);
    audioBuffer.getChannelData(0).set(float32Data);

    const source = this.outputAudioCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.outputAudioCtx.destination);

    const currentTime = this.outputAudioCtx.currentTime;
    if (this.nextStartTime < currentTime) {
      this.nextStartTime = currentTime;
    }

    source.start(this.nextStartTime);
    this.nextStartTime += audioBuffer.duration;

    this.activeSources.push(source);
    source.onended = () => {
      const idx = this.activeSources.indexOf(source);
      if (idx !== -1) {
        this.activeSources.splice(idx, 1);
      }
      if (this.activeSources.length === 0) {
        this.callbacks.onStatusChange?.('listening');
      }
    };
  }

  private handleInterruption() {
    for (const src of this.activeSources) {
      try {
        src.stop();
      } catch (_) {}
    }
    this.activeSources = [];
    if (this.outputAudioCtx) {
      this.nextStartTime = this.outputAudioCtx.currentTime;
    }
    this.callbacks.onStatusChange?.('listening');
  }

  public sendText(text: string) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ text }));
    }
  }

  public setMicMuted(muted: boolean) {
    this.isMicMuted = muted;
  }

  public disconnect() {
    this.cleanup();
    if (this.ws) {
      try {
        this.ws.close();
      } catch (_) {}
      this.ws = null;
    }
    this.isConnected = false;
    this.callbacks.onStatusChange?.('disconnected');
  }

  private cleanup() {
    this.handleInterruption();
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }
    if (this.scriptProcessor) {
      try {
        this.scriptProcessor.disconnect();
      } catch (_) {}
      this.scriptProcessor = null;
    }
    if (this.inputAudioCtx) {
      try {
        this.inputAudioCtx.close();
      } catch (_) {}
      this.inputAudioCtx = null;
    }
    if (this.outputAudioCtx) {
      try {
        this.outputAudioCtx.close();
      } catch (_) {}
      this.outputAudioCtx = null;
    }
  }
}
