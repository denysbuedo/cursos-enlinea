import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();
const slug = "como-montar-un-mooc-en-aprendizaje-digital";
const videoUrl = "https://www.youtube.com/watch?v=aqz-KE-bpKQ";

const json = (value: unknown) => value as Prisma.InputJsonValue;

async function main() {
  const admin = await prisma.user.findFirst({ where: { role: "ADMIN" }, select: { id: true } });
  if (!admin) throw new Error("No existe un usuario administrador");

  const existing = await prisma.course.findUnique({ where: { slug }, select: { id: true } });
  if (existing) await prisma.course.delete({ where: { id: existing.id } });

  const course = await prisma.course.create({
    data: {
      slug,
      title: json({ es: "Cómo montar un MOOC en Aprendizaje Digital", en: "How to Build a MOOC in Aprendizaje Digital" }),
      description: json({
        es: "Curso práctico para diseñar, cargar, publicar y revisar un MOOC dentro de la plataforma Aprendizaje Digital.",
        en: "A practical course to design, author, publish, and review a MOOC inside Aprendizaje Digital.",
      }),
      learningObjectives: json({ es: ["Planificar la ficha académica de un MOOC", "Organizar módulos, sesiones y materiales", "Configurar evaluaciones automáticas", "Publicar y revisar el curso"], en: ["Plan a MOOC academic profile", "Organize modules, sessions, and resources", "Configure automatic assessments", "Publish and review the course"] }),
      targetAudience: json({ es: ["Profesores e instructores de educación superior", "Diseñadores instruccionales"], en: ["Higher-education teachers and instructors", "Instructional designers"] }),
      requirements: json({ es: ["Tener definido el tema del curso", "Contar con videos o enlaces de video", "Disponer de materiales complementarios"], en: ["Have the course topic defined", "Have videos or video links", "Have complementary materials"] }),
      competencies: json({ es: ["Diseño de experiencias MOOC", "Organización de contenidos digitales", "Evaluación automática"], en: ["MOOC experience design", "Digital content organization", "Automatic assessment"] }),
      scienceBranch: "Educación",
      topics: ["MOOC", "Diseño instruccional", "Educación en línea"],
      keywords: ["curso", "profesores", "CMS", "evaluación", "publicación"],
      estimatedHours: 6,
      weeklyHours: 2,
      level: "BEGINNER",
      language: "es",
      certificateAvailable: true,
      selfPaced: true,
      pricingModel: "FREE",
      currency: "USD",
      visibility: "PUBLIC",
      status: "PUBLISHED",
      instructorId: admin.id,
    },
  });

  await prisma.courseEdition.create({
    data: { courseId: course.id, name: json({ es: "Edición demostración", en: "Demonstration edition" }), status: "PUBLISHED", isDefault: true },
  });

  const modules = [
    {
      title: { es: "1. Planificar el MOOC", en: "1. Plan the MOOC" },
      description: { es: "Define el propósito, el público y la estructura académica antes de cargar contenidos.", en: "Define the purpose, audience, and academic structure before authoring content." },
      sessions: [
        ["Definir el propósito y el público", "Identifica qué problema formativo resolverá el curso y a quién va dirigido.", "Escribe una frase que explique qué podrá hacer el estudiante al finalizar."],
        ["Completar la ficha académica", "Registra objetivos, requisitos, competencias, duración, rama de las ciencias y palabras clave.", "Revisa que los objetivos puedan observarse y evaluarse."],
      ],
    },
    {
      title: { es: "2. Construir contenidos y evaluación", en: "2. Build content and assessment" },
      description: { es: "Convierte la planificación en módulos, sesiones breves, recursos y actividades autocorregibles.", en: "Turn the plan into modules, short sessions, resources, and auto-graded activities." },
      sessions: [
        ["Organizar módulos y sesiones", "Divide el curso en unidades progresivas y lecciones de cinco a quince minutos.", "Comprueba que cada sesión contribuya a un objetivo concreto."],
        ["Añadir videos y materiales", "Usa enlaces de video o sube archivos como PDF y presentaciones desde el CMS.", "Verifica cada enlace y explica al estudiante cómo utilizar el material."],
      ],
    },
    {
      title: { es: "3. Publicar y acompañar", en: "3. Publish and support" },
      description: { es: "Revisa el curso completo, publícalo y utiliza los datos para mejorarlo.", en: "Review the complete course, publish it, and use data to improve it." },
      sessions: [
        ["Configurar la evaluación final", "Crea preguntas de opción múltiple o verdadero y falso, retroalimentación y criterio de aprobación.", "Intenta resolver la evaluación como estudiante y revisa la retroalimentación."],
        ["Revisar y publicar el curso", "Comprueba la ficha, edición, módulos, sesiones, materiales, evaluación y certificado antes de publicar.", "Usa la vista pública y el flujo de matrícula para validar la experiencia completa."],
      ],
    },
  ];

  for (const [moduleIndex, moduleData] of modules.entries()) {
    const courseModule = await prisma.courseModule.create({
      data: {
        courseId: course.id,
        title: json(moduleData.title),
        description: json(moduleData.description),
        order: moduleIndex + 1,
        status: "PUBLISHED",
      },
    });
    for (const [sessionIndex, sessionData] of moduleData.sessions.entries()) {
      await prisma.session.create({
        data: {
          courseId: course.id,
          moduleId: courseModule.id,
          title: json({ es: sessionData[0], en: sessionData[0] }),
          description: json({ es: sessionData[1], en: sessionData[1] }),
          sessionType: "RECORDED",
          videoUrl,
          videoPlatform: "YOUTUBE",
          durationMinutes: 8 + sessionIndex,
          order: sessionIndex + 1,
          status: "PUBLISHED",
          preview: moduleIndex === 0 && sessionIndex === 0,
          resources: json([{ id: `resource-${moduleIndex + 1}-${sessionIndex + 1}`, title: "Biblioteca de recursos de eXeLearning", url: "https://exelearning.net/", type: "LINK", source: "REPOSITORY" }]),
          practicePrompt: json({ es: sessionData[2], en: sessionData[2] }),
        },
      });
    }
  }

  await prisma.evaluation.create({
    data: {
      courseId: course.id,
      title: json({ es: "Evaluación final: montar un MOOC", en: "Final assessment: build a MOOC" }),
      description: json({ es: "Comprueba que puedes organizar y publicar un curso completo.", en: "Check that you can organize and publish a complete course." }),
      passingScore: 70,
      maxAttempts: 3,
      showFeedback: true,
      questions: json([
        { id: "q1", type: "MCQ", question: { es: "¿Qué debe definir primero un curso?", en: "What should a course define first?" }, options: [{ es: "Su propósito y público", en: "Its purpose and audience" }, { es: "El color de los botones", en: "The button color" }, { es: "La fecha del certificado", en: "The certificate date" }], correctAnswer: "Su propósito y público", feedback: { es: "La planificación comienza con el propósito y el público.", en: "Planning starts with purpose and audience." }, points: 1 },
        { id: "q2", type: "MCQ", question: { es: "¿Cómo se recomienda organizar el contenido?", en: "How should content be organized?" }, options: [{ es: "En módulos y sesiones breves", en: "In modules and short sessions" }, { es: "En una única conferencia", en: "In one long lecture" }, { es: "Sin objetivos", en: "Without objectives" }], correctAnswer: "En módulos y sesiones breves", feedback: { es: "La fragmentación favorece el aprendizaje autónomo.", en: "Short segments support self-paced learning." }, points: 1 },
        { id: "q3", type: "MCQ", question: { es: "¿Qué elemento permite reducir la corrección manual?", en: "What reduces manual grading?" }, options: [{ es: "La evaluación automática", en: "Automatic assessment" }, { es: "Un foro obligatorio", en: "A mandatory forum" }, { es: "Una videoconferencia", en: "A video conference" }], correctAnswer: "La evaluación automática", feedback: { es: "Los cuestionarios autocorregibles escalan mejor.", en: "Auto-graded quizzes scale better." }, points: 1 },
        { id: "q4", type: "MCQ", question: { es: "¿Qué se debe comprobar antes de publicar?", en: "What should be checked before publishing?" }, options: [{ es: "La experiencia completa como estudiante", en: "The complete student experience" }, { es: "Solo el título", en: "Only the title" }, { es: "Solo la portada", en: "Only the cover" }], correctAnswer: "La experiencia completa como estudiante", feedback: { es: "La revisión debe incluir matrícula, contenidos y evaluación.", en: "Review enrollment, content, and assessment." }, points: 1 },
      ]),
    },
  });

  console.log(JSON.stringify({ id: course.id, slug: course.slug }));
}

main().finally(() => prisma.$disconnect());
