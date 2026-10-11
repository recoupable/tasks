import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runFfmpeg } from "./runFfmpeg";
import { probeMediaDuration } from "./probeMediaDuration";

/** Upload only the selected song window to the audio-driven generator. */
export async function trimAudioClip(
  song: Buffer,
  start: number,
  duration: number
): Promise<Buffer> {
  if (
    !Number.isFinite(start) ||
    start < 0 ||
    !Number.isInteger(duration) ||
    duration < 5 ||
    duration > 19
  ) {
    throw new Error(
      "Invalid lipsync audio window: duration must be 5–19 whole seconds"
    );
  }
  const directory = await mkdtemp(join(tmpdir(), "content-audio-"));
  const source = join(directory, "song.mp3");
  const output = join(directory, "selected-clip.mp3");
  try {
    await writeFile(source, song);
    const sourceDuration = await probeMediaDuration(source);
    // Allow MP3 encoder padding, but never silently accept a truncated selection.
    if (start + duration > sourceDuration + 0.05)
      throw new Error(
        "Invalid lipsync audio window: selection exceeds the song duration"
      );
    await runFfmpeg([
      "-y",
      "-ss",
      String(start),
      "-i",
      source,
      "-t",
      String(duration),
      "-vn",
      "-c:a",
      "libmp3lame",
      output,
    ]);
    if (Math.abs((await probeMediaDuration(output)) - duration) > 0.1)
      throw new Error(
        "Invalid lipsync audio window: trimmed duration does not match selection"
      );
    return await readFile(output);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}
