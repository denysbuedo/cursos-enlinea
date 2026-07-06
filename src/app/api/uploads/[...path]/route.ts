import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

// GET /api/uploads/[...path]
// Sirve archivos subidos (comprobantes de pago, etc.)
const MIME_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".pdf": "application/pdf",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
  ".m4v": "video/mp4",
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: pathParts } = await params;
  const filePath = pathParts.join("/");
  const uploadsRoot = path.resolve(process.cwd(), "uploads");
  const fullPath = path.resolve(uploadsRoot, filePath);

  if (fullPath !== uploadsRoot && !fullPath.startsWith(`${uploadsRoot}${path.sep}`)) {
    return NextResponse.json({ error: "Ruta inválida" }, { status: 400 });
  }

  if (!existsSync(fullPath)) {
    return NextResponse.json({ error: "Archivo no encontrado" }, { status: 404 });
  }

  const ext = path.extname(fullPath).toLowerCase();
  const contentType = MIME_TYPES[ext] || "application/octet-stream";

  const buffer = await readFile(fullPath);

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": contentType,
      "Accept-Ranges": "bytes",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
