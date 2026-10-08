import JSZip from "jszip";
import { NextResponse } from "next/server";
import { existsSync } from "fs";
import { readFile } from "fs/promises";
import path from "path";
import { GET as exportCourse } from "../export/route";
import { renderTeacherCourseTemplate } from "@/lib/teacher-course-template";

const MAX_ASSET_BYTES = 50 * 1024 * 1024;
const MAX_PACKAGE_BYTES = 100 * 1024 * 1024;

function safeFilename(value: string, fallback: string) {
  const normalized = value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-|-$/g, "");
  return normalized || fallback;
}

function localAssetPath(url: string) {
  if (!url.startsWith("/api/uploads/")) return null;
  const relative = decodeURIComponent(url.slice("/api/uploads/".length)).replace(/\\/g, "/");
  const root = path.resolve(process.env.UPLOADS_DIR || path.join(process.cwd(), "uploads"));
  const fullPath = path.resolve(root, relative);
  if (fullPath === root || !fullPath.startsWith(`${root}${path.sep}`)) return null;
  return fullPath;
}

function rewriteCourseAssets(course: Record<string, unknown>, zip: JSZip) {
  const rewritten = JSON.parse(JSON.stringify(course)) as Record<string, unknown>;
  const assetPaths = new Map<string, string>();
  let assetIndex = 1;
  let totalBytes = 0;

  const addAsset = async (url: string, title: string) => {
    const existing = assetPaths.get(url);
    if (existing) return existing;
    const fullPath = localAssetPath(url);
    if (!fullPath || !existsSync(fullPath)) return url;
    const buffer = await readFile(fullPath);
    if (buffer.length > MAX_ASSET_BYTES || totalBytes + buffer.length > MAX_PACKAGE_BYTES) return url;
    const filename = safeFilename(title || path.basename(fullPath), `material-${assetIndex}`);
    const target = `materiales/${assetIndex++}-${filename}`;
    zip.file(target, buffer);
    totalBytes += buffer.length;
    assetPaths.set(url, target);
    return target;
  };

  const sessionResources = async (session: Record<string, unknown>) => {
    if (!Array.isArray(session.resources)) return;
    for (const resource of session.resources) {
      if (!resource || typeof resource !== "object") continue;
      const item = resource as Record<string, unknown>;
      if (typeof item.url === "string") item.url = await addAsset(item.url, typeof item.title === "string" ? item.title : "material");
    }
  };

  return (async () => {
    const modules = Array.isArray(rewritten.modules) ? rewritten.modules as unknown[] : [];
    for (const moduleData of modules) {
      if (!moduleData || typeof moduleData !== "object") continue;
      const moduleRecord = moduleData as Record<string, unknown>;
      const sessions = Array.isArray(moduleRecord.sessions) ? moduleRecord.sessions as unknown[] : [];
      for (const session of sessions) if (session && typeof session === "object") await sessionResources(session as Record<string, unknown>);
    }
    const sessions = Array.isArray(rewritten.sessions) ? rewritten.sessions as unknown[] : [];
    for (const session of sessions) if (session && typeof session === "object") await sessionResources(session as Record<string, unknown>);
    if (typeof rewritten.coverImageUrl === "string") rewritten.coverImageUrl = await addAsset(rewritten.coverImageUrl, "portada");
    return rewritten;
  })();
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const exportedResponse = await exportCourse(request, { params });
    if (!exportedResponse.ok) return exportedResponse;

    const payload = await exportedResponse.json();
    const course = payload.course as Record<string, unknown> | undefined;
    if (!course) return NextResponse.json({ error: "El curso no contiene datos exportables" }, { status: 400 });

    const zip = new JSZip();
    const packageCourse = await rewriteCourseAssets(course, zip);
    const packagePayload = { ...payload, course: packageCourse };
    const html = renderTeacherCourseTemplate(packagePayload);
    const slug = typeof packageCourse.slug === "string" && packageCourse.slug ? packageCourse.slug : "curso";
    zip.file("curso.html", html);
    zip.file("datos-internos/curso.json", JSON.stringify(packagePayload, null, 2));
    zip.file("manifest.json", JSON.stringify({ format: "cursos-enlinea-mooc-template", formatVersion: 1, includes: ["curso.html", "datos-internos/curso.json", "materiales/"] }, null, 2));
    zip.file("LEEME.txt", [
      "Plantilla de curso para la plataforma",
      "",
      "1. Abra curso.html en un navegador.",
      "2. Complete o revise la ficha, las ediciones, los módulos y las sesiones.",
      "3. Use el botón Descargar plantilla actualizada.",
      "4. Cargue el archivo HTML descargado en el CMS.",
      "",
      "Los videos externos se conservan como enlaces. Los materiales locales incluidos en el paquete se conservarán al cargar el ZIP en el CMS.",
    ].join("\n"));
    const output = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE", compressionOptions: { level: 6 } });

    return new NextResponse(new Uint8Array(output), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${slug}-plantilla-curso.zip"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    return NextResponse.json({ error: "No se pudo preparar la plantilla del curso" }, { status: 500 });
  }
}
