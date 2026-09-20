import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { uploadFile } from "@/lib/storage";
import { canManageCourse } from "@/lib/course-access";

const MAX_COVER_SIZE_MB = 8;
const ALLOWED_COVER_TYPES = ["image/png", "image/jpeg", "image/webp"];

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
    if (!(await canManageCourse(course.id, session.userId, session.role))) {
      return NextResponse.json({ error: "No eres el instructor de este curso" }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "Falta imagen" }, { status: 400 });

    if (!ALLOWED_COVER_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "Formato no permitido. Usa PNG, JPG o WEBP." }, { status: 400 });
    }
    if (file.size > MAX_COVER_SIZE_MB * 1024 * 1024) {
      return NextResponse.json({ error: `La imagen excede ${MAX_COVER_SIZE_MB}MB` }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const filePath = `${course.id}/${Date.now()}-${safeFileName(file.name)}`;
    const url = await uploadFile("covers", filePath, buffer, file.type);

    const updated = await prisma.course.update({
      where: { id: course.id },
      data: { coverImageUrl: url },
      select: { id: true, coverImageUrl: true },
    });

    return NextResponse.json({ data: updated }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    return NextResponse.json({ error: "Error al subir portada" }, { status: 500 });
  }
}
