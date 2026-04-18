import { describe, expect, it } from "vitest";
import { parseWav } from "@/lib/wav";
import { buildPcmWav } from "../fixtures/wav";

function buildWav(opts: Parameters<typeof buildPcmWav>[0] = {}): ArrayBuffer {
  const buf = buildPcmWav(opts);
  const ab = new ArrayBuffer(buf.byteLength);
  new Uint8Array(ab).set(buf);
  return ab;
}

describe("parseWav", () => {
  it("parses a 1-second mono 22.05kHz 16-bit PCM clip", () => {
    const dataBytes = 22050 * 2; // 1s × 22050 samples × 2 bytes
    const info = parseWav(buildWav({ dataBytes }));
    expect(info.sampleRate).toBe(22050);
    expect(info.numChannels).toBe(1);
    expect(info.bitsPerSample).toBe(16);
    expect(info.numSamples).toBe(22050);
    expect(info.durationMs).toBe(1000);
  });

  it("computes duration for partial seconds", () => {
    const dataBytes = 22050 * 2 * 0.25; // 250ms
    const info = parseWav(buildWav({ dataBytes }));
    expect(info.durationMs).toBe(250);
  });

  it("rejects buffers smaller than the WAV header", () => {
    expect(() => parseWav(new ArrayBuffer(20))).toThrow(/too small/i);
  });

  it("rejects files missing the RIFF magic", () => {
    const bad = Buffer.alloc(44);
    bad.write("XXXX", 0);
    bad.write("WAVE", 8);
    expect(() =>
      parseWav(bad.buffer.slice(bad.byteOffset, bad.byteOffset + 44)),
    ).toThrow(/RIFF/);
  });

  it("rejects files missing the WAVE marker", () => {
    const bad = Buffer.alloc(44);
    bad.write("RIFF", 0);
    bad.write("XXXX", 8);
    expect(() =>
      parseWav(bad.buffer.slice(bad.byteOffset, bad.byteOffset + 44)),
    ).toThrow(/WAVE/);
  });

  it("rejects non-PCM compression formats (e.g. mp3-in-wav)", () => {
    expect(() => parseWav(buildWav({ format: 85 }))).toThrow(/PCM/);
  });

  it("rejects mismatched bit depths (24-bit, 32-bit float)", () => {
    expect(() => parseWav(buildWav({ bitsPerSample: 24 }))).toThrow(/16-bit/);
    expect(() => parseWav(buildWav({ bitsPerSample: 32 }))).toThrow(/16-bit/);
  });

  it("rejects unsupported channel counts (5.1, 7.1, …)", () => {
    expect(() => parseWav(buildWav({ numChannels: 6 }))).toThrow(
      /channel count/,
    );
  });

  it("rejects sample rates outside 8kHz–48kHz", () => {
    expect(() => parseWav(buildWav({ sampleRate: 4000 }))).toThrow(
      /sample rate/,
    );
    expect(() => parseWav(buildWav({ sampleRate: 96000 }))).toThrow(
      /sample rate/,
    );
  });

  it("walks past extra chunks (LIST) before the data chunk", () => {
    // Build a WAV with an extra 'LIST' chunk between fmt and data.
    const dataBytes = 22050 * 2;
    const listBody = 8;
    const total = 44 + 8 + listBody + dataBytes;
    const buf = Buffer.alloc(total);

    buf.write("RIFF", 0);
    buf.writeUInt32LE(total - 8, 4);
    buf.write("WAVE", 8);

    // fmt chunk (16 bytes body)
    buf.write("fmt ", 12);
    buf.writeUInt32LE(16, 16);
    buf.writeUInt16LE(1, 20);
    buf.writeUInt16LE(1, 22);
    buf.writeUInt32LE(22050, 24);
    buf.writeUInt32LE(22050 * 2, 28);
    buf.writeUInt16LE(2, 32);
    buf.writeUInt16LE(16, 34);

    // LIST chunk (skipped)
    buf.write("LIST", 36);
    buf.writeUInt32LE(listBody, 40);
    // 8 bytes of metadata body @ 44

    // data chunk
    const dataStart = 44 + listBody;
    buf.write("data", dataStart);
    buf.writeUInt32LE(dataBytes, dataStart + 4);

    const info = parseWav(
      buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength),
    );
    expect(info.durationMs).toBe(1000);
  });

  it("counts a 10s mono 22.05kHz clip as exactly 10000ms", () => {
    const info = parseWav(buildWav({ dataBytes: 22050 * 10 * 2 }));
    expect(info.durationMs).toBe(10_000);
  });

  it("flags an 11s clip well above the 10.5s server cap", () => {
    const info = parseWav(buildWav({ dataBytes: 22050 * 11 * 2 }));
    expect(info.durationMs).toBeGreaterThan(10_500);
  });
});
