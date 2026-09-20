import { NextRequest, NextResponse } from "next/server";
import JSZip from "jszip";
import { existsSync } from "fs";
import { readFile } from "fs/promises";
import path from "path";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { GET as getOfflineHtml } from "../offline-export/route";

const MAX_RESOURCE_BYTES = 25 * 1024 * 1024;
const MAX_PACKAGE_BYTES = 100 * 1024 * 1024;

function safeFilename(value: string, fallback: string) {
  const normalized = value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-|-$/g, "");
  return normalized || fallback;
}

function extensionFor(contentType: string, url: string, title: string) {
  const known: Record<string, string> = {
    "application/pdf": ".pdf",
    "application/vnd.ms-powerpoint": ".ppt",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": ".pptx",
    "application/msword": ".doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
    "text/plain": ".txt",
  };
  if (known[contentType.split(";")[0].toLowerCase()]) return known[contentType.split(";")[0].toLowerCase()];
  const source = `${title}${url}`.toLowerCase();
  const match = source.match(/\.(pdf|pptx?|docx?|xlsx?|txt)(?:[?#]|$)/);
  return match ? `.${match[1]}` : ".bin";
}

function localContentType(url: string) {
  const extension = path.extname(url).toLowerCase();
  const types: Record<string, string> = {
    ".pdf": "application/pdf",
    ".ppt": "application/vnd.ms-powerpoint",
    ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ".doc": "application/msword",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".xls": "application/vnd.ms-excel",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".txt": "text/plain",
  };
  return types[extension] || "application/octet-stream";
}

function collectResources(course: { modules: Array<{ sessions: Array<{ resources: unknown }> }>; sessions: Array<{ resources: unknown }> }) {
  const resources: Array<{ url: string; title: string }> = [];
  const add = (value: unknown) => {
    if (!Array.isArray(value)) return;
    for (const item of value) {
      if (!item || typeof item !== "object") continue;
      const resource = item as Record<string, unknown>;
      if (typeof resource.url === "string" && resource.url.trim()) resources.push({ url: resource.url, title: typeof resource.title === "string" ? resource.title : "recurso" });
    }
  };
  course.modules.forEach((module) => module.sessions.forEach((session) => add(session.resources)));
  course.sessions.forEach((session) => add(session.resources));
  return resources.filter((resource, index, list) => list.findIndex((item) => item.url === resource.url) === index);
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const course = await prisma.course.findFirst({
      where: { OR: [{ id }, { slug: id }] },
      include: {
        modules: { where: { status: "PUBLISHED" }, include: { sessions: { where: { status: "PUBLISHED" }, select: { resources: true } } } },
        sessions: { where: { status: "PUBLISHED", moduleId: null }, select: { resources: true } },
      },
    });
    if (!course) return NextResponse.json({ error: "Curso no encontrado" }, { status: 404 });

    const enrollment = await prisma.enrollment.findFirst({ where: { userId: session.userId, courseId: course.id, status: "ACTIVE" }, select: { id: true } });
    if (!enrollment && session.role !== "ADMIN" && session.role !== "INSTRUCTOR") return NextResponse.json({ error: "El curso debe estar matriculado para exportarlo" }, { status: 403 });

    const htmlResponse = await getOfflineHtml(request, { params: Promise.resolve({ id }) });
    if (!htmlResponse.ok) return htmlResponse;
    let html = await htmlResponse.text();
    const zip = new JSZip();
    const included: Array<{ originalUrl: string; localPath: string; title: string }> = [];
    const external: Array<{ url: string; title: string; reason: string }> = [];
    let totalBytes = 0;
    const resources = collectResources(course);

    for (let index = 0; index < resources.length; index += 1) {
      const resource = resources[index];
      try {
        let contentType = "";
        let buffer: Buffer;
        if (resource.url.startsWith("/api/uploads/")) {
          const relativePath = decodeURIComponent(resource.url.slice("/api/uploads/".length)).replace(/\\/g, "/");
          const uploadsRoot = path.resolve(process.env.UPLOADS_DIR || path.join(process.cwd(), "uploads"));
          const fullPath = path.resolve(uploadsRoot, relativePath);
          if (fullPath !== uploadsRoot && !fullPath.startsWith(`${uploadsRoot}${path.sep}`)) throw new Error("Ruta de recurso inválida");
          if (!existsSync(fullPath)) throw new Error("Archivo local no encontrado");
          contentType = localContentType(fullPath);
          buffer = await readFile(fullPath);
        } else {
          const resourceUrl = new URL(resource.url, request.url);
          const headers: HeadersInit = {};
          const cookie = request.headers.get("cookie");
          if (cookie) headers.cookie = cookie;
          const response = await fetch(resourceUrl, { headers, redirect: "follow" });
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          contentType = (response.headers.get("content-type") || "").toLowerCase();
          if (contentType.includes("text/html") || contentType.includes("application/xhtml")) throw new Error("Es una página web, no un archivo descargable");
          const contentLength = Number(response.headers.get("content-length") || 0);
          if (contentLength > MAX_RESOURCE_BYTES || totalBytes + contentLength > MAX_PACKAGE_BYTES) throw new Error("Tamaño máximo excedido");
          buffer = Buffer.from(await response.arrayBuffer());
        }
        if (buffer.length > MAX_RESOURCE_BYTES || totalBytes + buffer.length > MAX_PACKAGE_BYTES) throw new Error("Tamaño máximo excedido");
        totalBytes += buffer.length;
        const folder = `resources/resource-${index + 1}`;
        const extension = extensionFor(contentType, resource.url, resource.title);
        const filenameBase = safeFilename(resource.title, `recurso-${index + 1}`);
        const filename = filenameBase.toLowerCase().endsWith(extension) ? filenameBase : `${filenameBase}${extension}`;
        const localPath = `${folder}/${filename}`;
        zip.file(localPath, buffer);
        included.push({ originalUrl: resource.url, localPath, title: resource.title });
        html = html.replaceAll(resource.url.replace(/&/g, "&amp;"), localPath).replaceAll(resource.url, localPath);
      } catch (error) {
        external.push({ url: resource.url, title: resource.title, reason: error instanceof Error ? error.message : "No descargable" });
      }
    }

    zip.file("index.html", html);
    zip.file("manifest.json", JSON.stringify({ format: "cursos-enlinea-mooc-offline", formatVersion: 1, generatedAt: new Date().toISOString(), includedResources: included, externalResources: external, limits: { maxResourceBytes: MAX_RESOURCE_BYTES, maxPackageBytes: MAX_PACKAGE_BYTES } }, null, 2));
    const output = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE", compressionOptions: { level: 6 } });
    return new NextResponse(new Uint8Array(output), { headers: { "Content-Type": "application/zip", "Content-Disposition": `attachment; filename="${course.slug}-offline.zip"`, "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    return NextResponse.json({ error: "No se pudo generar el paquete offline" }, { status: 500 });
  }
}
