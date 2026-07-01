import { Metadata } from "next";
import { prisma } from "@/lib/prisma";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export async function generateSitemaps() {
  return [{ id: 0 }];
}

export default async function Sitemap() {
  const courses = await prisma.course.findMany({
    where: { status: "PUBLISHED", visibility: "PUBLIC" },
    select: { slug: true, updatedAt: true },
  });

  const staticRoutes = ["", "/courses", "/dashboard", "/verify"].flatMap(
    (route) =>
      ["es", "en"].map((lang) => ({
        url: `${BASE_URL}/${lang}${route}`,
        lastModified: new Date(),
        changeFrequency: "weekly" as const,
        priority: route === "" ? 1.0 : 0.8,
      }))
  );

  const courseRoutes = courses.flatMap((c) =>
    ["es", "en"].map((lang) => ({
      url: `${BASE_URL}/${lang}/courses/${c.slug}`,
      lastModified: c.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }))
  );

  return [...staticRoutes, ...courseRoutes];
}
