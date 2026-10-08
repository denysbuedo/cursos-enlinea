import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import JSZip from "jszip";
import { randomUUID } from "crypto";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { uploadFile } from "@/lib/storage";

type ImportedSession = Record<string, unknown>;
type ImportedModule = { title: unknown; description?: unknown; order?: number; status?: string; sessions?: ImportedSession[] };
type ImportedCourse = Record<string, unknown>;
type ImportedInstructor = { email?: unknown; role?: unknown };

function text(value: unknown, fallback: { es: string; en: string } = { es: "", en: "" }): { es: string; en: string } {
  if (value && typeof value === "object" && "es" in value && "en" in value) {
    return { es: String(value.es), en: String(value.en) };
  }
  return fallback;
}

function jsonValue(value: unknown): Prisma.InputJsonValue | undefined {
  return value === null || value === undefined ? undefined : value as Prisma.InputJsonValue;
}

type ImportAsset = { path: string; data: Uint8Array };
type ParsedImport = { payload: Record<string, unknown>; assets: ImportAsset[] };

function parseTeacherHtml(html: string): Record<string, unknown> {
  const match = html.match(/<script\s+id=["']course-data["'][^>]*>([\s\S]*?)<\/script>/i);
  if (!match) throw new Error("La plantilla HTML no contiene datos de curso");
  const content = match[1].trim().replace(/^window\.__COURSE_PACKAGE__\s*=\s*/, "").replace(/;\s*$/, "");
  return JSON.parse(content) as Record<string, unknown>;
}

async function parseImportFile(file: File): Promise<ParsedImport> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".zip")) {
    const zip = await JSZip.loadAsync(await file.arrayBuffer());
    const assets: ImportAsset[] = [];
    for (const [entryPath, entry] of Object.entries(zip.files)) {
      if (!entry.dir && entryPath.startsWith("materiales/")) assets.push({ path: entryPath, data: await entry.async("uint8array") });
    }
    const htmlEntry = zip.file("curso.html") || zip.file(/(^|\/)curso\.html$/i)[0];
    if (htmlEntry) return { payload: parseTeacherHtml(await htmlEntry.async("text")), assets };
    const jsonEntry = zip.file("datos-internos/curso.json") || zip.file(/(^|\/)curso\.json$/i)[0];
    if (jsonEntry) return { payload: JSON.parse(await jsonEntry.async("text")) as Record<string, unknown>, assets };
    throw new Error("El paquete no contiene una plantilla de curso válida");
  }
  const content = await file.text();
  return {
    payload: name.endsWith(".html") || content.includes('id="course-data"')
      ? parseTeacherHtml(content)
      : JSON.parse(content) as Record<string, unknown>,
    assets: [],
  };
}

function contentTypeForAsset(assetPath: string) {
  const extension = assetPath.toLowerCase().split(".").pop();
  const types: Record<string, string> = {
    pdf: "application/pdf",
    ppt: "application/vnd.ms-powerpoint",
    pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    xls: "application/vnd.ms-excel",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    mp3: "audio/mpeg",
    m4a: "audio/mp4",
    ogg: "audio/ogg",
    wav: "audio/wav",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    webp: "image/webp",
    zip: "application/zip",
  };
  return (extension && types[extension]) || "application/octet-stream";
}

