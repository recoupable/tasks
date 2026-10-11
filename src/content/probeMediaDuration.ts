import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

/** Read the encoded duration; invalid or unknown lengths cannot prove a clip window. */
export async function probeMediaDuration(path: string): Promise<number> {
  const { stdout } = await execFileAsync(
    "ffprobe",
    ["-v", "error", "-show_entries", "format=duration", "-of", "json", path],
    { timeout: 30_000, maxBuffer: 1024 * 1024 }
  );
  const duration = Number(JSON.parse(stdout).format?.duration);
  if (!Number.isFinite(duration) || duration <= 0)
    throw new Error("Invalid media duration");
  return duration;
}
