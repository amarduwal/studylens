class AudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.bufferSize = 4096;
    this.buffer = new Float32Array(this.bufferSize);
    this.bufferIndex = 0;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (!input || !input[0]) return true;

    const inputChannel = input[0];

    for (let i = 0; i < inputChannel.length; i++) {
      this.buffer[this.bufferIndex++] = inputChannel[i];

      if (this.bufferIndex >= this.bufferSize) {
        // Convert to PCM
        const pcmData = new Int16Array(this.bufferSize);
        let sum = 0;

        for (let j = 0; j < this.bufferSize; j++) {
          const sample = this.buffer[j];
          pcmData[j] = Math.max(-32768, Math.min(32767, sample * 32768));
          sum += Math.abs(sample);
        }

        const level = Math.min(1, (sum / this.bufferSize) * 5);

        this.port.postMessage(
          {
            pcmData: pcmData.buffer,
            level: level,
          },
          [pcmData.buffer],
        );

        this.bufferIndex = 0;
      }
    }

    return true;
  }
}

registerProcessor('audio-processor', AudioProcessor);
