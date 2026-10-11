import { describe, it, expect } from "vitest";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runFfmpeg } from "../runFfmpeg";
import { probeMediaAudio } from "../probeMediaAudio";
import { trimAudioClip } from "../trimAudioClip";

describe("ffmpeg artifact evidence", () => {
  it("distinguishes silent and audible files and trims a real selected window", async () => {
    const dir = await mkdtemp(join(tmpdir(), "audio-regression-"));
    try {
      const silent = join(dir, "silent.mp4");
      const audible = join(dir, "audible.mp4");
      const song = join(dir, "song.mp3");
      await runFfmpeg([
        "-y",
        "-f",
        "lavfi",
        "-i",
        "color=c=black:s=16x16:d=1",
        "-an",
        silent,
      ]);
      await runFfmpeg([
        "-y",
        "-f",
        "lavfi",
        "-i",
        "color=c=black:s=16x16:d=1",
        "-f",
        "lavfi",
        "-i",
        "sine=frequency=440:duration=1",
        "-shortest",
        audible,
      ]);
      await runFfmpeg([
        "-y",
        "-f",
        "lavfi",
        "-i",
        "sine=frequency=440:duration=8",
        song,
      ]);
      expect(await probeMediaAudio(silent)).toBe(false);
      expect(await probeMediaAudio(audible)).toBe(true);
      await expect(probeMediaAudio(join(dir, "missing.mp4"))).rejects.toThrow();
      const trimmed = await trimAudioClip(await readFile(song), 2, 5);
      expect(trimmed.length).toBeGreaterThan(0);
      expect(trimmed.length).toBeLessThan((await readFile(song)).length);
      await expect(trimAudioClip(Buffer.alloc(0), 0, 20)).rejects.toThrow(
        "Invalid lipsync"
      );
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }, 30_000);
});
