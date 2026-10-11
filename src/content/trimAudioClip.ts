import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runFfmpeg } from "./runFfmpeg";

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
    return await readFile(output);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}
