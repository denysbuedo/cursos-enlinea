// Storage client con fallback para Cuba (Supabase → Cloudflare R2 → Local)
// Configurable vía variable STORAGE_FALLBACK

import { writeFile, mkdir } from "fs/promises";
import path from "path";

type StorageProvider = "supabase" | "r2" | "local";

function getStorageProvider(): StorageProvider {
  const configured = process.env.STORAGE_FALLBACK as StorageProvider;
  if (configured && ["supabase", "r2", "local"].includes(configured)) {
    return configured;
  }
  // Si no hay Supabase ni R2 configurados, usar local
  if (!process.env.SUPABASE_URL && !process.env.R2_ACCOUNT_ID) {
    return "local";
  }
  return process.env.SUPABASE_URL ? "supabase" : "r2";
}

async function uploadToLocal(
  bucket: string,
  filePath: string,
  file: Buffer
): Promise<string> {
  const dir = path.join(process.cwd(), "uploads", bucket);
  await mkdir(dir, { recursive: true });
  const fullPath = path.join(dir, filePath);
  await writeFile(fullPath, file);
  return `/api/uploads/${bucket}/${filePath}`;
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
      const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");
      const client = new S3Client({
        region: "auto",
        endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
          secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
        },
      });
      await client.send(
        new PutObjectCommand({
          Bucket: process.env.R2_BUCKET_NAME || bucket,
          Key: filePath,
          Body: file,
          ContentType: contentType,
        })
      );
      return `${process.env.NEXT_PUBLIC_APP_URL}/storage/${filePath}`;
    } catch {
      // Fallback a local si R2 falla
      return uploadToLocal(bucket, filePath, file);
    }
  }

  // Supabase
  try {
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(
      process.env.SUPABASE_URL || "",
      process.env.SUPABASE_SERVICE_KEY || ""
    );
    const { error } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        contentType,
        upsert: false,
      });
    if (error) throw error;

    const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
    return data.publicUrl;
  } catch {
    // Fallback a local si Supabase falla
    return uploadToLocal(bucket, filePath, file);
  }
}

export async function getFileUrl(
  bucket: string,
  filePath: string
): Promise<string> {
  const provider = getStorageProvider();
  if (provider === "local") {
    return `/uploads/${bucket}/${filePath}`;
  }
  if (provider === "r2") {
    return `${process.env.NEXT_PUBLIC_APP_URL}/storage/${filePath}`;
  }
  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(
    process.env.SUPABASE_URL || "",
    process.env.SUPABASE_ANON_KEY || ""
  );
  const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
  return data.publicUrl;
}
