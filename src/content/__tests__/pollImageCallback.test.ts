import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const { poll } = vi.hoisted(() => ({ poll: vi.fn() }));
vi.mock("@trigger.dev/sdk", () => ({ runs: { poll } }));
vi.mock("@trigger.dev/sdk/v3", () => ({ runs: { poll } }));
vi.mock("../../sandboxes/logStep", () => ({ logStep: vi.fn() }));
import { pollContentRuns } from "../pollContentRuns";
import { sendContentCallback } from "../sendContentCallback";

beforeEach(() => {
  vi.clearAllMocks();
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});
describe("preserving existing image output through polling and callback serialization", () => {
  it("keeps image and video URLs associated with each run", async () => {
    poll
      .mockResolvedValueOnce({
        status: "COMPLETED",
        output: {
          videoSourceUrl: "https://cdn.example.com/one.mp4",
          imageUrl: "https://cdn.example.com/one.png",
          captionText: "one",
        },
      })
      .mockResolvedValueOnce({
        status: "COMPLETED",
        output: {
          videoSourceUrl: "https://cdn.example.com/two.mp4",
          imageUrl: "https://cdn.example.com/two.jpg",
        },
      });
    expect(await pollContentRuns(["r1", "r2"])).toEqual([
      {
        runId: "r1",
        status: "completed",
        videoUrl: "https://cdn.example.com/one.mp4",
        imageUrl: "https://cdn.example.com/one.png",
        captionText: "one",
      },
      {
        runId: "r2",
        status: "completed",
        videoUrl: "https://cdn.example.com/two.mp4",
        imageUrl: "https://cdn.example.com/two.jpg",
        captionText: undefined,
      },
    ]);
    expect(poll).toHaveBeenCalledTimes(2);
    expect(poll).toHaveBeenCalledWith("r1", { pollIntervalMs: 30_000 });
  });
  it("preserves the old serialized shape if imageUrl is absent", async () => {
    poll.mockResolvedValue({
      status: "COMPLETED",
      output: { videoSourceUrl: "https://cdn.example.com/video.mp4" },
    });
    expect(JSON.parse(JSON.stringify(await pollContentRuns(["r1"])))).toEqual([
      {
        runId: "r1",
        status: "completed",
        videoUrl: "https://cdn.example.com/video.mp4",
      },
    ]);
  });
  it("does not invent image output for failed or rejected runs", async () => {
    poll
      .mockResolvedValueOnce({
        status: "FAILED",
        output: { imageUrl: "https://cdn.example.com/no.png" },
      })
      .mockRejectedValueOnce(new Error("fixture poll error"));
    expect(await pollContentRuns(["r1", "r2"])).toEqual([
      { runId: "r1", status: "failed", error: "Run failed" },
      { runId: "r2", status: "failed", error: "fixture poll error" },
    ]);
  });
  it("passes the existing generated image through the real callback serializer", async () => {
    vi.stubEnv("CODING_AGENT_CALLBACK_SECRET", "fixture-secret");
    vi.stubEnv(
      "CONTENT_AGENT_CALLBACK_URL",
      "https://fixture.example.com/api/content-agent/callback",
    );
    poll.mockResolvedValue({
      status: "COMPLETED",
      output: {
        videoSourceUrl: "https://cdn.example.com/video.mp4",
        imageUrl: "https://cdn.example.com/image.png",
        captionText: "fixture caption",
      },
    });
    const transport = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(null, { status: 200 }));
    const results = await pollContentRuns(["r1"]);
    await sendContentCallback("slack:C1:T1", "completed", results);
    expect(transport).toHaveBeenCalledTimes(1);
    const [url, options] = transport.mock.calls[0];
    expect(url).toBe("https://fixture.example.com/api/content-agent/callback");
    expect(JSON.parse(options?.body as string)).toEqual({
      threadId: "slack:C1:T1",
      status: "completed",
      results: [
        {
          runId: "r1",
          status: "completed",
          videoUrl: "https://cdn.example.com/video.mp4",
          imageUrl: "https://cdn.example.com/image.png",
          captionText: "fixture caption",
        },
      ],
    });
    expect(options?.method).toBe("POST");
    expect(
      (options?.headers as Record<string, string>)["x-callback-secret"],
    ).toBe("fixture-secret");
  });
});
