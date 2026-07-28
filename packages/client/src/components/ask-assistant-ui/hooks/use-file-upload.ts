import { uploadFilesAuto } from "@buildingai/services/shared";
import { usePromptInputAttachments } from "@buildingai/ui/components/ai-elements/prompt-input";
import type { FileUIPart } from "ai";
import { useCallback, useMemo } from "react";

import {
  FILE_TYPES,
  type FileType,
  type FileValidationResult,
  getAvailableFileTypes,
  resolveAvailableFileTypes,
  validateFilesAgainstTypes,
} from "./file-upload-types";

export type { FileType, FileValidationResult };
export { getAvailableFileTypes, resolveAvailableFileTypes, validateFilesAgainstTypes };

/**
 * @param multiple Allow multiple file selection
 * @param features Model feature flags used to derive available file types
 * @param supportedUploadTypesOverride Explicit override (e.g. from third-party agent capability).
 *        When provided, takes precedence over features-based derivation.
 */
export function useFileUpload(
  multiple?: boolean,
  features?: string[],
  supportedUploadTypesOverride?: FileType[],
) {
  const attachments = usePromptInputAttachments();

  const availableFileTypes = useMemo(
    () => resolveAvailableFileTypes(features, supportedUploadTypesOverride),
    [features, supportedUploadTypesOverride],
  );

  const validateFiles = useCallback(
    (files: File[]): FileValidationResult => {
      return validateFilesAgainstTypes(files, availableFileTypes);
    },
    [availableFileTypes],
  );

  const hasImageSupport = useMemo(() => availableFileTypes.includes("image"), [availableFileTypes]);

  const handleFileSelect = useCallback(() => {
    if (availableFileTypes.length === 0) return;

    const acceptList: string[] = [];
    availableFileTypes.forEach((type) => {
      const fileType = FILE_TYPES.find((ft) => ft.type === type);
      if (fileType?.accept) {
        acceptList.push(fileType.accept);
      }
    });

    const input = document.createElement("input");
    input.type = "file";
    input.multiple = multiple ?? true;
    if (acceptList.length > 0) {
      input.accept = acceptList.join(",");
    }
    input.onchange = (e) => {
      const files = Array.from((e.target as HTMLInputElement).files || []);
      if (files.length) {
        attachments.add(files);
      }
    };
    input.click();
  }, [attachments, multiple, availableFileTypes]);

  const uploadFilesIfNeeded = useCallback(async (files: FileUIPart[]): Promise<FileUIPart[]> => {
    const needsUpload = files.some(
      (file) => file.url.startsWith("blob:") || file.url.startsWith("data:"),
    );

    if (!needsUpload) {
      return files;
    }

    try {
      const filePromises = files.map(async (file) => {
        if (file.url.startsWith("blob:") || file.url.startsWith("data:")) {
          const response = await fetch(file.url);
          const blob = await response.blob();
          const extension = file.mediaType?.split("/")[1] || "bin";
          return new File([blob], file.filename || `file.${extension}`, {
            type: file.mediaType || "application/octet-stream",
          });
        }
        return null;
      });

      const filesToUpload = (await Promise.all(filePromises)).filter((f): f is File => f !== null);

      if (!filesToUpload.length) {
        return files;
      }

      const uploadResults = await uploadFilesAuto(filesToUpload);
      const uploadedFiles: FileUIPart[] = uploadResults.map((result) => ({
        type: "file" as const,
        url: result.url,
        mediaType: result.mimeType,
        filename: result.originalName,
      }));

      const remoteFiles = files.filter(
        (file) => !file.url.startsWith("blob:") && !file.url.startsWith("data:"),
      );

      return [...uploadedFiles, ...remoteFiles];
    } catch (error) {
      console.error("Failed to upload files:", error);
      return files;
    }
  }, []);

  return {
    handleFileSelect,
    uploadFilesIfNeeded,
    validateFiles,
    availableFileTypes,
    hasImageSupport,
  };
}
