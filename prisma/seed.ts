import { PrismaClient, Role, Currency, PaymentMethod } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Sembrando base de datos...");

  // Limpiar
  await prisma.auditLog.deleteMany();
  await prisma.evaluationAttempt.deleteMany();
  await prisma.evaluation.deleteMany();
  await prisma.sessionCompletion.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.paymentInstruction.deleteMany();
  await prisma.certificate.deleteMany();
  await prisma.enrollment.deleteMany();
  await prisma.session.deleteMany();
  await prisma.course.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();

  // ─── Usuarios ────────────────────────────────
  const passwordHash = await bcrypt.hash("password123", 12);

  const admin = await prisma.user.create({
    data: { email: "admin@edplatform.com", passwordHash, name: "Admin Principal", role: Role.ADMIN, preferredLang: "es" },
  });

  const instructor = await prisma.user.create({
    data: { email: "profesor@edplatform.com", passwordHash, name: "María García", role: Role.INSTRUCTOR, preferredLang: "es" },
  });

  const student = await prisma.user.create({
    data: { email: "alumno@edplatform.com", passwordHash, name: "Carlos Pérez", role: Role.STUDENT, country: "CU", preferredLang: "es" },
  });

  const intlStudent = await prisma.user.create({
    data: { email: "student@edplatform.com", passwordHash, name: "John Smith", role: Role.STUDENT, country: "US", preferredLang: "en" },
  });

  console.log(`  ✅ Usuarios: ${[admin, instructor, student, intlStudent].length}`);

  // ─── Cursos ──────────────────────────────────
  const course1 = await prisma.course.create({
    data: {
      slug: "marketing-digital-avanzado",
      title: { es: "Marketing Digital Avanzado", en: "Advanced Digital Marketing" },
      description: {
        es: "Domina estrategias de marketing digital, SEO, SEM y redes sociales.",
        en: "Master digital marketing strategies, SEO, SEM, and social media.",
      },
      pricingModel: "PAID",
      price: 25.0,
      currency: Currency.USD,
      status: "PUBLISHED",
      visibility: "PUBLIC",
      instructorId: instructor.id,
    },
  });

  const course2 = await prisma.course.create({
    data: {
      slug: "introduccion-programacion-web",
      title: { es: "Introducción a la Programación Web", en: "Introduction to Web Programming" },
      description: {
        es: "Aprende HTML, CSS y JavaScript desde cero con proyectos prácticos.",
        en: "Learn HTML, CSS, and JavaScript from scratch with hands-on projects.",
      },
      pricingModel: "FREE",
      status: "PUBLISHED",
      visibility: "PUBLIC",
      instructorId: instructor.id,
    },
  });

  const course3 = await prisma.course.create({
    data: {
      slug: "emprendimiento-digital-cuba",
      title: { es: "Emprendimiento Digital en Cuba", en: "Digital Entrepreneurship in Cuba" },
      description: {
        es: "Estrategias de negocio digital adaptadas al contexto cubano.",
        en: "Digital business strategies adapted to the Cuban context.",
      },
      pricingModel: "PAID",
      price: 15.0,
      currency: Currency.CUP,
      status: "PUBLISHED",
      visibility: "PUBLIC",
      instructorId: instructor.id,
    },
  });

  console.log(`  ✅ Cursos: 3`);

  // ─── Sesiones ────────────────────────────────
  const sessionsData = [
    { courseId: course1.id, order: 1, preview: true, videoPlatform: "YOUTUBE", sessionType: "RECORDED" as const,
      title: { es: "Fundamentos del Marketing Digital", en: "Digital Marketing Fundamentals" },
      description: { es: "Conceptos clave del marketing digital moderno.", en: "Key concepts of modern digital marketing." },
      keywords: ["marketing", "digital", "fundamentos"] },
    { courseId: course1.id, order: 2, preview: false, videoPlatform: "VIMEO", sessionType: "RECORDED" as const,
      title: { es: "SEO y Posicionamiento Web", en: "SEO and Web Positioning" },
      description: { es: "Técnicas avanzadas de SEO on-page y off-page.", en: "Advanced on-page and off-page SEO techniques." },
      keywords: ["SEO", "posicionamiento", "búsqueda"] },
    { courseId: course2.id, order: 1, preview: true, videoPlatform: "YOUTUBE", sessionType: "RECORDED" as const,
      title: { es: "HTML: Estructura de Páginas Web", en: "HTML: Web Page Structure" },
      description: { es: "Aprende las bases de HTML5.", en: "Learn HTML5 fundamentals." },
      keywords: ["HTML", "web", "estructura"] },
    { courseId: course2.id, order: 2, preview: false, videoPlatform: "YOUTUBE", sessionType: "RECORDED" as const,
      title: { es: "CSS: Estilos y Diseño Responsive", en: "CSS: Styling and Responsive Design" },
      description: { es: "Domina CSS3 y diseño adaptable.", en: "Master CSS3 and responsive design." },
      keywords: ["CSS", "diseño", "responsive"] },
    { courseId: course3.id, order: 1, preview: true, videoPlatform: "YOUTUBE", sessionType: "LIVE" as const,
      title: { es: "El Ecosistema Digital Cubano", en: "The Cuban Digital Ecosystem" },
      description: { es: "Panorama actual del entorno digital en Cuba.", en: "Current overview of the digital environment in Cuba." },
      keywords: ["Cuba", "digital", "ecosistema"] },
  ];

  for (const s of sessionsData) {
    await prisma.session.create({
      data: {
        ...s,
        videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        status: "PUBLISHED",
      },
    });
  }
  console.log(`  ✅ Sesiones: ${sessionsData.length}`);

  // ─── Matrícula ───────────────────────────────
  await prisma.enrollment.create({
    data: {
      userId: student.id,
      courseId: course2.id,
      admissionType: "CALL_SYSTEM",
      progress: 50.0,
    },
  });
  console.log("  ✅ Enrollment: 1 (CALL_SYSTEM)");

  // ─── Instrucciones de Pago ──────────────────
  const instructions = [
    {
      method: PaymentMethod.ENZONA, currency: Currency.CUP,
      label: { es: "Pagar con EnZona", en: "Pay with EnZona" },
      instructions: {
        es: "1. Abre la app EnZona\n2. Transfiere el monto indicado a la cuenta configurada\n3. Toma captura de pantalla del comprobante\n4. Sube la imagen aquí",
        en: "1. Open EnZona app\n2. Transfer the indicated amount to the configured account\n3. Take a screenshot of the receipt\n4. Upload the image here",
      },
      accountInfo: { phoneNumber: "+53 5XXXXXXX", concept: "Pago curso EdPlatform" },
      geoRestriction: "CU",
    },
    {
      method: PaymentMethod.TRANSFERMOVIL, currency: Currency.CUP,
      label: { es: "Transfermóvil", en: "Transfermóvil" },
      instructions: {
        es: "1. Abre la app Transfermóvil\n2. Selecciona 'Transferencia'\n3. Ingresa los datos de la cuenta\n4. Sube el comprobante de la transferencia",
        en: "1. Open Transfermóvil app\n2. Select 'Transfer'\n3. Enter the account details\n4. Upload the transfer receipt",
      },
      accountInfo: { phoneNumber: "+53 5XXXXXXX", cardNumber: "9205XXXXXXXX" },
      geoRestriction: "CU",
    },
    {
      method: PaymentMethod.CRYPTO_USDT, currency: Currency.USD,
      label: { es: "USDT (TRC20)", en: "USDT (TRC20)" },
      instructions: {
        es: "Envía USDT a la dirección TRC20 indicada. La red TRON confirma en 2-5 min. Copia el TX Hash y pégalo al subir el comprobante.",
        en: "Send USDT to the TRC20 address below. TRON network confirms in 2-5 min. Copy the TX Hash when uploading proof.",
      },
      accountInfo: { walletAddress: "TUWALLET_TRC20_AQUI", network: "TRC20" },
      geoRestriction: null,
    },
  ];

  for (const inst of instructions) {
    await prisma.paymentInstruction.create({ data: inst });
  }
  console.log(`  ✅ PaymentInstructions: ${instructions.length}`);

  // ─── Evaluación de prueba ──────────────────────
  await prisma.evaluation.create({
    data: {
      courseId: course2.id, // "Introducción a la Programación Web" (gratuito)
      title: { es: "Evaluación Final", en: "Final Evaluation" },
      description: {
        es: "Demuestra tus conocimientos de HTML, CSS y JavaScript.",
        en: "Demonstrate your knowledge of HTML, CSS, and JavaScript.",
      },
      passingScore: 80.0,
      questions: [
        {
          id: "q1",
          type: "MCQ",
          question: {
            es: "¿Qué significa HTML?",
            en: "What does HTML stand for?",
          },
          options: [
            { es: "HyperText Markup Language", en: "HyperText Markup Language" },
            { es: "High Tech Modern Language", en: "High Tech Modern Language" },
            { es: "HyperTransfer Markup Logic", en: "HyperTransfer Markup Logic" },
          ],
          correctAnswer: "HyperText Markup Language",
          points: 2,
        },
        {
          id: "q2",
          type: "TRUEFALSE",
          question: {
            es: "CSS se usa para dar estilos a páginas web.",
            en: "CSS is used to style web pages.",
          },
          correctAnswer: "true",
          points: 1,
        },
        {
          id: "q3",
          type: "MCQ",
          question: {
            es: "¿Cuál de estos es un selector CSS válido?",
            en: "Which of these is a valid CSS selector?",
          },
          options: [
            { es: ".clase", en: ".class" },
            { es: "#id", en: "#id" },
            { es: "Todas las anteriores", en: "All of the above" },
          ],
          correctAnswer: "Todas las anteriores",
          points: 1,
        },
        {
          id: "q4",
          type: "SHORT",
          question: {
            es: "¿Qué etiqueta HTML se usa para crear un enlace? (escribe solo el nombre de la etiqueta, ej: div)",
            en: "What HTML tag is used to create a link? (write only the tag name, e.g.: div)",
          },
          correctAnswer: "a",
          points: 2,
        },
      ],
    },
  });
  console.log("  ✅ Evaluation: 1 (para curso gratuito)");

  console.log("\n🎉 Seed completado!");
  console.log("   Credenciales de prueba:");
  console.log("   Admin:     admin@edplatform.com / password123");
  console.log("   Instructor: profesor@edplatform.com / password123");
  console.log("   Estudiante: alumno@edplatform.com / password123");
  console.log("   Intl:       student@edplatform.com / password123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
