import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { uploadFile } from "@/lib/storage";

const MAX_RESOURCE_SIZE_MB = 50;
const ALLOWED_RESOURCE_TYPES = [
  "application/pdf",
  "application/zip",
  "application/x-zip-compressed",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "text/csv",
  "image/png",
  "image/jpeg",
  "image/webp",
];

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
    if (!course) return NextResponse.json({ error: "Curso no encontrado" }, { status: 404 });
    if (session.role !== "ADMIN" && course.instructorId !== session.userId) {
      return NextResponse.json({ error: "No eres el instructor de este curso" }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "Falta archivo" }, { status: 400 });

    if (!ALLOWED_RESOURCE_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "Formato no permitido para material complementario" }, { status: 400 });
    }
    if (file.size > MAX_RESOURCE_SIZE_MB * 1024 * 1024) {
      return NextResponse.json({ error: `El archivo excede ${MAX_RESOURCE_SIZE_MB}MB` }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const filePath = `${course.id}/${Date.now()}-${safeFileName(file.name)}`;
    const url = await uploadFile("resources", filePath, buffer, file.type);

    return NextResponse.json({
      data: {
        url,
        source: "LOCAL_UPLOAD",
        type: file.type,
        title: file.name,
        size: file.size,
      },
    }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    return NextResponse.json({ error: "Error al subir material" }, { status: 500 });
  }
}
