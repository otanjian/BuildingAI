const FILE_TYPES = [
  { type: "image" as const, accept: "image/*", feature: "vision", label: "图片" },
  { type: "video" as const, accept: "video/*", feature: "video", label: "视频" },
  { type: "audio" as const, accept: "audio/*", feature: "audio", label: "音频" },
  {
    type: "file" as const,
    accept: ".pdf,.docx,.doc,.ppt,.pptx,.md,.txt,.xlsx,.csv",
    feature: undefined,
    label: "文件",
  },
] as const;

export { FILE_TYPES };

export type FileType = (typeof FILE_TYPES)[number]["type"];

export function getAvailableFileTypes(features?: string[]): FileType[] {
  // Unknown/empty features: treat as multimodal-capable so image paste is not
  // falsely rejected when the agent has no linked chat model feature flags yet.
  const availableTypes: FileType[] = ["file"];

  if (!features?.length) {
    availableTypes.push("image");
    return availableTypes;
  }

  FILE_TYPES.forEach((fileType) => {
    if (fileType.feature && features.includes(fileType.feature)) {
      availableTypes.push(fileType.type);
    }
  });

  return availableTypes;
}

/**
 * Resolve upload allow-list from model features and optional agent override.
 * - override omitted → features only
 * - override empty → no uploads (file upload disabled)
 * - otherwise → union(override, features), so vision is not hidden by a "file"-only sync list
 */
export function resolveAvailableFileTypes(
  features?: string[],
  supportedUploadTypesOverride?: FileType[],
): FileType[] {
  const fromFeatures = getAvailableFileTypes(features);
  if (supportedUploadTypesOverride == null) {
    return fromFeatures;
  }
  if (supportedUploadTypesOverride.length === 0) {
    return [];
  }
  return Array.from(new Set<FileType>([...supportedUploadTypesOverride, ...fromFeatures]));
}

export interface FileValidationResult {
  validFiles: File[];
  invalidFiles: File[];
  unsupportedTypeLabels: string[];
}

export function validateFilesAgainstTypes(
  files: File[],
  availableTypes: FileType[],
): FileValidationResult {
  const validFiles: File[] = [];
  const invalidFiles: File[] = [];
  const unsupportedTypeSet = new Set<string>();

  for (const file of files) {
    const mimeType = file.type;
    let isValid = false;

    for (const type of availableTypes) {
      const fileTypeConfig = FILE_TYPES.find((ft) => ft.type === type);
      if (!fileTypeConfig) continue;

      const { accept } = fileTypeConfig;
      if (accept.endsWith("/*")) {
        const prefix = accept.slice(0, -1);
        if (mimeType.startsWith(prefix)) {
          isValid = true;
          break;
        }
      } else {
        const extensions = accept.split(",").map((ext) => ext.trim().toLowerCase());
        const fileName = file.name.toLowerCase();
        if (extensions.some((ext) => fileName.endsWith(ext))) {
          isValid = true;
          break;
        }
      }
    }

    if (isValid) {
      validFiles.push(file);
    } else {
      invalidFiles.push(file);
      for (const ft of FILE_TYPES) {
        if (ft.accept.endsWith("/*")) {
          const prefix = ft.accept.slice(0, -1);
          if (mimeType.startsWith(prefix)) {
            unsupportedTypeSet.add(ft.label);
            break;
          }
        }
      }
      if (unsupportedTypeSet.size === 0 || !mimeType) {
        unsupportedTypeSet.add("文件");
      }
    }
  }

  return {
    invalidFiles,
    unsupportedTypeLabels: Array.from(unsupportedTypeSet),
    validFiles,
  };
}
