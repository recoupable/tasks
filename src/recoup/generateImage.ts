import { callRecoupApi } from "./callRecoupApi";

/**
 * Generate an image via POST /api/content/image.
 *
 * @param params - Image generation parameters.
 * @returns URL of the generated image.
 */
export async function generateImage(params: {
  prompt: string;
  referenceImageUrl?: string;
  images?: string[];
}): Promise<string> {
  const body: Record<string, unknown> = { prompt: params.prompt };
  const imageUrls = [
    ...new Set(
      [params.referenceImageUrl, ...(params.images ?? [])].filter(
        (url): url is string => Boolean(url && /^https?:\/\//.test(url))
      )
    ),
  ];
  if (imageUrls.length) body.image_urls = imageUrls;

  const data = await callRecoupApi("/api/content/image", body);
  return data.imageUrl as string;
}
