import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { uploadFile } from "@/lib/storage";

const MAX_VIDEO_SIZE_MB = 500;
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime", "video/x-m4v"];

function safeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "-");
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    if (session.role !== "ADMIN" && session.role !== "INSTRUCTOR") {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }

    const { id } = await params;
    const course = await prisma.course.findFirst({
      where: { OR: [{ id }, { slug: id }] },
      select: { id: true, instructorId: true },
    });

    if (!course) {
      return NextResponse.json({ error: "Curso no encontrado" }, { status: 404 });
    }

    if (session.role !== "ADMIN" && course.instructorId !== session.userId) {
      return NextResponse.json({ error: "No eres el instructor de este curso" }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Falta archivo de video" }, { status: 400 });
    }

    if (!ALLOWED_VIDEO_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "Formato no permitido. Usa MP4, WEBM o MOV." }, { status: 400 });
    }

    if (file.size > MAX_VIDEO_SIZE_MB * 1024 * 1024) {
      return NextResponse.json({ error: `El video excede ${MAX_VIDEO_SIZE_MB}MB` }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const filePath = `${course.id}/${Date.now()}-${safeFileName(file.name)}`;
    const url = await uploadFile("videos", filePath, buffer, file.type);

    return NextResponse.json({
      data: {
        url,
        platform: "LOCAL_UPLOAD",
        fileName: file.name,
        contentType: file.type,
        size: file.size,
      },
    }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }
    return NextResponse.json({ error: "Error al subir video" }, { status: 500 });
  }
}
