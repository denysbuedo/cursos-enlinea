import { expect, test, type Page } from "@playwright/test";
import JSZip from "jszip";
import { SignJWT } from "jose";

const admin = { email: "admin@edplatform.com", password: "password123" };
const student = { email: "estudiante_demo@demo.local", password: "password123" };
const demoCourseSlug = "diseno-de-moocs-desde-la-idea-hasta-la-publicacion";
let demoOfflinePackage: Buffer | undefined;

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

async function getBinaryFromPage(page: Page, url: string) {
  return page.evaluate(async (requestUrl) => {
    const response = await fetch(requestUrl);
    const bytes = new Uint8Array(await response.arrayBuffer());
    let binary = "";
    bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
    return { ok: response.ok, status: response.status, text: response.ok ? "" : await response.text(), base64: btoa(binary) };
  }, url);
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

    const uploadedPpt = await page.evaluate(async (courseId) => {
      const formData = new FormData();
      formData.append("file", new File(["E2E PPT placeholder"], "material-e2e.pptx", {
        type: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      }));
      const response = await fetch(`/api/courses/${courseId}/resources/upload`, { method: "POST", body: formData });
      return { status: response.status, body: await response.json() };
    }, course.id);
    expect(uploadedPpt.status, JSON.stringify(uploadedPpt.body)).toBe(201);
    const uploadedPptData = uploadedPpt.body.data;

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
          {
            id: "res-e2e-pptx",
            title: uploadedPptData.title,
            url: uploadedPptData.url,
            type: uploadedPptData.type,
            source: uploadedPptData.source,
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
          difficulty: "BASIC",
          topic: "Escalabilidad",
          moduleId: courseModule.id,
        },
      ],
    });
    expectOk(questionBankResponse);
    expect(questionBankResponse.json.data).toHaveLength(1);
    expect(questionBankResponse.json.data[0].difficulty).toBe("BASIC");
    expect(questionBankResponse.json.data[0].topic).toBe("Escalabilidad");

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
    await expect(page.getByText("Ficha académica")).toBeVisible();
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

    const offlinePackageResponse = await getBinaryFromPage(page, `/api/courses/${course.id}/offline-package`);
    expect(offlinePackageResponse.ok, `${offlinePackageResponse.status} ${offlinePackageResponse.text}`).toBeTruthy();
    const offlineZip = await JSZip.loadAsync(Buffer.from(offlinePackageResponse.base64, "base64"));
    const offlineManifest = JSON.parse(await offlineZip.file("manifest.json")!.async("string")) as { includedResources: Array<{ title: string }> };
    expect(offlineManifest.includedResources.some((resource) => resource.title === "material-e2e.pptx"), JSON.stringify(offlineManifest)).toBeTruthy();

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

  test("student can complete the demo course, pass evaluation and verify certificate", async ({ page }) => {
    await loginByApi(page, student.email, student.password);

    await page.goto(`/es/courses/${demoCourseSlug}`);
    await expect(page.locator("h1").first()).toBeVisible();
    const demoPackageResponse = await getBinaryFromPage(page, `/api/courses/${demoCourseSlug}/offline-package`);
    expect(demoPackageResponse.ok, `${demoPackageResponse.status} ${demoPackageResponse.text}`).toBeTruthy();
    demoOfflinePackage = Buffer.from(demoPackageResponse.base64, "base64");

    const completeButtons = page.getByRole("button", { name: /completar/i });
    const count = await completeButtons.count();
    for (let i = 0; i < count; i += 1) {
      await completeButtons.first().click();
    }

    await expect(page.getByText(/100%/)).toBeVisible();

    const evaluationResponse = await page.evaluate(async () => {
      const response = await fetch("/api/evaluations?courseSlug=diseno-de-moocs-desde-la-idea-hasta-la-publicacion");
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
      (item: { course: { slug: string } }) => item.course.slug === demoCourseSlug
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
    expect(verifyJson.criteria).toMatch(/puntaje mínimo de \d+%/);
  });

  test("offline package works without connection and synchronizes after reconnecting", async ({ page }) => {
    if (!demoOfflinePackage) {
      await loginByApi(page, student.email, student.password);
      const packageResponse = await getBinaryFromPage(page, `/api/courses/${demoCourseSlug}/offline-package`);
      expect(packageResponse.ok, `${packageResponse.status} ${packageResponse.text}`).toBeTruthy();
      demoOfflinePackage = Buffer.from(packageResponse.base64, "base64");
    }
    const zip = await JSZip.loadAsync(demoOfflinePackage!);
    const html = await zip.file("index.html")?.async("string");
    expect(html).toBeTruthy();
    expect(html).toContain("/api/offline/sync");

    const courseJson = JSON.parse(html!.match(/const COURSE=([\s\S]*?);const key/)![1]) as {
      syncToken: string;
      syncEndpoint: string;
    };
    await page.goto("/es/login");
    await page.setContent(html!);
    await page.context().setOffline(true);

    const sessionButtons = page.locator("[data-complete]");
    const sessionCount = await sessionButtons.count();
    for (let index = 0; index < sessionCount; index += 1) {
      await sessionButtons.nth(index).click();
    }
    expect(await page.evaluate(() => Object.keys(localStorage).some((key) => key.startsWith("curso-offline-")))).toBeTruthy();

    const questionNames = await page.locator("#evaluation input[type=radio]").evaluateAll((inputs) => [
      ...new Set(inputs.map((input) => input.getAttribute("name")).filter(Boolean)),
    ]);
    for (const name of questionNames) {
      await page.locator(`input[name="${name}"]`).first().check();
    }
    await page.getByRole("button", { name: "Guardar respuestas" }).click();
    await expect(page.locator("#evaluationResult")).toContainText("Resultado guardado");

    await page.context().setOffline(false);
    await page.getByRole("button", { name: "Sincronizar progreso" }).click();
    await expect(page.locator("#syncStatus")).toContainText("Sincronizado correctamente");

    const partialSync = await page.request.post(courseJson.syncEndpoint, {
      headers: { Authorization: `Bearer ${courseJson.syncToken}` },
      data: { completedSessionIds: [] },
    });
    expect(partialSync.ok()).toBeTruthy();
    expect((await partialSync.json()).data.progress).toBe(100);

    const expiredToken = await new SignJWT({
      type: "offline-sync",
      courseId: "expired-course",
      enrollmentId: "expired-enrollment",
    })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject("expired-user")
      .setIssuedAt()
      .setExpirationTime(Math.floor(Date.now() / 1000) - 60)
      .sign(new TextEncoder().encode(process.env.JWT_SECRET || "aprendizaje-local-jwt-secret-minimum-32-chars"));
    const expiredResponse = await page.request.post("/api/offline/sync", {
      headers: { Authorization: `Bearer ${expiredToken}` },
      data: {},
    });
    expect(expiredResponse.status()).toBe(401);
  });
});
