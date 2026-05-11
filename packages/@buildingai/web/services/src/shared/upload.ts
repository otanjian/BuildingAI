import type { AxiosProgressEvent } from "axios";

import { apiHttpClient } from "../base";

export type UploadFileResult = {
    id: string;
    url: string;
    originalName: string;
    size: number;
    mimeType: string;
    extension: string;
};

export type UploadFileParams = {
    description?: string;
    extensionId?: string;
};

export type UploadRequestOptions = {
    onUploadProgress?: (event: AxiosProgressEvent) => void;
};

function inferExtensionIdFromLocation(): string | undefined {
    if (typeof window === "undefined") {
        return undefined;
    }

    const pathname = window.location.pathname || "";
    const match = pathname.match(/(?:^|\/)extension\/([^/]+)/);
    return match?.[1] || undefined;
}

export function resolveUploadFileParams(params?: UploadFileParams): UploadFileParams | undefined {
    const extensionId = params?.extensionId || inferExtensionIdFromLocation();

    if (!params && !extensionId) {
        return undefined;
    }

    return {
        ...params,
        ...(extensionId ? { extensionId } : {}),
    };
}

export async function uploadFile(
    file: File,
    params?: UploadFileParams,
    options?: UploadRequestOptions,
): Promise<UploadFileResult> {
    const resolvedParams = resolveUploadFileParams(params);
    const formData = new FormData();
    formData.append("file", file);
    if (resolvedParams?.description) {
        formData.append("description", resolvedParams.description);
    }
    if (resolvedParams?.extensionId) {
        formData.append("extensionId", resolvedParams.extensionId);
    }

    return apiHttpClient.post<UploadFileResult>("/upload/file", formData, {
        headers: {
            "Content-Type": "multipart/form-data",
        },
        onUploadProgress: options?.onUploadProgress,
    });
}

export async function uploadFiles(
    files: File[],
    params?: UploadFileParams,
    options?: UploadRequestOptions,
): Promise<UploadFileResult[]> {
    const resolvedParams = resolveUploadFileParams(params);
    const formData = new FormData();
    files.forEach((file) => {
        formData.append("files", file);
    });
    if (resolvedParams?.description) {
        formData.append("description", resolvedParams.description);
    }
    if (resolvedParams?.extensionId) {
        formData.append("extensionId", resolvedParams.extensionId);
    }

    return apiHttpClient.post<UploadFileResult[]>("/upload/files", formData, {
        headers: {
            "Content-Type": "multipart/form-data",
        },
        onUploadProgress: options?.onUploadProgress,
    });
}

/**
 * Upload file during system initialization (no authentication required)
 * Only available when system is not initialized
 */
export async function uploadInitFile(
    file: File,
    params?: UploadFileParams,
    options?: UploadRequestOptions,
): Promise<UploadFileResult> {
    const resolvedParams = resolveUploadFileParams(params);
    const formData = new FormData();
    formData.append("file", file);
    if (resolvedParams?.description) {
        formData.append("description", resolvedParams.description);
    }
    if (resolvedParams?.extensionId) {
        formData.append("extensionId", resolvedParams.extensionId);
    }

    return apiHttpClient.post<UploadFileResult>("/upload/init-file", formData, {
        headers: {
            "Content-Type": "multipart/form-data",
        },
        onUploadProgress: options?.onUploadProgress,
    });
}

export function detectFileType(mimeType: string): "image" | "video" | "file" {
    if (mimeType.startsWith("image/")) {
        return "image";
    }
    if (mimeType.startsWith("video/")) {
        return "video";
    }
    return "file";
}
