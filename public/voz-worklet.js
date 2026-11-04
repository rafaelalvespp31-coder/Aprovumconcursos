// Captura do microfone para o Mentor por voz: reamostra para 16 kHz e envia blocos PCM16 (~100 ms).
class Pcm16kProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.ratio = sampleRate / 16000;
    this.pos = 0;
    this.prev = 0;
    this.out = new Int16Array(1600);
    this.n = 0;
  }
  process(inputs) {
    const ch = inputs[0] && inputs[0][0];
    if (!ch) return true;
    for (let i = 0; i < ch.length; i++) {
      const cur = ch[i];
      while (this.pos < 1) {
        const v = this.prev + (cur - this.prev) * this.pos;
        const s = Math.max(-1, Math.min(1, v));
        this.out[this.n++] = s < 0 ? s * 0x8000 : s * 0x7fff;
        if (this.n === this.out.length) {
          const buf = this.out.buffer.slice(0);
          this.port.postMessage(buf, [buf]);
          this.n = 0;
        }
        this.pos += this.ratio;
      }
      this.pos -= 1;
      this.prev = cur;
    }
    return true;
  }
}
registerProcessor("pcm16k", Pcm16kProcessor);
