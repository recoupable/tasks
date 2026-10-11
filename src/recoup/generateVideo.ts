import { callRecoupApi } from "./callRecoupApi";

/**
 * Generate ordinary video or audio-driven lipsync through the matching API primitive.
 *
 * @param params - Video generation parameters.
 * @returns URL of the generated video.
 */
export async function generateVideo(params: {
  imageUrl: string;
  prompt: string;
  audioUrl?: string;
  duration?: number;
}): Promise<string> {
  const body: Record<string, unknown> = {
    image_url: params.imageUrl,
    prompt: params.prompt,
    duration: params.duration ?? 15,
  };
  if (params.audioUrl) body.audio_url = params.audioUrl;

  const endpoint = params.audioUrl
    ? "/api/content/lipsync"
    : "/api/content/video";
  const data = await callRecoupApi(endpoint, body);
  return data.videoUrl as string;
}
