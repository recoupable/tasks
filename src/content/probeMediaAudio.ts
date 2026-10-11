import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

/** Inspect the actual downloaded artifact; probe failures must not become success. */
export async function probeMediaAudio(path: string): Promise<boolean> {
  const { stdout } = await execFileAsync(
    "ffprobe",
    [
      "-v",
      "error",
      "-select_streams",
      "a",
      "-show_entries",
      "stream=codec_type",
      "-of",
      "json",
      path,
    ],
    { timeout: 30_000, maxBuffer: 1024 * 1024 }
  );
  const data = JSON.parse(stdout) as {
    streams?: Array<{ codec_type?: string }>;
  };
  if (!Array.isArray(data.streams))
    throw new Error("Invalid ffprobe stream response");
  return data.streams.some((stream) => stream.codec_type === "audio");
}
