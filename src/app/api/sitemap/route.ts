import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export async function GET() {
  const courses = await prisma.course.findMany({
    where: { status: "PUBLISHED", visibility: "PUBLIC" },
    select: { slug: true, updatedAt: true },
  }).catch(() => []);

  const staticRoutes = ["", "/courses", "/verify"].flatMap((route) =>
    ["es", "en"].map((lang) => ({
      url: `${BASE_URL}/${lang}${route}`,
      lastModified: new Date().toISOString(),
      changeFrequency: route === "" ? "daily" : "weekly",
      priority: route === "" ? 1.0 : 0.8,
    }))
  );

  const courseRoutes = courses.flatMap((c) =>
    ["es", "en"].map((lang) => ({
      url: `${BASE_URL}/${lang}/courses/${c.slug}`,
      lastModified: c.updatedAt.toISOString(),
      changeFrequency: "weekly",
      priority: 0.7,
    }))
  );

  const allRoutes = [...staticRoutes, ...courseRoutes];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allRoutes
  .map(
    (r) => `  <url>
    <loc>${r.url}</loc>
    <lastmod>${r.lastModified}</lastmod>
    <changefreq>${r.changeFrequency}</changefreq>
    <priority>${r.priority}</priority>
  </url>`
  )
  .join("\n")}
</urlset>`;

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
