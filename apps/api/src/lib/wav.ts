/** Encode an AudioBuffer as a 16-bit PCM WAV Blob. */
export function encodeWav(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const bitsPerSample = 16;

  const channels: Float32Array[] = [];
  for (let ch = 0; ch < numChannels; ch++) {
    channels.push(buffer.getChannelData(ch));
  }

  const numSamples = buffer.length;
  const dataLength = numSamples * numChannels * (bitsPerSample / 8);
  const totalLength = 44 + dataLength;

  const arrayBuffer = new ArrayBuffer(totalLength);
  const view = new DataView(arrayBuffer);

  writeString(view, 0, "RIFF");
  view.setUint32(4, totalLength - 8, true);
  writeString(view, 8, "WAVE");
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * (bitsPerSample / 8), true);
  view.setUint16(32, numChannels * (bitsPerSample / 8), true);
  view.setUint16(34, bitsPerSample, true);
  writeString(view, 36, "data");
  view.setUint32(40, dataLength, true);

  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const sample = Math.max(-1, Math.min(1, channels[ch][i]));
      view.setInt16(
        offset,
        sample < 0 ? sample * 0x8000 : sample * 0x7fff,
        true,
      );
      offset += 2;
    }
  }

  return new Blob([arrayBuffer], { type: "audio/wav" });
}

function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

export interface WavInfo {
  sampleRate: number;
  numChannels: number;
  bitsPerSample: number;
  /** Number of audio sample frames (per channel). */
  numSamples: number;
  durationMs: number;
}

/**
 * Parse a 16-bit PCM WAV header. Throws on anything we don't accept so
 * uploads can't smuggle in long or non-PCM audio behind a WAV MIME type.
 */
export function parseWav(buffer: ArrayBuffer): WavInfo {
  if (buffer.byteLength < 44) throw new Error("WAV: too small");
  const view = new DataView(buffer);

  if (readAscii(view, 0, 4) !== "RIFF") throw new Error("WAV: missing RIFF");
  if (readAscii(view, 8, 4) !== "WAVE") throw new Error("WAV: missing WAVE");

  // Walk subchunks (fmt, data, optional LIST/fact, …) starting after "WAVE".
  let offset = 12;
  let format: number | null = null;
  let numChannels = 0;
  let sampleRate = 0;
  let bitsPerSample = 0;
  let dataSize: number | null = null;

  while (offset + 8 <= view.byteLength) {
    const id = readAscii(view, offset, 4);
    const size = view.getUint32(offset + 4, true);
    const body = offset + 8;
    if (id === "fmt ") {
      if (size < 16) throw new Error("WAV: short fmt");
      format = view.getUint16(body, true);
      numChannels = view.getUint16(body + 2, true);
      sampleRate = view.getUint32(body + 4, true);
      bitsPerSample = view.getUint16(body + 14, true);
    } else if (id === "data") {
      dataSize = size;
      break;
    }
    offset = body + size + (size % 2); // chunks are word-aligned
  }

  if (format !== 1) throw new Error("WAV: only PCM accepted");
  if (numChannels < 1 || numChannels > 2)
    throw new Error("WAV: unsupported channel count");
  if (sampleRate < 8000 || sampleRate > 48000)
    throw new Error("WAV: unsupported sample rate");
  if (bitsPerSample !== 16) throw new Error("WAV: only 16-bit PCM accepted");
  if (dataSize == null) throw new Error("WAV: missing data chunk");

  const bytesPerFrame = numChannels * (bitsPerSample / 8);
  const numSamples = Math.floor(dataSize / bytesPerFrame);
  const durationMs = Math.round((numSamples / sampleRate) * 1000);

  return { sampleRate, numChannels, bitsPerSample, numSamples, durationMs };
}

function readAscii(view: DataView, offset: number, length: number): string {
  let s = "";
  for (let i = 0; i < length; i++)
    s += String.fromCharCode(view.getUint8(offset + i));
  return s;
}
