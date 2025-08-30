export const IMAGE_UPLOAD_ENDPOINTS = {
  logos: {
    MAX_FILE_SIZE: 5 * 1024 * 1024,
    ALLOWED_FILE_TYPES: ["image/png", "image/jpeg", "image/webp", "image/gif"],
  },
};

export const BUCKET_NAME = process.env.S3_BUCKET_NAME!
const AWS_REGION = process.env.AWS_REGION!

const MIME_TYPES = {
  "image/png": "png",
  "image/jpeg": "jpeg",
  "image/webp": "webp",
  "image/gif": "gif",
} as const;

type MimeType = keyof typeof MIME_TYPES;
type Extension = (typeof MIME_TYPES)[MimeType];

/**
 * Convert a MIME type to its file extension.
 */
export function mimeTypeToExtension(mimeType: string): Extension | undefined {
  return MIME_TYPES[mimeType as MimeType];
}

type Endpoints = keyof typeof IMAGE_UPLOAD_ENDPOINTS;
type CheckFileOptions = {
  clientFileSize: number;
  clientFileType: string;
};
enum ErrorCodes {
  FILE_TOO_BIG = "FILE_TOO_BIG",
  INVALID_TYPE = "INVALID_TYPE",
}

export const checkFile = (
  endpoint: Endpoints,
  { clientFileSize, clientFileType }: CheckFileOptions
) => {
  const config = IMAGE_UPLOAD_ENDPOINTS[endpoint];
  if (clientFileSize > config.MAX_FILE_SIZE) {
    return {
      valid: false,
      reason: `File size exceeds maximum allowed (${config.MAX_FILE_SIZE} bytes).`,
      code: ErrorCodes.FILE_TOO_BIG,
    };
  }

  if (!(config.ALLOWED_FILE_TYPES as string[]).includes(clientFileType)) {
    return {
      valid: false,
      reason: `File type '${clientFileType}' is not allowed. Allowed types: ${config.ALLOWED_FILE_TYPES.join(
        ", "
      )}.`,
      code: ErrorCodes.INVALID_TYPE,
    };
  }

  return { valid: true };
};

export async function getFileChecksum(
  file: File,
  algorithm: "SHA-1" | "SHA-256" | "SHA-384" | "SHA-512" = "SHA-256"
) {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest(algorithm, buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// https://zenapt.s3.us-east-2.amazonaws.com/${key}

const baseUrl = `https://${BUCKET_NAME}.s3.${AWS_REGION}`

export function keyToFileUrl(key: string) {
    return `${baseUrl}/${key}`
}

export function extractS3Key(url: string): string | null {
  try {
    const u = new URL(url);
    // The pathname always starts with `/`, so remove it
    return u.pathname.startsWith("/") ? u.pathname.slice(1) : u.pathname;
  } catch {
    return null; // in case the input isn't a valid URL
  }
}
