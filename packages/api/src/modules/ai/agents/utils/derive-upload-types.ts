export type UploadMediaType = "file" | "image" | "video" | "audio";

/** Map chat model features to agent upload allow-list. Empty features → allow image (multimodal default). */
export function deriveUploadTypesFromModelFeatures(
    features?: string[] | null,
): UploadMediaType[] {
    const types = new Set<UploadMediaType>(["file"]);
    if (!features?.length) {
        types.add("image");
        return Array.from(types);
    }
    if (features.includes("vision")) types.add("image");
    if (features.includes("video")) types.add("video");
    if (features.includes("audio")) types.add("audio");
    return Array.from(types);
}
