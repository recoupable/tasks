import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderFinalVideo } from "../renderFinalVideo";
import { probeMediaAudio } from "../probeMediaAudio";
import { runFfmpeg } from "../runFfmpeg";
import { uploadToFalStorage } from "../uploadToFalStorage";
import { buildFfmpegArgs } from "../buildFfmpegArgs";

vi.mock("../../sandboxes/logStep", () => ({ logStep: vi.fn() }));
vi.mock("../downloadMediaToFile", () => ({ downloadMediaToFile: vi.fn() }));
vi.mock("../probeMediaAudio", () => ({ probeMediaAudio: vi.fn() }));
vi.mock("../runFfmpeg", () => ({ runFfmpeg: vi.fn() }));
vi.mock("../uploadToFalStorage", () => ({
  uploadToFalStorage: vi.fn(async () => ({
    url: "https://x.test/final.mp4",
    mimeType: "video/mp4",
    sizeBytes: 100,
  })),
}));
vi.mock("../buildFfmpegArgs", () => ({ buildFfmpegArgs: vi.fn(() => []) }));
const input = {
  videoUrl: "https://x.test/generated.mp4",
  songBuffer: Buffer.from("fixture-song"),
  audioStartSeconds: 30,
  audioDurationSeconds: 15,
  captionText: "",
  requireGeneratedAudio: true,
};

describe("generated audio evidence before delivery", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects a silent lipsync output before rendering or uploading", async () => {
    vi.mocked(probeMediaAudio).mockResolvedValue(false);
    await expect(renderFinalVideo(input)).rejects.toThrow(
      "Lipsync video has no audio stream"
    );
    expect(runFfmpeg).not.toHaveBeenCalled();
    expect(uploadToFalStorage).not.toHaveBeenCalled();
  });

  it("uses generated audio only after probing it", async () => {
    vi.mocked(probeMediaAudio).mockResolvedValue(true);
    await renderFinalVideo(input);
    expect(buildFfmpegArgs).toHaveBeenCalledWith(
      expect.objectContaining({ hasAudio: true })
    );
    expect(uploadToFalStorage).toHaveBeenCalledOnce();
  });

  it("overlays the selected song for ordinary video even if the provider emitted audio", async () => {
    vi.mocked(probeMediaAudio).mockResolvedValue(true);
    await renderFinalVideo({ ...input, requireGeneratedAudio: false });
    expect(buildFfmpegArgs).toHaveBeenCalledWith(
      expect.objectContaining({ hasAudio: false, audioStartSeconds: 30 })
    );
  });
});
