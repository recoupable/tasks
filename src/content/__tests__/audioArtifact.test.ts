import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { describe, it, expect } from "vitest";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runFfmpeg } from "../runFfmpeg";
import { probeMediaAudio } from "../probeMediaAudio";
import { trimAudioClip } from "../trimAudioClip";

describe("ffmpeg artifact evidence", () => {
  it("distinguishes audio stream presence and verifies a real selected window", async () => {
    const dir = await mkdtemp(join(tmpdir(), "audio-regression-"));
    try {
      const silent = join(dir, "silent.mp4");
      const audible = join(dir, "audible.mp4");
      const song = join(dir, "song.mp3");
      const exec = promisify(execFile);
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
        "aevalsrc=if(lt(t\\,2)\\,0\\,0.25*sin(2*PI*880*t)):s=44100:d=8",
        song,
      ]);
      expect(await probeMediaAudio(silent)).toBe(false);
      expect(await probeMediaAudio(audible)).toBe(true);
      await expect(probeMediaAudio(join(dir, "missing.mp4"))).rejects.toThrow();
      const trimmed = await trimAudioClip(await readFile(song), 2, 5);
      expect(trimmed.length).toBeGreaterThan(0);
      expect(trimmed.length).toBeLessThan((await readFile(song)).length);
      const clip = join(dir, "clip.mp3");
      await writeFile(clip, trimmed);
      const { stdout } = await exec("ffprobe", [
        "-v",
        "error",
        "-show_entries",
        "format=duration",
        "-of",
        "json",
        clip,
      ]);
      expect(Number(JSON.parse(stdout).format.duration)).toBeCloseTo(5, 1);
      const { stdout: samples } = await exec(
        "ffmpeg",
        [
          "-v",
          "error",
          "-i",
          clip,
          "-t",
          "0.5",
          "-f",
          "f32le",
          "-ac",
          "1",
          "-ar",
          "8000",
          "pipe:1",
        ],
        { encoding: "buffer" }
      );
      let squared = 0;
      for (let i = 0; i < samples.length; i += 4)
        squared += samples.readFloatLE(i) ** 2;
      expect(Math.sqrt(squared / (samples.length / 4))).toBeGreaterThan(0.1);
      for (const start of [4, 10]) {
        await expect(
          trimAudioClip(await readFile(song), start, 5)
        ).rejects.toThrow("Invalid lipsync audio window");
      }
      await expect(trimAudioClip(Buffer.alloc(0), 0, 20)).rejects.toThrow(
        "Invalid lipsync"
      );
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }, 30_000);
});
