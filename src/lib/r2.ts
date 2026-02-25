import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";

export const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB

function getBucket() {
  return process.env.R2_BUCKET_NAME ?? "";
}

function getClient() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error(
      "Missing R2 env vars: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY"
    );
  }

  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
}

/**
 * Generate a namespaced R2 key for an item photo.
 * Format: estates/{estateId}/items/{itemId}/{uuid}.{ext}
 */
export function generateR2Key(
  estateId: string,
  itemId: string,
  filename: string
): string {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "jpg";
  return `estates/${estateId}/items/${itemId}/${randomUUID()}.${ext}`;
}

/** Upload a file buffer to R2. Rejects files over MAX_FILE_SIZE. */
export async function uploadFile(
  r2Key: string,
  body: Buffer,
  contentType: string
): Promise<void> {
  if (body.length > MAX_FILE_SIZE) {
    throw new Error(
      `File exceeds maximum size of ${MAX_FILE_SIZE / 1024 / 1024}MB`
    );
  }

  const client = getClient();
  await client.send(
    new PutObjectCommand({
      Bucket: getBucket(),
      Key: r2Key,
      Body: body,
      ContentType: contentType,
    })
  );
}

/** Delete a single file from R2. */
export async function deleteFile(r2Key: string): Promise<void> {
  const client = getClient();
  await client.send(
    new DeleteObjectCommand({
      Bucket: getBucket(),
      Key: r2Key,
    })
  );
}

/** Batch delete files from R2. No-op for empty array. */
export async function deleteFiles(r2Keys: string[]): Promise<void> {
  if (r2Keys.length === 0) return;

  const client = getClient();
  await client.send(
    new DeleteObjectsCommand({
      Bucket: getBucket(),
      Delete: {
        Objects: r2Keys.map((Key) => ({ Key })),
      },
    })
  );
}

/** Download a file from R2 and return it as a Buffer. */
export async function getFileBuffer(r2Key: string): Promise<Buffer> {
  const client = getClient();
  const response = await client.send(
    new GetObjectCommand({ Bucket: getBucket(), Key: r2Key })
  );

  if (!response.Body) {
    throw new Error(`Empty response body for key: ${r2Key}`);
  }

  // Convert readable stream to buffer
  const chunks: Uint8Array[] = [];
  const stream = response.Body as AsyncIterable<Uint8Array>;
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

/** Get a signed URL for viewing a file. Expires in 1 hour. */
export async function getSignedViewUrl(r2Key: string): Promise<string> {
  const client = getClient();
  return getSignedUrl(
    client,
    new GetObjectCommand({ Bucket: getBucket(), Key: r2Key }),
    { expiresIn: 3600 }
  );
}