function rewriteAssetUrls(value: unknown, assetUrls: Map<string, string>): unknown {
  if (Array.isArray(value)) return value.map((item) => rewriteAssetUrls(item, assetUrls));
  if (!value || typeof value !== "object") return value;
  const result: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    result[key] = key === "url" && typeof item === "string" && assetUrls.has(item)
      ? assetUrls.get(item)
      : rewriteAssetUrls(item, assetUrls);
  }
  return result;
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    if (session.role !== "ADMIN" && session.role !== "INSTRUCTOR") return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });

    const contentType = request.headers.get("content-type") || "";
    let payload: Record<string, unknown>;
    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file");
      if (!(file instanceof File)) return NextResponse.json({ error: "Falta el archivo de curso" }, { status: 400 });
      const parsed = await parseImportFile(file);
      payload = parsed.payload;
      const importedCourseId = randomUUID();
      const assetUrls = new Map<string, string>();
      for (const asset of parsed.assets) {
        const filename = asset.path.split("/").pop() || "material.bin";
        const url = await uploadFile("resources", `${importedCourseId}/${Date.now()}-${filename}`, Buffer.from(asset.data), contentTypeForAsset(asset.path));
        assetUrls.set(asset.path, url);
      }
      if (assetUrls.size && payload.course && typeof payload.course === "object") {
        payload = { ...payload, course: rewriteAssetUrls(payload.course, assetUrls) };
      }
    } else {
      payload = await request.json();
    }

    if (payload.format !== "cursos-enlinea-mooc" || payload.formatVersion !== 1 || !payload.course || typeof payload.course !== "object") {
      return NextResponse.json({ error: "Archivo de curso no válido o versión no compatible" }, { status: 400 });
    }
    const source = payload.course as ImportedCourse;
    if (!source.slug || !source.title || !source.description) return NextResponse.json({ error: "El archivo no contiene la ficha básica" }, { status: 400 });

    const baseSlug = String(source.slug).toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-|-$/g, "") || "curso-importado";
    let slug = baseSlug;
    let suffix = 1;
    while (await prisma.course.findUnique({ where: { slug }, select: { id: true } })) slug = `${baseSlug}-importado-${suffix++}`;
    const currentUser = await prisma.user.findUnique({ where: { id: session.userId }, select: { email: true } });

    const imported = await prisma.$transaction(async (tx) => {
      const course = await tx.course.create({
        data: {
          slug,
          title: text(source.title),
          description: text(source.description),
          learningObjectives: jsonValue(source.learningObjectives),
          targetAudience: jsonValue(source.targetAudience),
          requirements: jsonValue(source.requirements),
          competencies: jsonValue(source.competencies),
          coverImageUrl: typeof source.coverImageUrl === "string" ? source.coverImageUrl : null,
          scienceBranch: typeof source.scienceBranch === "string" ? source.scienceBranch : null,
          topics: Array.isArray(source.topics) ? source.topics.map(String) : [],
          keywords: Array.isArray(source.keywords) ? source.keywords.map(String) : [],
          questionBank: jsonValue(source.questionBank),
          estimatedHours: source.estimatedHours ? Number(source.estimatedHours) : null,
          weeklyHours: source.weeklyHours ? Number(source.weeklyHours) : null,
          level: typeof source.level === "string" ? source.level : null,
          language: typeof source.language === "string" ? source.language : "es",
          certificateAvailable: source.certificateAvailable !== false,
          selfPaced: source.selfPaced !== false,
          pricingModel: source.pricingModel === "PAID" ? "PAID" : "FREE",
          price: source.pricingModel === "PAID" && source.price ? Number(source.price) : null,
          currency: typeof source.currency === "string" && ["CUP", "USD", "EUR"].includes(source.currency) ? source.currency as "CUP" | "USD" | "EUR" : "USD",
          status: "DRAFT",
          // Imported courses remain private unless the source explicitly opts into a public catalog entry.
          visibility: source.visibility === "PUBLIC"
            ? "PUBLIC"
            : source.visibility === "ENROLLED_ONLY"
              ? "ENROLLED_ONLY"
              : "PRIVATE",
          instructorId: session.userId,
        },
      });

      await tx.courseInstructor.create({ data: { courseId: course.id, userId: session.userId, role: "LEAD" } });

      const importedInstructors = Array.isArray(source.instructors) ? source.instructors as ImportedInstructor[] : [];
      for (const instructor of importedInstructors) {
        if (!instructor || instructor.email === currentUser?.email || !instructor.email) continue;
        const user = await tx.user.findUnique({ where: { email: String(instructor.email).toLowerCase() }, select: { id: true, role: true } });
        if (user?.role === "INSTRUCTOR") {
          await tx.courseInstructor.create({ data: { courseId: course.id, userId: user.id, role: instructor.role === "EDITOR" ? "EDITOR" : "INSTRUCTOR" } });
        }
      }

      const editions = Array.isArray(source.editions) ? source.editions : [];
      if (editions.length === 0) {
        await tx.courseEdition.create({ data: { courseId: course.id, name: { es: "Edición importada", en: "Imported edition" }, status: "DRAFT", isDefault: true } });
      } else {
        for (const edition of editions) {
          await tx.courseEdition.create({ data: { courseId: course.id, name: text(edition.name, { es: "Edición importada", en: "Imported edition" }), startsAt: edition.startsAt ? new Date(edition.startsAt) : null, endsAt: edition.endsAt ? new Date(edition.endsAt) : null, capacity: edition.capacity ? Number(edition.capacity) : null, status: "DRAFT", isDefault: Boolean(edition.isDefault) } });
        }
      }

      const modules = Array.isArray(source.modules) ? source.modules as ImportedModule[] : [];
      for (const courseModule of modules) {
        const createdModule = await tx.courseModule.create({ data: { courseId: course.id, title: text(courseModule.title), description: jsonValue(courseModule.description), order: Number(courseModule.order || 1), status: "DRAFT" } });
        for (const sessionData of courseModule.sessions || []) {
          await tx.session.create({ data: { courseId: course.id, moduleId: createdModule.id, title: text(sessionData.title), description: text(sessionData.description), keywords: Array.isArray(sessionData.keywords) ? sessionData.keywords.map(String) : [], sessionType: "RECORDED", preview: Boolean(sessionData.preview), videoUrl: typeof sessionData.videoUrl === "string" ? sessionData.videoUrl : null, videoPlatform: typeof sessionData.videoPlatform === "string" ? sessionData.videoPlatform : null, audioUrl: typeof sessionData.audioUrl === "string" ? sessionData.audioUrl : null, audioPlatform: typeof sessionData.audioPlatform === "string" ? sessionData.audioPlatform : null, durationMinutes: sessionData.durationMinutes ? Number(sessionData.durationMinutes) : null, resources: jsonValue(sessionData.resources), practicePrompt: jsonValue(sessionData.practicePrompt), scheduledAt: sessionData.scheduledAt ? new Date(String(sessionData.scheduledAt)) : null, order: Number(sessionData.order || 1), status: "DRAFT" } });
        }
      }

      for (const sessionData of (Array.isArray(source.sessions) ? source.sessions : []) as ImportedSession[]) {
        await tx.session.create({ data: { courseId: course.id, title: text(sessionData.title), description: text(sessionData.description), keywords: Array.isArray(sessionData.keywords) ? sessionData.keywords.map(String) : [], sessionType: "RECORDED", preview: Boolean(sessionData.preview), videoUrl: typeof sessionData.videoUrl === "string" ? sessionData.videoUrl : null, videoPlatform: typeof sessionData.videoPlatform === "string" ? sessionData.videoPlatform : null, audioUrl: typeof sessionData.audioUrl === "string" ? sessionData.audioUrl : null, audioPlatform: typeof sessionData.audioPlatform === "string" ? sessionData.audioPlatform : null, durationMinutes: sessionData.durationMinutes ? Number(sessionData.durationMinutes) : null, resources: jsonValue(sessionData.resources), practicePrompt: jsonValue(sessionData.practicePrompt), scheduledAt: sessionData.scheduledAt ? new Date(String(sessionData.scheduledAt)) : null, order: Number(sessionData.order || 1), status: "DRAFT" } });
      }

      if (source.evaluation && typeof source.evaluation === "object") {
        const evaluation = source.evaluation as ImportedCourse;
        await tx.evaluation.create({ data: { courseId: course.id, title: text(evaluation.title, { es: "Evaluación final", en: "Final evaluation" }), description: jsonValue(evaluation.description), passingScore: Number(evaluation.passingScore || 80), maxAttempts: Number(evaluation.maxAttempts || 3), showFeedback: evaluation.showFeedback !== false, shuffleQuestions: evaluation.shuffleQuestions !== false, shuffleOptions: evaluation.shuffleOptions !== false, questions: jsonValue(Array.isArray(evaluation.questions) ? evaluation.questions : []) || [] } });
      }
      return course;
    });

    return NextResponse.json({ data: imported, message: "Curso importado como borrador" }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    return NextResponse.json({ error: "No se pudo importar el curso" }, { status: 500 });
  }
}
