import { deriveUploadTypesFromModelFeatures } from "./derive-upload-types";

describe("deriveUploadTypesFromModelFeatures", () => {
    it("defaults to file+image when features are empty", () => {
        expect(deriveUploadTypesFromModelFeatures([])).toEqual(["file", "image"]);
        expect(deriveUploadTypesFromModelFeatures(null)).toEqual(["file", "image"]);
    });

    it("maps vision/video/audio features", () => {
        expect(deriveUploadTypesFromModelFeatures(["vision", "tool-call"])).toEqual([
            "file",
            "image",
        ]);
        expect(deriveUploadTypesFromModelFeatures(["video", "audio"])).toEqual([
            "file",
            "video",
            "audio",
        ]);
    });

    it("does not add image without vision when features are present", () => {
        expect(deriveUploadTypesFromModelFeatures(["tool-call"])).toEqual(["file"]);
    });
});
