/**
 * Build a minimal RIFF WAV (PCM) header followed by `dataBytes` of silence.
 * Shared between the parseWav unit tests and the E2E upload fixture so both
 * exercise exactly the format the production trimmer emits.
 */
export function buildPcmWav({
  sampleRate = 22050,
  numChannels = 1,
  bitsPerSample = 16,
  dataBytes = 0,
  format = 1,
}: {
  sampleRate?: number;
  numChannels?: number;
  bitsPerSample?: number;
  dataBytes?: number;
  format?: number;
} = {}): Buffer {
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const buf = Buffer.alloc(44 + dataBytes);

  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + dataBytes, 4);
  buf.write("WAVE", 8);
  buf.write("fmt ", 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(format, 20);
  buf.writeUInt16LE(numChannels, 22);
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(byteRate, 28);
  buf.writeUInt16LE(blockAlign, 32);
  buf.writeUInt16LE(bitsPerSample, 34);
  buf.write("data", 36);
  buf.writeUInt32LE(dataBytes, 40);

  return buf;
}

/**
 * Convenience: produce silence of the given duration as the production
 * trimmer would (mono 16-bit PCM at the trimmer's target sample rate).
 */
export function buildSilentWav({
  sampleRate = 22050,
  durationSec = 0.5,
}: {
  sampleRate?: number;
  durationSec?: number;
} = {}): Buffer {
  const numSamples = Math.floor(sampleRate * durationSec);
  return buildPcmWav({
    sampleRate,
    numChannels: 1,
    bitsPerSample: 16,
    dataBytes: numSamples * 2,
  });
}
