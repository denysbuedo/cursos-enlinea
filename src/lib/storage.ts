// Storage client con fallback para Cuba (Supabase -> Cloudflare R2 -> Local)
// Configurable via STORAGE_PROVIDER o STORAGE_FALLBACK.

import { writeFile, mkdir } from "fs/promises";
import path from "path";

type StorageProvider = "supabase" | "r2" | "local";

function getStorageProvider(): StorageProvider {
  const configured = (process.env.STORAGE_PROVIDER || process.env.STORAGE_FALLBACK) as StorageProvider;
  if (configured && ["supabase", "r2", "local"].includes(configured)) {
    return configured;
  }

  if (!process.env.SUPABASE_URL && !process.env.R2_ACCOUNT_ID) {
    return "local";
  }

  return process.env.SUPABASE_URL ? "supabase" : "r2";
}

function allowLocalFallback() {
  return process.env.STORAGE_ALLOW_LOCAL_FALLBACK !== "false";
}

function normalizeObjectPath(filePath: string) {
  const normalized = filePath.replace(/\\/g, "/").replace(/^\/+/, "");
  if (normalized.includes("..")) {
    throw new Error("Invalid storage path");
  }
  return normalized;
}

function getR2ObjectKey(bucket: string, filePath: string) {
  return `${bucket}/${normalizeObjectPath(filePath)}`;
}

function getR2PublicUrl(objectKey: string) {
  const publicBaseUrl = process.env.R2_PUBLIC_URL || process.env.NEXT_PUBLIC_R2_PUBLIC_URL;
  if (publicBaseUrl) {
    return `${publicBaseUrl.replace(/\/$/, "")}/${objectKey}`;
  }

  const accountId = process.env.R2_ACCOUNT_ID;
  const bucketName = process.env.R2_BUCKET_NAME;
  if (accountId && bucketName) {
    return `https://${bucketName}.${accountId}.r2.cloudflarestorage.com/${objectKey}`;
  }

  return "";
}

async function uploadToLocal(
  bucket: string,
  filePath: string,
  file: Buffer
): Promise<string> {
  const safeFilePath = normalizeObjectPath(filePath);
  const root = path.join(process.cwd(), "uploads", bucket);
  const fullPath = path.join(root, safeFilePath);
  const resolvedRoot = path.resolve(root);
  const resolvedFullPath = path.resolve(fullPath);
  if (resolvedFullPath !== resolvedRoot && !resolvedFullPath.startsWith(`${resolvedRoot}${path.sep}`)) {
    throw new Error("Invalid local storage path");
  }

  await mkdir(path.dirname(fullPath), { recursive: true });
  await writeFile(fullPath, file);
  return `/api/uploads/${bucket}/${safeFilePath}`;
}

export async function uploadFile(
  bucket: string,
  filePath: string,
  file: Buffer,
  contentType: string
): Promise<string> {
  const provider = getStorageProvider();

  if (provider === "local") {
    return uploadToLocal(bucket, filePath, file);
  }

  if (provider === "r2") {
    try {
      if (!process.env.R2_ACCOUNT_ID || !process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY || !process.env.R2_BUCKET_NAME) {
        throw new Error("R2 storage is not fully configured");
      }

      const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");
      const objectKey = getR2ObjectKey(bucket, filePath);
      const publicUrl = getR2PublicUrl(objectKey);
      if (!publicUrl) {
        throw new Error("R2 public URL is not configured");
      }

      const client = new S3Client({
        region: "auto",
        endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId: process.env.R2_ACCESS_KEY_ID,
          secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
        },
      });
      await client.send(
        new PutObjectCommand({
          Bucket: process.env.R2_BUCKET_NAME,
          Key: objectKey,
          Body: file,
          ContentType: contentType,
        })
      );
      return publicUrl;
    } catch {
      if (!allowLocalFallback()) throw new Error("R2 upload failed");
      return uploadToLocal(bucket, filePath, file);
    }
  }

  // Supabase
  try {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
      throw new Error("Supabase storage is not fully configured");
    }

    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
    const { error } = await supabase.storage
      .from(bucket)
      .upload(normalizeObjectPath(filePath), file, {
        contentType,
        upsert: false,
      });
    if (error) throw error;

    const { data } = supabase.storage.from(bucket).getPublicUrl(normalizeObjectPath(filePath));
    return data.publicUrl;
  } catch {
    if (!allowLocalFallback()) throw new Error("Supabase upload failed");
    return uploadToLocal(bucket, filePath, file);
  }
}

export async function getFileUrl(
  bucket: string,
  filePath: string
): Promise<string> {
  const provider = getStorageProvider();
  if (provider === "local") {
    return `/api/uploads/${bucket}/${normalizeObjectPath(filePath)}`;
  }
  if (provider === "r2") {
    return getR2PublicUrl(getR2ObjectKey(bucket, filePath));
  }
  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(
    process.env.SUPABASE_URL || "",
    process.env.SUPABASE_ANON_KEY || ""
  );
  const { data } = supabase.storage.from(bucket).getPublicUrl(normalizeObjectPath(filePath));
  return data.publicUrl;
}
