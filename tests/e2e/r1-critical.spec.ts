import { expect, test, type Page } from "@playwright/test";

const admin = { email: "admin@edplatform.com", password: "password123" };
const student = { email: "alumno@edplatform.com", password: "password123" };

async function login(page: Page, email: string, password: string) {
  await page.goto("/es/login");
  await page.getByLabel("Correo electrónico").fill(email);
  await page.getByLabel("Contraseña").fill(password);
  await page.getByRole("button", { name: /entrar/i }).click();
  await expect(page).toHaveURL(/\/es\/dashboard/);
}

async function loginByApi(page: Page, email: string, password: string) {
  const response = await page.request.post("/api/auth/login", {
    data: { email, password },
  });
  expect(response.ok(), `HTTP ${response.status()} ${await response.text()}`).toBeTruthy();
  await page.goto("/es/dashboard");
  await expect(page).toHaveURL(/\/es\/dashboard/);
}

async function postFromPage(page: Page, url: string, data: unknown) {
  return page.evaluate(
    async ({ requestUrl, body }) => {
      const response = await fetch(requestUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const text = await response.text();
      return {
        ok: response.ok,
        status: response.status,
        text,
        json: text ? JSON.parse(text) : null,
      };
    },
    { requestUrl: url, body: data }
  );
}

function expectOk(response: { ok: boolean; status: number; text: string }) {
  expect(response.ok, `HTTP ${response.status} ${response.text}`).toBeTruthy();
}

test.describe("R1 critical flows", () => {
  test("auth refresh rotates session and logout revokes it", async ({ page }) => {
    await login(page, admin.email, admin.password);

    const refreshOk = await page.evaluate(async () => {
      const response = await fetch("/api/auth/refresh", { method: "POST" });
      return response.ok;
    });
    expect(refreshOk).toBeTruthy();

    const logoutOk = await page.evaluate(async () => {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      return response.ok;
    });
    expect(logoutOk).toBeTruthy();

    const refreshAfterLogout = await page.evaluate(async () => {
      const response = await fetch("/api/auth/refresh", { method: "POST" });
      return response.status;
    });
    expect(refreshAfterLogout).toBe(401);
  });

  test("admin can create course structure through CMS APIs and see CMS", async ({ page, request }) => {
    await loginByApi(page, admin.email, admin.password);

    await page.goto("/es/dashboard/cms");
    await expect(page.getByRole("heading", { name: "CMS Académico" })).toBeVisible();

    const suffix = Date.now();
    const courseTitle = `Curso E2E ${suffix}`;
    const slug = `curso-e2e-${suffix}`;

    const courseResponse = await postFromPage(page, "/api/courses", {
        slug,
        title: { es: courseTitle, en: `E2E Course ${suffix}` },
        description: {
          es: "Curso creado por prueba E2E.",
          en: "Course created by E2E test.",
        },
        learningObjectives: {
          es: ["Diseñar una experiencia MOOC básica", "Publicar lecciones con video"],
          en: ["Design a basic MOOC experience", "Publish video lessons"],
        },
        targetAudience: {
          es: ["Personas que aprenden de forma autónoma"],
          en: ["Self-directed learners"],
        },
        requirements: {
          es: ["Conexión a internet"],
          en: ["Internet connection"],
        },
        competencies: {
          es: ["Aprendizaje autónomo", "Gestión de progreso"],
          en: ["Self-paced learning", "Progress tracking"],
        },
        estimatedHours: 8,
        weeklyHours: 2,
        level: "BEGINNER",
        language: "es",
        certificateAvailable: true,
        selfPaced: true,
        pricingModel: "FREE",
        currency: "USD",
        visibility: "PUBLIC",
        status: "DRAFT",
    });
    expectOk(courseResponse);
    const course = courseResponse.json.data;

    const anonymousDraftDetail = await request.get(`/api/courses/${slug}`);
    expect(anonymousDraftDetail.status()).toBe(404);

    const prematurePublishResponse = await postFromPage(page, "/api/courses", {
      id: course.id,
      slug,
      title: { es: courseTitle, en: `E2E Course ${suffix}` },
      description: {
        es: "Curso creado por prueba E2E.",
        en: "Course created by E2E test.",
      },
      learningObjectives: {
        es: ["Diseñar una experiencia MOOC básica", "Publicar lecciones con video"],
        en: ["Design a basic MOOC experience", "Publish video lessons"],
      },
      targetAudience: {
        es: ["Personas que aprenden de forma autónoma"],
        en: ["Self-directed learners"],
      },
      requirements: {
        es: ["Conexión a internet"],
        en: ["Internet connection"],
      },
      competencies: {
        es: ["Aprendizaje autónomo", "Gestión de progreso"],
        en: ["Self-paced learning", "Progress tracking"],
      },
      estimatedHours: 8,
      weeklyHours: 2,
      level: "BEGINNER",
      language: "es",
      certificateAvailable: true,
      selfPaced: true,
      pricingModel: "FREE",
      currency: "USD",
      visibility: "PUBLIC",
      status: "PUBLISHED",
    });
    expect(prematurePublishResponse.status).toBe(400);
    expect(prematurePublishResponse.json.missing).toContain("Al menos una sesión publicada con video");

    const moduleResponse = await postFromPage(page, `/api/courses/${course.id}/modules`, {
        title: { es: "Módulo E2E", en: "E2E Module" },
        description: { es: "Bloque de prueba.", en: "Test block." },
        status: "PUBLISHED",
    });
    expectOk(moduleResponse);
    const courseModule = moduleResponse.json.data;

    const sessionResponse = await postFromPage(page, `/api/courses/${course.id}/sessions`, {
        moduleId: courseModule.id,
        title: { es: "Sesión E2E", en: "E2E Session" },
        description: { es: "Video por URL.", en: "Video by URL." },
        sessionType: "RECORDED",
        preview: true,
        videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        videoPlatform: "YOUTUBE",
        durationMinutes: 8,
        resources: [
          {
            id: "res-e2e-mooc",
            title: "Lectura MOOC",
            url: "https://example.com/recurso-mooc.pdf",
            type: "PDF",
            source: "REPOSITORY",
          },
        ],
        practicePrompt: {
          es: "Resume la idea principal del material complementario.",
          en: "Summarize the main idea from the complementary resource.",
        },
    });
    expectOk(sessionResponse);
    const courseSession = sessionResponse.json.data;

    const evaluationResponse = await postFromPage(page, `/api/courses/${course.id}/evaluation`, {
        title: { es: "Evaluación E2E", en: "E2E Evaluation" },
        description: { es: "Evaluación básica.", en: "Basic evaluation." },
        passingScore: 80,
        maxAttempts: 3,
        showFeedback: true,
        questions: [
          {
            type: "TRUEFALSE",
            question: { es: "Esta es una evaluación de prueba.", en: "This is a test evaluation." },
            correctAnswer: "true",
            feedback: { es: "Correcto: la evaluación se corrige automáticamente.", en: "Correct: the evaluation is automatically graded." },
            points: 1,
          },
        ],
    });
    expectOk(evaluationResponse);

    const questionBankResponse = await postFromPage(page, `/api/courses/${course.id}/question-bank`, {
      questions: [
        {
          type: "TRUEFALSE",
          question: { es: "Un MOOC debe poder evaluarse automáticamente.", en: "A MOOC should support automatic grading." },
          correctAnswer: "true",
          feedback: { es: "Correcto: la automatización permite escalar.", en: "Correct: automation enables scale." },
          points: 1,
          tags: ["mooc", "evaluacion"],
        },
      ],
    });
    expectOk(questionBankResponse);
    expect(questionBankResponse.json.data).toHaveLength(1);

    const analyticsResponse = await page.evaluate(async (courseId) => {
      const response = await fetch(`/api/courses/${courseId}/analytics`);
      const text = await response.text();
      return { ok: response.ok, status: response.status, json: text ? JSON.parse(text) : null };
    }, course.id);
    expect(analyticsResponse.ok, `HTTP ${analyticsResponse.status} ${JSON.stringify(analyticsResponse.json)}`).toBeTruthy();
    expect(analyticsResponse.json.data.overall.totalEnrollments).toBe(0);

    await page.reload();
    await expect(page.getByText(courseTitle)).toBeVisible();

    await page.goto(`/es/courses/${slug}`);
    await expect(page.getByRole("heading", { name: courseTitle })).toBeVisible();
    await expect(page.getByText("Ficha del curso")).toBeVisible();
    await expect(page.getByText("Diseñar una experiencia MOOC básica")).toBeVisible();
    await expect(page.getByText("8 horas")).toBeVisible();
    await expect(page.getByText("8 min")).toBeVisible();
    await expect(page.getByText("Lectura MOOC")).toBeVisible();
    await expect(page.getByText("Resume la idea principal del material complementario.")).toBeVisible();
    await expect(page.locator('iframe[src*="youtube.com/embed/dQw4w9WgXcQ"]')).toBeVisible();

    await page.goto("/es/courses");
    await page.getByPlaceholder("Buscar cursos...").fill(courseTitle);
    await expect(page.getByText(courseTitle)).toHaveCount(0);

    await page.goto("/es/dashboard/cms");
    await page.getByRole("button", { name: new RegExp(courseTitle) }).click();
    await page.getByRole("button", { name: "Publicar curso" }).click();

    await expect
      .poll(async () => {
        const response = await request.get(`/api/courses?search=${encodeURIComponent(courseTitle)}`);
        if (!response.ok()) return false;
        const json = await response.json();
        return json.data.some((courseItem: { slug: string }) => courseItem.slug === slug);
      })
      .toBeTruthy();

    await page.goto("/es/courses");
    await page.getByPlaceholder("Buscar cursos...").fill(courseTitle);
    await expect(page.getByText(courseTitle)).toBeVisible();

    await page.goto("/es/dashboard/cms");
    await page.getByRole("button", { name: new RegExp(courseTitle) }).click();
    await page.getByRole("button", { name: "Sesiones" }).click();
    page.once("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "Archivar", exact: true }).click();
    await expect(page.getByText("Sesión E2E")).not.toBeVisible();

    const archivedCompleteStatus = await page.evaluate(async (sessionId) => {
      const response = await fetch(`/api/sessions/${sessionId}/mark-complete`, { method: "POST" });
      return response.status;
    }, courseSession.id);
    expect(archivedCompleteStatus).toBe(403);

    await page.goto(`/es/courses/${slug}`);
    await expect(page.locator('iframe[src*="youtube.com/embed/dQw4w9WgXcQ"]')).toHaveCount(0);
  });

  test("admin can create a user from the admin panel", async ({ page }) => {
    await loginByApi(page, admin.email, admin.password);

    await page.goto("/es/dashboard/admin");
    await page.getByRole("button", { name: "Usuarios" }).click();

    const suffix = Date.now();
    const email = `usuario-e2e-${suffix}@example.com`;

    await page.getByPlaceholder("Nombre").fill(`Usuario E2E ${suffix}`);
    await page.getByPlaceholder("email@dominio.com").fill(email);
    await page.getByPlaceholder("Pais").fill("CU");
    await page.getByRole("button", { name: "Crear usuario" }).click();

    await expect(page.getByText(email)).toBeVisible();
  });

  test("admin can manually enroll an existing user in a course edition", async ({ page }) => {
    await loginByApi(page, admin.email, admin.password);

    const suffix = Date.now();
    const email = `matricula-e2e-${suffix}@example.com`;
    const courseTitle = `Curso Matricula E2E ${suffix}`;
    const slug = `curso-matricula-e2e-${suffix}`;

    const userResponse = await postFromPage(page, "/api/admin/users", {
      name: `Alumno Matricula E2E ${suffix}`,
      email,
      password: "password123",
      role: "STUDENT",
      country: "CU",
      preferredLang: "es",
    });
    expectOk(userResponse);

    const courseResponse = await postFromPage(page, "/api/courses", {
      slug,
      title: { es: courseTitle, en: `Enrollment E2E Course ${suffix}` },
      description: {
        es: "Curso para prueba de matrícula manual.",
        en: "Course for manual enrollment test.",
      },
      pricingModel: "FREE",
      currency: "USD",
      visibility: "PUBLIC",
      status: "DRAFT",
    });
    expectOk(courseResponse);

    await page.goto("/es/dashboard/cms");
    await page.getByRole("button", { name: new RegExp(courseTitle) }).click();
    await page.getByRole("button", { name: "Ediciones" }).click();
    await page.getByRole("button", { name: /Edición inicial/ }).click();

    await page.getByPlaceholder("Buscar alumno por nombre o email").fill(email);
    await page.getByRole("button", { name: "Buscar" }).click();
    await page.getByRole("button", { name: new RegExp(email) }).click();
    await page.getByRole("button", { name: "Matricular" }).click();

    await expect(page.getByText(email)).toBeVisible();
  });

  test("student can complete free seeded course, pass evaluation and verify certificate", async ({ page }) => {
    await loginByApi(page, student.email, student.password);

    await page.goto("/es/courses/introduccion-programacion-web");
    await expect(page.getByRole("heading", { name: /introducción a la programación web/i })).toBeVisible();

    const completeButtons = page.getByRole("button", { name: /completar/i });
    const count = await completeButtons.count();
    for (let i = 0; i < count; i += 1) {
      await completeButtons.first().click();
    }

    await expect(page.getByText(/100%/)).toBeVisible();

    const evaluationResponse = await page.evaluate(async () => {
      const response = await fetch("/api/evaluations?courseSlug=introduccion-programacion-web");
      return { ok: response.ok, status: response.status, json: await response.json() };
    });
    expect(evaluationResponse.ok, `HTTP ${evaluationResponse.status} ${JSON.stringify(evaluationResponse.json)}`).toBeTruthy();

    if (!evaluationResponse.json.alreadyPassed) {
      const submitResponse = await page.evaluate(async (evaluationId) => {
        const response = await fetch(`/api/evaluations/${evaluationId}/submit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            answers: [
              { questionId: "q1", answer: "HyperText Markup Language" },
              { questionId: "q2", answer: "true" },
              { questionId: "q3", answer: "Todas las anteriores" },
              { questionId: "q4", answer: "a" },
            ],
          }),
        });
        return { ok: response.ok, status: response.status, json: await response.json() };
      }, evaluationResponse.json.data.id);
      expect(submitResponse.ok, `HTTP ${submitResponse.status} ${JSON.stringify(submitResponse.json)}`).toBeTruthy();
      expect(submitResponse.json.data.passed).toBeTruthy();
    }

    const enrollmentResponse = await page.evaluate(async () => {
      const response = await fetch("/api/enrollments/me");
      return { ok: response.ok, status: response.status, json: await response.json() };
    });
    expect(enrollmentResponse.ok, `HTTP ${enrollmentResponse.status} ${JSON.stringify(enrollmentResponse.json)}`).toBeTruthy();
    const enrollment = enrollmentResponse.json.data.find(
      (item: { course: { slug: string } }) => item.course.slug === "introduccion-programacion-web"
    );
    expect(enrollment?.id).toBeTruthy();

    const certificateResponse = await page.evaluate(async (enrollmentId) => {
      const response = await fetch(`/api/certificates/${enrollmentId}`, { method: "POST" });
      return { ok: response.ok, status: response.status, json: await response.json() };
    }, enrollment.id);
    expect(
      certificateResponse.ok || certificateResponse.status === 409,
      `HTTP ${certificateResponse.status} ${JSON.stringify(certificateResponse.json)}`
    ).toBeTruthy();
    const certificate = certificateResponse.json.data || certificateResponse.json.certificate;
    expect(certificate.badgeId).toBeTruthy();

    const verifyResponse = await page.request.get(`/api/verify/${certificate.badgeId}`, {
      headers: { accept: "application/ld+json" },
    });
    expect(verifyResponse.ok()).toBeTruthy();
    const verifyJson = await verifyResponse.json();
    expect(verifyJson.valid).toBeTruthy();
    expect(verifyJson.criteria).toContain("puntaje mínimo de 80");
  });
});
