import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { uploadFile } from "@/lib/storage";

const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX_SIZE = 5 * 1024 * 1024;

function safeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "-");
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    if (session.role !== "INSTRUCTOR" && session.role !== "ADMIN") {
      return NextResponse.json({ error: "Solo los instructores pueden subir una foto" }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "Falta la imagen" }, { status: 400 });
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "Formato no permitido. Usa PNG, JPG o WEBP." }, { status: 400 });
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "La imagen no puede superar 5 MB" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const url = await uploadFile("avatars", `${session.userId}/${Date.now()}-${safeFileName(file.name)}`, buffer, file.type);
    const profile = await prisma.user.update({
      where: { id: session.userId },
      data: { avatarUrl: url },
      select: { id: true, avatarUrl: true },
    });
    return NextResponse.json({ data: profile }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    return NextResponse.json({ error: "No se pudo subir la foto" }, { status: 500 });
  }
}
