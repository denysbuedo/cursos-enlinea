import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/payments/instructions
// Query params: ?courseSlug=xxx — devuelve instrucciones filtradas
//   por país del usuario (detectado por IP o header)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const courseSlug = searchParams.get("courseSlug");
  const country = searchParams.get("country") || undefined;

  // Si se especifica curso, obtener su moneda y precio
  let courseCurrency: string | undefined;
  let coursePrice: number | undefined;

  if (courseSlug) {
    const course = await prisma.course.findUnique({
      where: { slug: courseSlug },
      select: { currency: true, price: true, pricingModel: true, id: true },
    });

    if (!course) {
      return NextResponse.json(
        { error: "Curso no encontrado" },
        { status: 404 }
      );
    }

    if (course.pricingModel === "FREE") {
      return NextResponse.json({
        data: [],
        message: "Este curso es gratuito, no requiere pago",
        courseId: course.id,
      });
    }

    courseCurrency = course.currency;
    coursePrice = course.price ? Number(course.price) : undefined;
  }

  // Obtener instrucciones activas, filtradas por georestriction si hay país
  const instructions = await prisma.paymentInstruction.findMany({
    where: {
      isActive: true,
      ...(courseCurrency ? { currency: courseCurrency as "CUP" | "USD" | "EUR" } : {}),
      ...(country
        ? {
            OR: [
              { geoRestriction: null },
              { geoRestriction: country },
              { geoRestriction: "INTL" },
            ],
          }
        : {}),
    },
    orderBy: { method: "asc" },
  });

  // Si no hay restricción de país, devolver todas las activas
  const filtered = country
    ? instructions.filter(
        (i) =>
          !i.geoRestriction ||
          i.geoRestriction === country ||
          i.geoRestriction === "INTL"
      )
    : instructions;

  return NextResponse.json({
    data: filtered,
    courseCurrency,
    coursePrice,
  });
}
