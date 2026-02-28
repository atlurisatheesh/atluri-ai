// function floatTo16BitPCM(float32Array) {
//   const buffer = new ArrayBuffer(float32Array.length * 2);
//   const view = new DataView(buffer);

//   let offset = 0;
//   for (let i = 0; i < float32Array.length; i++, offset += 2) {
//     let sample = Math.max(-1, Math.min(1, float32Array[i]));
//     view.setInt16(
//       offset,
//       sample < 0 ? sample * 0x8000 : sample * 0x7fff,
//       true
//     );
//   }
//   return new Uint8Array(buffer);
// }

// function downsampleBuffer(buffer, inputSampleRate, outputSampleRate) {
//   if (outputSampleRate === inputSampleRate) return buffer;

//   const ratio = inputSampleRate / outputSampleRate;
//   const newLength = Math.round(buffer.length / ratio);
//   const result = new Float32Array(newLength);

//   let offsetResult = 0;
//   let offsetBuffer = 0;

//   while (offsetResult < result.length) {
//     const nextOffsetBuffer = Math.round((offsetResult + 1) * ratio);
//     let sum = 0;
//     let count = 0;

//     for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
//       sum += buffer[i];
//       count++;
//     }

//     result[offsetResult++] = sum / count;
//     offsetBuffer = nextOffsetBuffer;
//   }

//   return result;
// }

// class PCMProcessor extends AudioWorkletProcessor {
//   constructor() {
//     super();
//     this.buffer = new Uint8Array(0);
//     this.inputSampleRate = sampleRate; // usually 48000
//     this.outputSampleRate = 16000;
//     this.FLUSH_SIZE = 640; // 🔥 20ms @ 16kHz PCM16
//   }

//   process(inputs) {
//     const input = inputs[0];
//     if (!input || !input[0]) return true;

//     const downsampled = downsampleBuffer(
//       input[0],
//       this.inputSampleRate,
//       this.outputSampleRate
//     );

//     const pcm16 = floatTo16BitPCM(downsampled);

//     // Append to buffer
//     const merged = new Uint8Array(this.buffer.length + pcm16.length);
//     merged.set(this.buffer);
//     merged.set(pcm16, this.buffer.length);
//     this.buffer = merged;

//     // 🔥 Flush every 20ms
//     while (this.buffer.length >= this.FLUSH_SIZE) {
//       const chunk = this.buffer.slice(0, this.FLUSH_SIZE);
//       this.port.postMessage(chunk.buffer);
//       this.buffer = this.buffer.slice(this.FLUSH_SIZE);
//     }

//     return true;
//   }
// }

// registerProcessor("pcm-processor", PCMProcessor);



function floatTo16BitPCM(float32Array) {
  const buffer = new ArrayBuffer(float32Array.length * 2);
  const view = new DataView(buffer);

  let offset = 0;
  for (let i = 0; i < float32Array.length; i++, offset += 2) {
    let sample = Math.max(-1, Math.min(1, float32Array[i]));
    view.setInt16(
      offset,
      sample < 0 ? sample * 0x8000 : sample * 0x7fff,
      true
    );
  }
  return new Uint8Array(buffer);
}

function downsampleBuffer(buffer, inputSampleRate, outputSampleRate) {
  if (outputSampleRate === inputSampleRate) return buffer;

  const ratio = inputSampleRate / outputSampleRate;
  const newLength = Math.round(buffer.length / ratio);
  const result = new Float32Array(newLength);

  let offsetResult = 0;
  let offsetBuffer = 0;

  while (offsetResult < result.length) {
    const nextOffsetBuffer = Math.round((offsetResult + 1) * ratio);
    let sum = 0;
    let count = 0;

    for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
      sum += buffer[i];
      count++;
    }

    result[offsetResult++] = sum / count;
    offsetBuffer = nextOffsetBuffer;
  }

  return result;
}

class PCMProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.buffer = new Uint8Array(0);
    this.inputSampleRate = sampleRate; // 48kHz
    this.outputSampleRate = 16000;
    this.FLUSH_SIZE = 3200; // 100ms @ 16kHz PCM16
  }

  process(inputs) {
    const input = inputs[0];
    if (!input || !input[0]) return true;

    const channelData = input[0];

    const downsampled = downsampleBuffer(
      channelData,
      this.inputSampleRate,
      this.outputSampleRate
    );

    const pcm16 = floatTo16BitPCM(downsampled);

    const merged = new Uint8Array(this.buffer.length + pcm16.length);
    merged.set(this.buffer);
    merged.set(pcm16, this.buffer.length);
    this.buffer = merged;

    while (this.buffer.length >= this.FLUSH_SIZE) {
      const chunk = this.buffer.slice(0, this.FLUSH_SIZE);
      this.port.postMessage(chunk.buffer);
      this.buffer = this.buffer.slice(this.FLUSH_SIZE);
    }

    return true;
  }
}

registerProcessor("pcm-processor", PCMProcessor);
