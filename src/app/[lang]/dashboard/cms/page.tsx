"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Archive, Award, BarChart3, BookOpen, Download, ExternalLink, Eye, Headphones, Layers, Loader2, Plus, RefreshCw, Save, Trash2, Upload, Users, Video } from "lucide-react";
import { getLangFromParams } from "@/lib/i18n";
import { resolveVideoRender } from "@/lib/video";

type LocalizedText = { es: string; en: string };
type LocalizedListText = { es: string; en: string };
type SessionType = "RECORDED" | "LIVE" | "HYBRID";
type QuestionType = "MCQ" | "TRUEFALSE" | "SHORT";
type EvaluationType = "FINAL" | "PARTIAL" | "AUTOEVALUATION";
type CmsSection = "course" | "analytics" | "editions" | "modules" | "sessions" | "questionBank" | "evaluation" | "reviews";

interface CmsSession {
  id: string;
  title: LocalizedText;
  description: LocalizedText;
  moduleId?: string | null;
  sessionType: SessionType;
  preview: boolean;
  videoUrl?: string;
  videoPlatform?: string;
  audioUrl?: string;
  audioPlatform?: string;
  durationMinutes?: number | null;
  resources?: SessionResource[] | null;
  practicePrompt?: LocalizedText | null;
  order: number;
  status: string;
}

interface CmsModule {
  id: string;
  title: LocalizedText;
  description?: LocalizedText;
  order: number;
  status: string;
  sessions: CmsSession[];
}

interface CmsCourse {
  id: string;
  instructorId: string;
  instructor?: { id: string; name: string; email: string; role: string } | null;
  slug: string;
  title: LocalizedText;
  description: LocalizedText;
  learningObjectives?: { es?: string[]; en?: string[] } | null;
  targetAudience?: { es?: string[]; en?: string[] } | null;
  requirements?: { es?: string[]; en?: string[] } | null;
  competencies?: { es?: string[]; en?: string[] } | null;
  coverImageUrl?: string | null;
  scienceBranch?: string | null;
  topics?: string[];
  keywords?: string[];
  questionBank?: CmsQuestion[] | null;
  estimatedHours?: number | null;
  weeklyHours?: number | null;
  level?: string | null;
  language?: string | null;
  certificateAvailable?: boolean;
  selfPaced?: boolean;
  pricingModel: string;
  price?: number;
  currency: string;
  visibility: string;
  status: string;
  modules: CmsModule[];
  editions?: CmsEdition[];
  sessions?: CmsSession[];
  evaluations?: CmsEvaluation[];
  _count: { enrollments: number; sessions: number; modules: number };
}

interface CmsEdition {
  id: string;
  name: LocalizedText;
  startsAt?: string | null;
  endsAt?: string | null;
  capacity?: number | null;
  status: string;
  isDefault: boolean;
  _count?: { enrollments: number };
}

const emptyText = { es: "", en: "" };

interface CmsQuestion {
  id: string;
  type: QuestionType;
  question: LocalizedText;
  options: LocalizedText[];
  correctAnswer: string;
  feedback: LocalizedText;
  points: number;
  tags?: string[];
  difficulty?: "BASIC" | "INTERMEDIATE" | "ADVANCED";
  topic?: string;
  moduleId?: string;
}

interface CmsEvaluation {
  id: string;
  title: LocalizedText;
  description?: LocalizedText;
  evaluationType?: EvaluationType;
  passingScore: number;
  maxAttempts?: number;
  showFeedback?: boolean;
  shuffleQuestions?: boolean;
  shuffleOptions?: boolean;
  questions: CmsQuestion[];
  session?: { id: string; title: LocalizedText; order: number } | null;
  module?: { id: string; title: LocalizedText; order: number } | null;
}

interface CourseFormState {
  id: string;
  leadInstructorId: string;
  slug: string;
  title: LocalizedText;
  description: LocalizedText;
  learningObjectives: LocalizedListText;
  targetAudience: LocalizedListText;
  requirements: LocalizedListText;
  competencies: LocalizedListText;
  coverImageUrl: string;
  scienceBranch: string;
  topics: string;
  keywords: string;
  estimatedHours: string;
  weeklyHours: string;
  level: string;
  language: string;
  certificateAvailable: boolean;
  selfPaced: boolean;
  pricingModel: string;
  price: string;
  currency: string;
  visibility: string;
  status: string;
}

interface ModuleFormState {
  moduleId: string;
  title: LocalizedText;
  description: LocalizedText;
  order: string;
  status: string;
}

interface SessionFormState {
  sessionId: string;
  moduleId: string;
  title: LocalizedText;
  description: LocalizedText;
  sessionType: SessionType;
  preview: boolean;
  videoUrl: string;
  videoPlatform: string;
  audioUrl: string;
  audioPlatform: string;
  durationMinutes: string;
  resources: SessionResource[];
  practicePrompt: LocalizedText;
  order: string;
}

interface SessionResource {
  id?: string;
  title: string;
  url: string;
  type: string;
  source: "EXTERNAL" | "REPOSITORY" | "LOCAL_UPLOAD";
}

interface EvaluationFormState {
  title: LocalizedText;
  description: LocalizedText;
  passingScore: string;
  maxAttempts: string;
  showFeedback: boolean;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  questions: CmsQuestion[];
}

interface BankSelectionState {
  count: string;
  tag: string;
  difficulty: string;
  moduleId: string;
  topic: string;
  selectionMode: "FIXED" | "RANDOM";
}

interface EditionFormState {
  editionId: string;
  name: LocalizedText;
  startsAt: string;
  endsAt: string;
  capacity: string;
  status: string;
  isDefault: boolean;
}

interface CmsEnrollment {
  id: string;
  status: string;
  progress: number;
  admissionType: string;
  createdAt: string;
  user: { id: string; name: string; email: string; country?: string | null };
  payments?: Array<{
    id: string;
    status: string;
    amount: number;
    currency: string;
    method: string;
    createdAt: string;
  }>;
}

interface CmsUser {
  id: string;
  name: string;
  email: string;
  country?: string | null;
  preferredLang?: string | null;
  bio?: string | null;
  institution?: string | null;
  avatarUrl?: string | null;
}

interface InstructorProfileForm {
  id: string;
  name: string;
  email: string;
  role: string;
  bio: string;
  institution: string;
  avatarUrl: string;
}

interface CourseInstructorAssignment {
  id: string;
  role: string;
  user: { id: string; name: string; email: string };
}

interface CmsReview {
  id: string;
  rating: number;
  testimonial?: string | null;
  status: "PENDING" | "PUBLISHED" | "REJECTED";
  createdAt: string;
  user: { name: string; email: string };
}

interface AnalyticsSummary {
  totalEnrollments: number;
  activeEnrollments: number;
  pendingPayment: number;
  suspended: number;
  cancelled: number;
  averageProgress: number;
  completed: number;
  completionRate: number;
  passedEvaluations: number;
  passRate: number;
  certificatesIssued: number;
  certificateRate: number;
  revokedCertificates: number;
  evaluationAttempts: number;
  averageBestScore: number;
}

interface CourseAnalytics {
  overall: AnalyticsSummary;
  editions: Array<{
    edition: CmsEdition;
  } & AnalyticsSummary>;
  withoutEdition: AnalyticsSummary | null;
  views: {
    total: number;
    unique: number;
    byDay: Array<{ day: string; views: number }>;
  };
}

function createQuestion(type: QuestionType = "MCQ"): CmsQuestion {
  return {
    id: `q-${Date.now()}`,
    type,
    question: { ...emptyText },
    options: type === "MCQ" ? [{ ...emptyText }, { ...emptyText }] : [],
    correctAnswer: type === "TRUEFALSE" ? "true" : "",
    feedback: { ...emptyText },
    points: 1,
    tags: [],
    difficulty: "BASIC",
    topic: "",
    moduleId: "",
  };
}

function listToText(value?: { es?: string[]; en?: string[] } | null): LocalizedListText {
  return {
    es: Array.isArray(value?.es) ? value.es.join("\n") : "",
    en: Array.isArray(value?.en) ? value.en.join("\n") : "",
  };
}

function textToList(value: LocalizedListText) {
  return {
    es: value.es.split("\n").map((item) => item.trim()).filter(Boolean),
    en: value.en.split("\n").map((item) => item.trim()).filter(Boolean),
  };
}

function commaTextToList(value: string) {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

export default function CmsPage() {
  const params = useParams<{ lang: string }>();
  const router = useRouter();
  const lang = getLangFromParams(params);
  const [courses, setCourses] = useState<CmsCourse[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const [uploadingResource, setUploadingResource] = useState(false);
  const [loadingEnrollments, setLoadingEnrollments] = useState(false);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [loadingQuestionBank, setLoadingQuestionBank] = useState(false);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [courseReviews, setCourseReviews] = useState<CmsReview[]>([]);
  const [partialEvaluations, setPartialEvaluations] = useState<CmsEvaluation[]>([]);
  const [error, setError] = useState("");
  const [resourceNotice, setResourceNotice] = useState("");
  const [bankNotice, setBankNotice] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [instructorProfile, setInstructorProfile] = useState<InstructorProfileForm>({
    id: "",
    name: "",
    email: "",
    role: "",
    bio: "",
    institution: "",
    avatarUrl: "",
  });
  const [courseInstructors, setCourseInstructors] = useState<CourseInstructorAssignment[]>([]);
  const [instructorCandidates, setInstructorCandidates] = useState<CmsUser[]>([]);
  const [selectedInstructorId, setSelectedInstructorId] = useState("");
  const [selectedInstructorRole, setSelectedInstructorRole] = useState("INSTRUCTOR");
  const [activeSection, setActiveSection] = useState<CmsSection>("course");
  const [selectedEditionId, setSelectedEditionId] = useState("");
  const [editionEnrollments, setEditionEnrollments] = useState<CmsEnrollment[]>([]);
  const [manualEnrollmentEmail, setManualEnrollmentEmail] = useState("");
  const [manualEnrollmentStatus, setManualEnrollmentStatus] = useState("ACTIVE");
  const [studentSearch, setStudentSearch] = useState("");
  const [studentResults, setStudentResults] = useState<CmsUser[]>([]);
  const [searchingStudents, setSearchingStudents] = useState(false);
  const [analytics, setAnalytics] = useState<CourseAnalytics | null>(null);
  const [questionBank, setQuestionBank] = useState<CmsQuestion[]>([]);
  const [selectedBankQuestionIds, setSelectedBankQuestionIds] = useState<string[]>([]);
  const [bankQuestionForm, setBankQuestionForm] = useState<CmsQuestion | null>(null);
  const [bankSelection, setBankSelection] = useState<BankSelectionState>({
    count: "",
    tag: "",
    difficulty: "",
    moduleId: "",
    topic: "",
    selectionMode: "FIXED",
  });
  const [resourceForm, setResourceForm] = useState({
    title: "",
    url: "",
    type: "LINK",
    source: "EXTERNAL" as SessionResource["source"],
  });

  const [courseForm, setCourseForm] = useState<CourseFormState>({
    id: "",
    leadInstructorId: "",
    slug: "",
    title: { ...emptyText },
    description: { ...emptyText },
    learningObjectives: { es: "", en: "" },
    targetAudience: { es: "", en: "" },
    requirements: { es: "", en: "" },
    competencies: { es: "", en: "" },
    coverImageUrl: "",
    scienceBranch: "",
    topics: "",
    keywords: "",
    estimatedHours: "",
    weeklyHours: "",
    level: "BEGINNER",
    language: "es",
    certificateAvailable: true,
    selfPaced: true,
    pricingModel: "FREE",
    price: "",
    currency: "USD",
    visibility: "PUBLIC",
    status: "DRAFT",
  });

  const [moduleForm, setModuleForm] = useState<ModuleFormState>({
    moduleId: "",
    title: { ...emptyText },
    description: { ...emptyText },
    order: "",
    status: "PUBLISHED",
  });

  const [editionForm, setEditionForm] = useState<EditionFormState>({
    editionId: "",
    name: { ...emptyText },
    startsAt: "",
    endsAt: "",
    capacity: "",
    status: "PUBLISHED",
    isDefault: false,
  });

  const [sessionForm, setSessionForm] = useState<SessionFormState>({
    sessionId: "",
    moduleId: "",
    title: { ...emptyText },
    description: { ...emptyText },
    sessionType: "RECORDED",
    preview: false,
    videoUrl: "",
    videoPlatform: "YOUTUBE",
    audioUrl: "",
    audioPlatform: "EXTERNAL",
    durationMinutes: "",
    resources: [],
    practicePrompt: { ...emptyText },
    order: "",
  });

  const [evaluationForm, setEvaluationForm] = useState<EvaluationFormState>({
    title: { es: "Evaluación final", en: "Final evaluation" },
    description: { ...emptyText },
    passingScore: "80",
    maxAttempts: "3",
    showFeedback: true,
    shuffleQuestions: true,
    shuffleOptions: true,
    questions: [],
  });
  const [partialSessionId, setPartialSessionId] = useState("");
  const [evaluationType, setEvaluationType] = useState<EvaluationType>("FINAL");

  const t = (es: string, en: string) => (lang === "en" ? en : es);
  async function cmsFetch(input: RequestInfo | URL, init?: RequestInit) {
    let response = await fetch(input, init);
    if (response.status !== 401) return response;

    const refresh = await fetch("/api/auth/refresh", { method: "POST" });
    if (!refresh.ok) return response;

    response = await fetch(input, init);
    return response;
  }

  async function loadInstructorProfile() {
    try {
      const res = await cmsFetch("/api/profile");
      if (!res.ok) return;
      const json = await res.json();
      const profile = json.data;
      if (profile) {
        setInstructorProfile({
          id: profile.id || "",
          name: profile.name || "",
          email: profile.email || "",
          role: profile.role || "",
          bio: profile.bio || "",
          institution: profile.institution || "",
          avatarUrl: profile.avatarUrl || "",
        });
      }
    } catch {
      // El perfil no bloquea la edición del curso.
    }
  }

  async function saveInstructorProfile() {
    setProfileSaving(true);
    setError("");
    try {
      const res = await cmsFetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bio: instructorProfile.bio,
          institution: instructorProfile.institution,
          avatarUrl: instructorProfile.avatarUrl,
        }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || t("No se pudo guardar el perfil.", "Could not save profile."));
      }
      await loadCourses(selectedCourseId || undefined);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("No se pudo guardar el perfil.", "Could not save profile."));
    } finally {
      setProfileSaving(false);
    }
  }

  async function uploadInstructorAvatar(file: File | null) {
    if (!file) return;
    setUploadingAvatar(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await cmsFetch("/api/profile/avatar/upload", { method: "POST", body: formData });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || t("No se pudo subir la foto.", "Could not upload photo."));
      setInstructorProfile((current) => ({ ...current, avatarUrl: json.data?.avatarUrl || current.avatarUrl }));
    } catch (e) {
      setError(e instanceof Error ? e.message : t("No se pudo subir la foto.", "Could not upload photo."));
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function loadCourseInstructors(courseId: string) {
    try {
      const res = await cmsFetch(`/api/courses/${courseId}/instructors`);
      if (!res.ok) return;
      const json = await res.json();
      setCourseInstructors(json.data || []);
    } catch {
      setCourseInstructors([]);
    }
  }

  async function loadCourseReviews(courseId: string) {
    setLoadingReviews(true);
    setError("");
    try {
      const res = await cmsFetch(`/api/courses/${courseId}/reviews?moderation=1`);
      if (!res.ok) throw new Error();
      const json = await res.json();
      setCourseReviews(json.data || []);
    } catch {
      setError(t("No se pudieron cargar las reseñas.", "Could not load reviews."));
    } finally {
      setLoadingReviews(false);
    }
  }

  async function loadPartialEvaluations(courseId: string) {
    try {
      const res = await cmsFetch(`/api/courses/${courseId}/partial-evaluations`);
      if (!res.ok) throw new Error();
      const json = await res.json();
      setPartialEvaluations(Array.isArray(json.data) ? json.data : []);
    } catch {
      setPartialEvaluations([]);
      setError(t("No se pudieron cargar las evaluaciones del módulo.", "Could not load module assessments."));
    }
  }

  async function deletePartialEvaluation(evaluationId: string) {
    if (!selectedCourseId) return;
    const confirmed = window.confirm(t(
      "¿Quitar esta autoevaluación o evaluación parcial? También se eliminarán sus intentos registrados.",
      "Remove this self-assessment or partial assessment? Its recorded attempts will also be deleted."
    ));
    if (!confirmed) return;
    setSaving(true);
    setError("");
    try {
      const res = await cmsFetch(`/api/courses/${selectedCourseId}/partial-evaluations?evaluationId=${encodeURIComponent(evaluationId)}`, { method: "DELETE" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || t("No se pudo eliminar la evaluación.", "Could not delete the assessment."));
      await loadPartialEvaluations(selectedCourseId);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("No se pudo eliminar la evaluación.", "Could not delete the assessment."));
    } finally {
      setSaving(false);
    }
  }

  async function moderateReview(reviewId: string, status: CmsReview["status"]) {
    if (!selectedCourseId) return;
    setSaving(true);
    setError("");
    try {
      const res = await cmsFetch(`/api/courses/${selectedCourseId}/reviews/${reviewId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error();
      await loadCourseReviews(selectedCourseId);
    } catch {
      setError(t("No se pudo actualizar la reseña.", "Could not update review."));
    } finally {
      setSaving(false);
    }
  }

  async function loadInstructorCandidates() {
    try {
      const res = await cmsFetch("/api/cms/users?role=INSTRUCTOR&pageSize=100");
      if (!res.ok) return;
      const json = await res.json();
      setInstructorCandidates(json.data || []);
    } catch {
      setInstructorCandidates([]);
    }
  }

  async function assignInstructor() {
    if (!selectedCourseId || !selectedInstructorId) return;
    setSaving(true);
    setError("");
    try {
      const res = await cmsFetch(`/api/courses/${selectedCourseId}/instructors`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: selectedInstructorId, role: selectedInstructorRole }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || t("No se pudo asignar el instructor.", "Could not assign instructor."));
      setSelectedInstructorId("");
      await loadCourseInstructors(selectedCourseId);
      await loadCourses(selectedCourseId);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("No se pudo asignar el instructor.", "Could not assign instructor."));
    } finally {
      setSaving(false);
    }
  }

  async function removeInstructor(userId: string) {
    if (!selectedCourseId) return;
    setSaving(true);
    setError("");
    try {
      const res = await cmsFetch(`/api/courses/${selectedCourseId}/instructors?userId=${encodeURIComponent(userId)}`, { method: "DELETE" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || t("No se pudo retirar el instructor.", "Could not remove instructor."));
      await loadCourseInstructors(selectedCourseId);
      await loadCourses(selectedCourseId);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("No se pudo retirar el instructor.", "Could not remove instructor."));
    } finally {
      setSaving(false);
    }
  }

  const selectedCourse = courses.find((course) => course.id === selectedCourseId);
  const selectedLeadInstructor = instructorCandidates.find((candidate) => candidate.id === courseForm.leadInstructorId);
  const selectedEvaluation = selectedCourse?.evaluations?.[0];
  const selectedSessionCount =
    (selectedCourse?.sessions?.length || 0) +
    (selectedCourse?.modules || []).reduce((total, module) => total + module.sessions.length, 0);
  const hasPublishedEdition = Boolean(selectedCourse?.editions?.some((edition) => edition.status === "PUBLISHED"));
  const hasMediaSession = Boolean(
    selectedCourse?.sessions?.some((session) => session.status === "PUBLISHED" && (session.videoUrl || session.audioUrl)) ||
    selectedCourse?.modules?.some((module) => module.sessions.some((session) => session.status === "PUBLISHED" && (session.videoUrl || session.audioUrl)))
  );
  const paidCourseHasPrice = courseForm.pricingModel !== "PAID" || Number(courseForm.price || 0) > 0;
  const publishChecks = [
    { ok: Boolean(courseForm.slug.trim() && courseForm.title.es.trim() && courseForm.description.es.trim()), label: t("Ficha básica completa", "Basic course info complete") },
    { ok: hasPublishedEdition, label: t("Al menos una edición publicada", "At least one published edition") },
    { ok: selectedSessionCount > 0 && hasMediaSession, label: t("Al menos una sesión publicada con video o audio", "At least one published session with video or audio") },
    { ok: paidCourseHasPrice, label: t("Precio válido si el curso es pago", "Valid price when the course is paid") },
  ];
  const canPublish = publishChecks.every((check) => check.ok);
  const videoPreview = resolveVideoRender(sessionForm.videoUrl, sessionForm.videoPlatform);
  const courseSections: Array<{ id: CmsSection; label: string; icon: typeof BookOpen; disabled?: boolean }> = [
    { id: "course", label: t("Curso", "Course"), icon: BookOpen },
    { id: "analytics", label: t("Analítica", "Analytics"), icon: BarChart3, disabled: !selectedCourse },
    { id: "editions", label: t("Ediciones", "Editions"), icon: Layers, disabled: !selectedCourse },
    { id: "modules", label: t("Módulos", "Modules"), icon: Layers, disabled: !selectedCourse },
    { id: "sessions", label: t("Sesiones", "Sessions"), icon: Video, disabled: !selectedCourse },
    { id: "questionBank", label: t("Banco", "Bank"), icon: BookOpen, disabled: !selectedCourse },
    { id: "evaluation", label: t("Evaluación", "Evaluation"), icon: Award, disabled: !selectedCourse },
    { id: "reviews", label: t("Reseñas", "Reviews"), icon: Award, disabled: !selectedCourse },
  ];

  function resetCourseForm() {
    setSelectedCourseId("");
    setCourseForm((current) => ({ ...current, id: "", leadInstructorId: "" }));
    setSelectedEditionId("");
    setEditionEnrollments([]);
    setAnalytics(null);
    setQuestionBank([]);
    setSelectedBankQuestionIds([]);
    setBankQuestionForm(null);
    setBankNotice("");
    setEvaluationType("FINAL");
    setPartialSessionId("");
    setEvaluationForm({
      title: { es: "Evaluación final", en: "Final evaluation" },
      description: { ...emptyText },
      passingScore: "80",
      maxAttempts: "3",
      showFeedback: true,
      shuffleQuestions: true,
      shuffleOptions: true,
      questions: [],
    });
    setPartialEvaluations([]);
    setCourseInstructors([]);
    setActiveSection("course");
    setCourseForm({
      id: "",
      leadInstructorId: "",
      slug: "",
      title: { ...emptyText },
      description: { ...emptyText },
      learningObjectives: { es: "", en: "" },
      targetAudience: { es: "", en: "" },
      requirements: { es: "", en: "" },
      competencies: { es: "", en: "" },
      coverImageUrl: "",
      scienceBranch: "",
      topics: "",
      keywords: "",
      estimatedHours: "",
      weeklyHours: "",
      level: "BEGINNER",
      language: "es",
      certificateAvailable: true,
      selfPaced: true,
      pricingModel: "FREE",
      price: "",
      currency: "USD",
      visibility: "PUBLIC",
      status: "DRAFT",
    });
    setSelectedCourseId("");
    setSelectedEditionId("");
    setEditionEnrollments([]);
    setActiveSection("course");
  }

  function resetModuleForm() {
    setModuleForm({ moduleId: "", title: { ...emptyText }, description: { ...emptyText }, order: "", status: "PUBLISHED" });
  }

  function resetEditionForm() {
    setEditionForm({
      editionId: "",
      name: { ...emptyText },
      startsAt: "",
      endsAt: "",
      capacity: "",
      status: "PUBLISHED",
      isDefault: false,
    });
  }

  async function loadEditionEnrollments(editionId: string) {
    if (!selectedCourse || !editionId) return;
    setSelectedEditionId(editionId);
    setLoadingEnrollments(true);
    setError("");
    try {
      const res = await cmsFetch(`/api/courses/${selectedCourse.id}/editions/${editionId}/enrollments`);
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        const details = Array.isArray(json.missing) ? ` ${json.missing.join("; ")}` : "";
        throw new Error(json.error ? `${json.error}.${details}` : t("No se pudo guardar el curso.", "Could not save course."));
      }
      const json = await res.json();
      setEditionEnrollments(json.data || []);
    } catch {
      setError(t("No se pudieron cargar las matrículas.", "Could not load enrollments."));
    } finally {
      setLoadingEnrollments(false);
    }
  }

  async function updateEnrollmentStatus(enrollmentId: string, status: string) {
    if (!selectedCourse || !selectedEditionId) return;
    setSaving(true);
    setError("");
    try {
      const res = await cmsFetch(`/api/courses/${selectedCourse.id}/editions/${selectedEditionId}/enrollments`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enrollmentId, status }),
      });
      if (!res.ok) throw new Error();
      await loadEditionEnrollments(selectedEditionId);
      await loadCourses(selectedCourse.id);
    } catch {
      setError(t("No se pudo actualizar la matrícula.", "Could not update enrollment."));
    } finally {
      setSaving(false);
    }
  }

  async function searchStudents() {
    const query = studentSearch.trim();
    if (query.length < 2) {
      setStudentResults([]);
      return;
    }
    setSearchingStudents(true);
    setError("");
    try {
      const res = await cmsFetch(`/api/cms/users?role=STUDENT&search=${encodeURIComponent(query)}&pageSize=8`);
      if (!res.ok) throw new Error();
      const json = await res.json();
      setStudentResults(json.data || []);
    } catch {
      setError(t("No se pudieron buscar alumnos.", "Could not search students."));
    } finally {
      setSearchingStudents(false);
    }
  }

  async function createManualEnrollment() {
    if (!selectedCourse || !selectedEditionId) return;
    setSaving(true);
    setError("");
    try {
      const res = await cmsFetch(`/api/courses/${selectedCourse.id}/editions/${selectedEditionId}/enrollments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: manualEnrollmentEmail,
          status: manualEnrollmentStatus,
          admissionType: "MANUAL",
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Error");
      }
      setManualEnrollmentEmail("");
      setManualEnrollmentStatus("ACTIVE");
      setStudentSearch("");
      setStudentResults([]);
      await loadEditionEnrollments(selectedEditionId);
      await loadCourses(selectedCourse.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("No se pudo matricular al alumno.", "Could not enroll student."));
    } finally {
      setSaving(false);
    }
  }

  function resetSessionForm(moduleId = sessionForm.moduleId) {
    setSessionForm({
      sessionId: "",
      moduleId,
      title: { ...emptyText },
      description: { ...emptyText },
      sessionType: "RECORDED",
      preview: false,
      videoUrl: "",
      videoPlatform: "YOUTUBE",
      audioUrl: "",
      audioPlatform: "EXTERNAL",
      durationMinutes: "",
      resources: [],
      practicePrompt: { ...emptyText },
      order: "",
    });
    setResourceForm({ title: "", url: "", type: "LINK", source: "EXTERNAL" });
    setResourceNotice("");
  }

  async function loadCourses(nextSelectedId?: string) {
    setLoading(true);
    setError("");
    try {
      const res = await cmsFetch("/api/cms/courses");
      if (res.status === 401) {
        router.push(`/${lang}/login`);
        return;
      }
      if (res.status === 403) {
        router.push(`/${lang}/dashboard`);
        return;
      }
      if (!res.ok) throw new Error("Error");
      const data = await res.json();
      const nextCourses = data.data || [];
      setCourses(nextCourses);
      const preferredId = nextSelectedId || selectedCourseId;
      if (preferredId && nextCourses.some((course: CmsCourse) => course.id === preferredId)) {
        setSelectedCourseId(preferredId);
      } else if (nextCourses[0]) {
        setSelectedCourseId(nextCourses[0].id);
      }
    } catch {
      setError(t("No se pudo cargar el CMS.", "Could not load CMS."));
    } finally {
      setLoading(false);
    }
  }

  async function loadAnalytics(courseId = selectedCourseId) {
    if (!courseId) return;
    setLoadingAnalytics(true);
    setError("");
    try {
      const res = await cmsFetch(`/api/courses/${courseId}/analytics`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Error");
      }
      const json = await res.json();
      setAnalytics(json.data || null);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("No se pudo cargar la analítica.", "Could not load analytics."));
    } finally {
      setLoadingAnalytics(false);
    }
  }

  async function loadQuestionBank(courseId = selectedCourseId) {
    if (!courseId) return;
    setLoadingQuestionBank(true);
    setError("");
    try {
      const res = await cmsFetch(`/api/courses/${courseId}/question-bank`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Error");
      }
      const json = await res.json();
      const nextQuestions = Array.isArray(json.data) ? json.data : [];
      setQuestionBank(nextQuestions);
      setSelectedBankQuestionIds((current) => current.filter((id) => nextQuestions.some((question: CmsQuestion) => question.id === id)));
    } catch (e) {
      setError(e instanceof Error ? e.message : t("No se pudo cargar el banco de preguntas.", "Could not load question bank."));
    } finally {
      setLoadingQuestionBank(false);
    }
  }

  useEffect(() => {
    loadCourses();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadInstructorProfile();
    loadInstructorCandidates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function editCourse(course: CmsCourse) {
    const evaluation = course.evaluations?.[0];
    setSelectedCourseId(course.id);
    setSelectedEditionId("");
    setEditionEnrollments([]);
    setAnalytics(null);
    setQuestionBank(Array.isArray(course.questionBank) ? course.questionBank : []);
    setSelectedBankQuestionIds([]);
    setBankQuestionForm(null);
    setBankNotice("");
    setEvaluationType("FINAL");
    setPartialSessionId("");
    setPartialEvaluations([]);
    void loadCourseInstructors(course.id);
    void loadCourseReviews(course.id);
    void loadPartialEvaluations(course.id);
    setActiveSection("course");
    setCourseForm({
      id: course.id,
      leadInstructorId: course.instructor?.role === "INSTRUCTOR" ? course.instructorId : "",
      slug: course.slug,
      title: course.title,
      description: course.description,
      learningObjectives: listToText(course.learningObjectives),
      targetAudience: listToText(course.targetAudience),
      requirements: listToText(course.requirements),
      competencies: listToText(course.competencies),
      coverImageUrl: course.coverImageUrl || "",
      scienceBranch: course.scienceBranch || "",
      topics: (course.topics || []).join(", "),
      keywords: (course.keywords || []).join(", "),
      estimatedHours: course.estimatedHours ? String(course.estimatedHours) : "",
      weeklyHours: course.weeklyHours ? String(course.weeklyHours) : "",
      level: course.level || "BEGINNER",
      language: course.language || "es",
      certificateAvailable: course.certificateAvailable !== false,
      selfPaced: course.selfPaced !== false,
      pricingModel: course.pricingModel,
      price: course.price ? String(course.price) : "",
      currency: course.currency,
      visibility: course.visibility,
      status: course.status,
    });
    setEvaluationForm({
      title: evaluation?.title || { es: "Evaluación final", en: "Final evaluation" },
      description: evaluation?.description || { ...emptyText },
      passingScore: String(evaluation?.passingScore || 80),
      maxAttempts: String(evaluation?.maxAttempts || 3),
      showFeedback: evaluation?.showFeedback !== false,
      shuffleQuestions: evaluation?.shuffleQuestions !== false,
      shuffleOptions: evaluation?.shuffleOptions !== false,
      questions: evaluation?.questions?.length
        ? evaluation.questions.map((question) => ({
            ...question,
            feedback: question.feedback || { ...emptyText },
            tags: question.tags || [],
            difficulty: question.difficulty || "BASIC",
            topic: question.topic || "",
            moduleId: question.moduleId || "",
          }))
        : [],
    });
  }

  async function saveCourse() {
    if (!courseForm.id && instructorProfile.role === "ADMIN" && !courseForm.leadInstructorId) {
      setError(t("Selecciona el profesor líder antes de crear el curso.", "Select the lead instructor before creating the course."));
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await cmsFetch("/api/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: courseForm.id || undefined,
          leadInstructorId: courseForm.leadInstructorId || undefined,
          slug: courseForm.slug,
          title: courseForm.title,
          description: courseForm.description,
          learningObjectives: textToList(courseForm.learningObjectives),
          targetAudience: textToList(courseForm.targetAudience),
          requirements: textToList(courseForm.requirements),
          competencies: textToList(courseForm.competencies),
          coverImageUrl: courseForm.coverImageUrl,
          scienceBranch: courseForm.scienceBranch,
          topics: commaTextToList(courseForm.topics),
          keywords: commaTextToList(courseForm.keywords),
          estimatedHours: courseForm.estimatedHours ? Number(courseForm.estimatedHours) : null,
          weeklyHours: courseForm.weeklyHours ? Number(courseForm.weeklyHours) : null,
          level: courseForm.level,
          language: courseForm.language,
          certificateAvailable: courseForm.certificateAvailable,
          selfPaced: courseForm.selfPaced,
          pricingModel: courseForm.pricingModel,
          price: courseForm.pricingModel === "FREE" ? null : Number(courseForm.price || 0),
          currency: courseForm.currency,
          visibility: courseForm.visibility,
          status: courseForm.id ? courseForm.status : "DRAFT",
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || t("No se pudo guardar el curso.", "Could not save course."));
      }
      const json = await res.json();
      await loadCourses(json.data.id);
      setSelectedCourseId(json.data.id);
      setCourseForm((prev) => ({ ...prev, id: json.data.id, status: json.data.status || "DRAFT" }));
    } catch (e) {
      setError(e instanceof Error ? e.message : t("No se pudo guardar el curso.", "Could not save course."));
    } finally {
      setSaving(false);
    }
  }

  async function exportCourse() {
    if (!selectedCourseId) return;
    setError("");
    try {
      const res = await cmsFetch(`/api/courses/${selectedCourseId}/export`);
      if (!res.ok) throw new Error(t("No se pudo exportar el curso.", "Could not export course."));
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${selectedCourse?.slug || "curso"}-mooc.json`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("No se pudo exportar el curso.", "Could not export course."));
    }
  }

  async function importCourse(file: File | null) {
    if (!file) return;
    setSaving(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await cmsFetch("/api/courses/import", { method: "POST", body: formData });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || t("No se pudo importar el curso.", "Could not import course."));
      await loadCourses(json.data?.id);
      const refreshed = await cmsFetch("/api/cms/courses");
      if (refreshed.ok) {
        const coursesData = await refreshed.json();
        const importedCourse = (coursesData.data || []).find((course: CmsCourse) => course.id === json.data?.id);
        if (importedCourse) editCourse(importedCourse);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : t("No se pudo importar el curso.", "Could not import course."));
    } finally {
      setSaving(false);
    }
  }

  async function uploadCover(file: File | null) {
    if (!file || !courseForm.id) return;
    setUploadingCover(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await cmsFetch(`/api/courses/${courseForm.id}/cover/upload`, {
        method: "POST",
        body: formData,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || t("No se pudo subir la portada.", "Could not upload cover."));
      setCourseForm((prev) => ({ ...prev, coverImageUrl: json.data.coverImageUrl || "" }));
      await loadCourses(courseForm.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("No se pudo subir la portada.", "Could not upload cover."));
    } finally {
      setUploadingCover(false);
    }
  }

  async function updateCourseStatus(status: "DRAFT" | "PUBLISHED" | "ARCHIVED") {
    if (!courseForm.id) return;
    if (status === "PUBLISHED" && !canPublish) {
      setError(t("Completa los requisitos antes de publicar.", "Complete the requirements before publishing."));
      return;
    }
    const confirmed = status === "ARCHIVED"
      ? window.confirm(t("¿Archivar este curso? Dejará de aparecer en el catálogo.", "Archive this course? It will disappear from the catalog."))
      : true;
    if (!confirmed) return;

    setSaving(true);
    setError("");
    try {
      const res = await cmsFetch("/api/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: courseForm.id,
          leadInstructorId: courseForm.leadInstructorId || undefined,
          slug: courseForm.slug,
          title: courseForm.title,
          description: courseForm.description,
          learningObjectives: textToList(courseForm.learningObjectives),
          targetAudience: textToList(courseForm.targetAudience),
          requirements: textToList(courseForm.requirements),
          competencies: textToList(courseForm.competencies),
          coverImageUrl: courseForm.coverImageUrl,
          scienceBranch: courseForm.scienceBranch,
          topics: commaTextToList(courseForm.topics),
          keywords: commaTextToList(courseForm.keywords),
          estimatedHours: courseForm.estimatedHours ? Number(courseForm.estimatedHours) : null,
          weeklyHours: courseForm.weeklyHours ? Number(courseForm.weeklyHours) : null,
          level: courseForm.level,
          language: courseForm.language,
          certificateAvailable: courseForm.certificateAvailable,
          selfPaced: courseForm.selfPaced,
          pricingModel: courseForm.pricingModel,
          price: courseForm.pricingModel === "FREE" ? null : Number(courseForm.price || 0),
          currency: courseForm.currency,
          visibility: courseForm.visibility,
          status,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || t("No se pudo cambiar el estado del curso.", "Could not change course status."));
      }
      setCourseForm((prev) => ({ ...prev, status }));
      await loadCourses(courseForm.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("No se pudo cambiar el estado del curso.", "Could not change course status."));
    } finally {
      setSaving(false);
    }
  }

  async function deleteCourse() {
    if (!courseForm.id) return;
    const confirmed = window.confirm(t(
      "¿Eliminar definitivamente este curso? Esta acción solo está disponible para borradores o cursos archivados sin matrículas ni certificados.",
      "Permanently delete this course? This is only available for drafts or archived courses without enrollments or certificates."
    ));
    if (!confirmed) return;
    setSaving(true);
    setError("");
    try {
      const res = await cmsFetch(`/api/courses/${courseForm.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || t("No se pudo eliminar el curso.", "Could not delete course."));
      resetCourseForm();
      await loadCourses();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("No se pudo eliminar el curso.", "Could not delete course."));
    } finally {
      setSaving(false);
    }
  }

  async function saveModule() {
    if (!selectedCourse) return;
    setSaving(true);
    setError("");
    try {
      const res = await cmsFetch(`/api/courses/${selectedCourse.id}/modules`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...moduleForm,
          moduleId: moduleForm.moduleId || undefined,
          order: moduleForm.order ? Number(moduleForm.order) : undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || t("No se pudo guardar el módulo.", "Could not save module."));
      }
      resetModuleForm();
      await loadCourses(selectedCourse.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("No se pudo guardar el módulo.", "Could not save module."));
    } finally {
      setSaving(false);
    }
  }

  async function saveEdition() {
    if (!selectedCourse) return;
    setSaving(true);
    setError("");
    try {
      const res = await cmsFetch(`/api/courses/${selectedCourse.id}/editions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          editionId: editionForm.editionId || undefined,
          name: editionForm.name,
          startsAt: editionForm.startsAt || null,
          endsAt: editionForm.endsAt || null,
          capacity: editionForm.capacity ? Number(editionForm.capacity) : null,
          status: editionForm.status,
          isDefault: editionForm.isDefault,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Error");
      }
      resetEditionForm();
      await loadCourses(selectedCourse.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("No se pudo guardar la edición.", "Could not save edition."));
    } finally {
      setSaving(false);
    }
  }

  async function saveSession() {
    if (!selectedCourse) return;
    setSaving(true);
    setError("");
    try {
      const res = await cmsFetch(`/api/courses/${selectedCourse.id}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...sessionForm,
          sessionId: sessionForm.sessionId || undefined,
          moduleId: sessionForm.moduleId || undefined,
          durationMinutes: sessionForm.durationMinutes ? Number(sessionForm.durationMinutes) : null,
          order: sessionForm.order ? Number(sessionForm.order) : undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || t("No se pudo guardar la sesión.", "Could not save session."));
      }
      resetSessionForm(sessionForm.moduleId);
      await loadCourses(selectedCourse.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("No se pudo guardar la sesión.", "Could not save session."));
    } finally {
      setSaving(false);
    }
  }

  async function uploadVideo(file: File | null) {
    if (!selectedCourse || !file) return;
    setUploadingVideo(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await cmsFetch(`/api/courses/${selectedCourse.id}/videos/upload`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || t("No se pudo subir el video.", "Could not upload video."));
      }
      const json = await res.json();
      setSessionForm((prev) => ({
        ...prev,
        videoUrl: json.data.url,
        videoPlatform: json.data.platform,
      }));
    } catch (e) {
      setError(e instanceof Error ? e.message : t("No se pudo subir el video.", "Could not upload video."));
    } finally {
      setUploadingVideo(false);
    }
  }

  async function uploadAudio(file: File | null) {
    if (!selectedCourse || !file) return;
    setUploadingAudio(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await cmsFetch(`/api/courses/${selectedCourse.id}/audios/upload`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || t("No se pudo subir el audio.", "Could not upload audio."));
      }
      const json = await res.json();
      setSessionForm((prev) => ({
        ...prev,
        audioUrl: json.data.url,
        audioPlatform: json.data.platform,
      }));
    } catch (e) {
      setError(e instanceof Error ? e.message : t("No se pudo subir el audio.", "Could not upload audio."));
    } finally {
      setUploadingAudio(false);
    }
  }

  async function uploadResource(file: File | null) {
    if (!selectedCourse || !file) return;
    setUploadingResource(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await cmsFetch(`/api/courses/${selectedCourse.id}/resources/upload`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || t("No se pudo subir el material.", "Could not upload resource."));
      }
      const json = await res.json();
      setSessionForm((prev) => ({
        ...prev,
        resources: [
          ...prev.resources,
          {
            id: `resource-${Date.now()}`,
            title: json.data.title,
            url: json.data.url,
            type: json.data.type || "FILE",
            source: "LOCAL_UPLOAD",
          },
        ],
      }));
      setResourceNotice(t(
        "Material añadido a la sesión. Pulsa «Guardar sesión» para conservarlo.",
        "Material added to the session. Click \"Save session\" to keep it."
      ));
    } catch (e) {
      setError(e instanceof Error ? e.message : t("No se pudo subir el material.", "Could not upload resource."));
    } finally {
      setUploadingResource(false);
    }
  }

  function addResource() {
    if (!resourceForm.title.trim() || !resourceForm.url.trim()) {
      setResourceNotice("");
      setError(t("Indica título y URL del material.", "Add title and URL for the resource."));
      return;
    }
    setError("");
    setSessionForm((prev) => ({
      ...prev,
      resources: [
        ...prev.resources,
        {
          id: `resource-${Date.now()}`,
          title: resourceForm.title.trim(),
          url: resourceForm.url.trim(),
          type: resourceForm.type.trim() || "LINK",
          source: resourceForm.source,
        },
      ],
    }));
    setResourceForm({ title: "", url: "", type: "LINK", source: "EXTERNAL" });
    setResourceNotice(t(
      "Recurso añadido a la sesión. Pulsa «Guardar sesión» para conservarlo.",
      "Resource added to the session. Click \"Save session\" to keep it."
    ));
  }

  function removeResource(resourceId: string | undefined, resourceIndex: number) {
    setSessionForm((prev) => ({
      ...prev,
      resources: prev.resources.filter((resource, index) => resource.id ? resource.id !== resourceId : index !== resourceIndex),
    }));
    setResourceNotice(t("Recurso retirado de la sesión. Guarda la sesión para confirmar el cambio.", "Resource removed from the session. Save the session to confirm the change."));
  }

  async function archiveSession(sessionId: string) {
    if (!selectedCourse) return;
    const confirmed = window.confirm(t("¿Archivar esta sesión? Dejará de aparecer para estudiantes.", "Archive this session? It will no longer appear to students."));
    if (!confirmed) return;

    setSaving(true);
    setError("");
    try {
      const res = await cmsFetch(`/api/courses/${selectedCourse.id}/sessions/${sessionId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Error");
      }
      if (sessionForm.sessionId === sessionId) resetSessionForm();
      await loadCourses(selectedCourse.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("No se pudo archivar la sesión.", "Could not archive session."));
    } finally {
      setSaving(false);
    }
  }

  async function deleteSession(sessionId: string) {
    if (!selectedCourse) return;
    const confirmed = window.confirm(t(
      "¿Eliminar definitivamente esta sesión? Solo debe usarse para borradores o sesiones archivadas sin progreso registrado.",
      "Permanently delete this session? Use this only for drafts or archived sessions without recorded progress."
    ));
    if (!confirmed) return;

    setSaving(true);
    setError("");
    try {
      const res = await cmsFetch(`/api/courses/${selectedCourse.id}/sessions/${sessionId}?permanent=1`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || t("No se pudo eliminar la sesión.", "Could not delete the session."));
      if (sessionForm.sessionId === sessionId) resetSessionForm();
      await loadCourses(selectedCourse.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("No se pudo eliminar la sesión.", "Could not delete the session."));
    } finally {
      setSaving(false);
    }
  }

  function updateQuestion(index: number, patch: Partial<CmsQuestion>) {
    setEvaluationForm((prev) => ({
      ...prev,
      questions: prev.questions.map((question, i) =>
        i === index ? { ...question, ...patch } : question
      ),
    }));
  }

  function updateQuestionOption(questionIndex: number, optionIndex: number, value: LocalizedText) {
    setEvaluationForm((prev) => ({
      ...prev,
      questions: prev.questions.map((question, i) => {
        if (i !== questionIndex) return question;
        return {
          ...question,
          options: question.options.map((option, o) => (o === optionIndex ? value : option)),
        };
      }),
    }));
  }

  function changeEvaluationType(nextType: EvaluationType) {
    setEvaluationType(nextType);
    setEvaluationForm((current) => {
      const defaultTitles = ["Evaluación final", "Evaluación parcial", "Autoevaluación"];
      const currentTitle = current.title.es.trim();
      const nextTitle = nextType === "FINAL" ? "Evaluación final" : nextType === "PARTIAL" ? "Evaluación parcial" : "Autoevaluación";
      if (!defaultTitles.includes(currentTitle)) return current;
      return {
        ...current,
        title: { es: nextTitle, en: nextType === "FINAL" ? "Final assessment" : nextType === "PARTIAL" ? "Partial assessment" : "Self-assessment" },
      };
    });
  }

  async function saveEvaluation() {
    if (!selectedCourse) return;
    if (evaluationForm.questions.length === 0) {
      setError(t("Selecciona al menos una pregunta del banco.", "Select at least one question from the bank."));
      return;
    }
    if (evaluationType !== "FINAL" && !partialSessionId) {
      setError(t("Selecciona la sesión donde se realizará esta evaluación.", "Select the session for this assessment."));
      return;
    }
    setSaving(true);
    setError("");
    try {
      const endpoint = evaluationType === "FINAL"
        ? `/api/courses/${selectedCourse.id}/evaluation`
        : `/api/courses/${selectedCourse.id}/partial-evaluations`;
      const res = await cmsFetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(evaluationType === "FINAL" ? {} : { sessionId: partialSessionId, evaluationType }),
          title: evaluationForm.title,
          description: evaluationForm.description,
          passingScore: Number(evaluationForm.passingScore || 80),
          maxAttempts: Number(evaluationForm.maxAttempts || 3),
          showFeedback: evaluationForm.showFeedback,
          shuffleQuestions: evaluationForm.shuffleQuestions,
          shuffleOptions: evaluationForm.shuffleOptions,
          questions: evaluationForm.questions,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Error");
      }
      await loadCourses(selectedCourse.id);
      if (evaluationType !== "FINAL") await loadPartialEvaluations(selectedCourse.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("No se pudo guardar la evaluación.", "Could not save the assessment."));
    } finally {
      setSaving(false);
    }
  }

  function updateBankQuestion(patch: Partial<CmsQuestion>) {
    setBankQuestionForm((current) => current ? { ...current, ...patch } : current);
  }

  function updateBankQuestionOption(optionIndex: number, value: LocalizedText) {
    setBankQuestionForm((current) => current ? {
      ...current,
      options: current.options.map((option, index) => index === optionIndex ? value : option),
    } : current);
  }

  function startNewBankQuestion() {
    setError("");
    setBankQuestionForm(createQuestion());
  }

  function editBankQuestion(question: CmsQuestion) {
    setError("");
    setBankQuestionForm({
      ...question,
      feedback: question.feedback || { ...emptyText },
      options: question.options || [],
      tags: question.tags || [],
      difficulty: question.difficulty || "BASIC",
      topic: question.topic || "",
      moduleId: question.moduleId || "",
    });
  }

  async function persistQuestionBank(nextQuestions: CmsQuestion[], successMessage?: string) {
    if (!selectedCourse) return false;
    setSaving(true);
    setError("");
    try {
      const res = await cmsFetch(`/api/courses/${selectedCourse.id}/question-bank`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questions: nextQuestions }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || t("No se pudo guardar el banco de preguntas.", "Could not save the question bank."));
      const savedQuestions = Array.isArray(data.data) ? data.data : [];
      setQuestionBank(savedQuestions);
      setSelectedBankQuestionIds((current) => current.filter((id) => savedQuestions.some((question: CmsQuestion) => question.id === id)));
      if (successMessage) setBankNotice(successMessage);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : t("No se pudo guardar el banco de preguntas.", "Could not save the question bank."));
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function saveBankQuestion() {
    if (!bankQuestionForm) return;
    const question = bankQuestionForm;
    if (!question.question.es.trim() && !question.question.en.trim()) {
      setError(t("Escribe el enunciado de la pregunta.", "Enter the question text."));
      return;
    }
    if (!question.correctAnswer.trim()) {
      setError(t("Indica la respuesta correcta.", "Enter the correct answer."));
      return;
    }
    if (question.type === "MCQ" && question.options.length < 2) {
      setError(t("Una pregunta de selección múltiple necesita al menos dos opciones.", "A multiple-choice question needs at least two options."));
      return;
    }
    const existingIndex = questionBank.findIndex((item) => item.id === question.id);
    const nextQuestions = existingIndex >= 0
      ? questionBank.map((item, index) => index === existingIndex ? question : item)
      : [...questionBank, question];
    const saved = await persistQuestionBank(nextQuestions, t("Pregunta guardada en el banco.", "Question saved in the bank."));
    if (saved) setBankQuestionForm(null);
  }

  async function deleteBankQuestion(questionId: string) {
    if (!window.confirm(t("¿Eliminar esta pregunta del banco? No se eliminará de evaluaciones ya guardadas.", "Delete this question from the bank? It will not be removed from saved evaluations."))) return;
    const saved = await persistQuestionBank(questionBank.filter((question) => question.id !== questionId), t("Pregunta eliminada del banco.", "Question removed from the bank."));
    if (saved && bankQuestionForm?.id === questionId) setBankQuestionForm(null);
  }

  async function saveQuestionBankFromEvaluation() {
    if (!selectedCourse) return;
    const merged = [...questionBank];
    for (const question of evaluationForm.questions) {
      const index = merged.findIndex((item) => item.id === question.id);
      if (index >= 0) merged[index] = question;
      else merged.push(question);
    }
    await persistQuestionBank(merged, t("Preguntas incorporadas al banco.", "Questions added to the bank."));
  }

  function getFilteredBankQuestions() {
    const tag = bankSelection.tag.trim().toLowerCase();
    const topic = bankSelection.topic.trim().toLowerCase();
    return questionBank.filter((question) => {
      const tagMatches = !tag || (question.tags || []).some((item) => item.toLowerCase() === tag);
      const difficultyMatches = !bankSelection.difficulty || question.difficulty === bankSelection.difficulty;
      const moduleMatches = !bankSelection.moduleId || question.moduleId === bankSelection.moduleId;
      const topicMatches = !topic || (question.topic || "").toLowerCase().includes(topic);
      return tagMatches && difficultyMatches && moduleMatches && topicMatches;
    });
  }

  function loadBankIntoEvaluation() {
    if (questionBank.length === 0) {
      setError(t("El banco de preguntas está vacío.", "Question bank is empty."));
      return;
    }
    let candidates = selectedBankQuestionIds.length > 0
      ? questionBank.filter((question) => selectedBankQuestionIds.includes(question.id))
      : getFilteredBankQuestions();
    if (selectedBankQuestionIds.length === 0) {
      const requestedCount = Number(bankSelection.count || 0);
      if (bankSelection.selectionMode === "RANDOM") {
        candidates = candidates.sort(() => Math.random() - 0.5);
      }
      if (requestedCount > 0) {
        candidates = candidates.slice(0, requestedCount);
      }
    }
    if (candidates.length === 0) {
      setError(selectedBankQuestionIds.length > 0
        ? t("No hay preguntas marcadas para añadir.", "No questions are selected to add.")
        : t("No hay preguntas que coincidan con esos filtros.", "No questions match those filters."));
      return;
    }
    const selectedIds = new Set(evaluationForm.questions.map((question) => question.id));
    const additions = candidates.filter((question) => !selectedIds.has(question.id)).map((question) => ({
      ...question,
      feedback: question.feedback || { ...emptyText },
      tags: question.tags || [],
      difficulty: question.difficulty || "BASIC",
      topic: question.topic || "",
      moduleId: question.moduleId || "",
    }));
    if (additions.length === 0) {
      setError(t("Las preguntas que coinciden ya están en la evaluación.", "Matching questions are already in the assessment."));
      return;
    }
    setError("");
    setEvaluationForm((prev) => ({
      ...prev,
      questions: [...prev.questions, ...additions],
    }));
    setSelectedBankQuestionIds([]);
    setActiveSection("evaluation");
  }

  function renderAnalyticsCards(summary: AnalyticsSummary) {
    const metrics = [
      { label: t("Matrículas", "Enrollments"), value: summary.totalEnrollments, detail: `${summary.activeEnrollments} ${t("activas", "active")}` },
      { label: t("Progreso promedio", "Average progress"), value: `${summary.averageProgress}%`, detail: `${summary.completed} ${t("completaron", "completed")}` },
      { label: t("Finalización", "Completion"), value: `${summary.completionRate}%`, detail: `${summary.completed}/${summary.activeEnrollments}` },
      { label: t("Aprobación", "Pass rate"), value: `${summary.passRate}%`, detail: `${summary.passedEvaluations} ${t("aprobados", "passed")}` },
      { label: t("Certificados", "Certificates"), value: summary.certificatesIssued, detail: `${summary.certificateRate}% ${t("de activas", "of active")}` },
      { label: t("Mejor nota prom.", "Avg. best score"), value: `${summary.averageBestScore}%`, detail: `${summary.evaluationAttempts} ${t("intentos", "attempts")}` },
    ];

    return (
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {metrics.map((metric) => (
          <div key={metric.label} className="rounded-md border p-4">
            <p className="text-xs text-[#7b8fa1]">{metric.label}</p>
            <p className="mt-1 text-2xl font-semibold">{metric.value}</p>
            <p className="mt-1 text-xs text-[#52667a]">{metric.detail}</p>
          </div>
        ))}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-[#7b8fa1]" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-10">
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t("CMS Académico", "Academic CMS")}</h1>
          <p className="mt-1 text-sm text-[#7b8fa1]">
            {t("Gestiona cursos, módulos, sesiones y URLs de video.", "Manage courses, modules, sessions, and video URLs.")}
          </p>
        </div>
        <Link href={`/${lang}/dashboard`} className="text-sm text-primary hover:underline">
          {t("Volver al panel", "Back to dashboard")}
        </Link>
      </div>

      {error && <div className="mb-6 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <aside className="rounded-lg border bg-white">
          <div className="flex items-center justify-between border-b p-4">
            <h2 className="font-semibold">{t("Cursos", "Courses")}</h2>
            <button
              onClick={resetCourseForm}
              className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs hover:bg-accent"
            >
              <Plus className="h-3.5 w-3.5" />
              {t("Nuevo", "New")}
            </button>
          </div>
          <div className="max-h-[720px] overflow-auto p-2">
            {courses.length === 0 ? (
              <p className="p-4 text-sm text-[#7b8fa1]">{t("No hay cursos gestionables.", "No manageable courses.")}</p>
            ) : (
              courses.map((course) => (
                <button
                  key={course.id}
                  onClick={() => editCourse(course)}
                  className={`mb-2 w-full rounded-md p-3 text-left text-sm transition-colors ${
                    selectedCourseId === course.id ? "bg-primary text-white" : "hover:bg-accent"
                  }`}
                >
                  <span className="block font-medium">{t(course.title.es, course.title.en)}</span>
                  <span className={selectedCourseId === course.id ? "text-white/75" : "text-[#7b8fa1]"}>
                    {course.status} · {course._count.modules} {t("mód.", "mod.")} · {course._count.sessions} {t("ses.", "ses.")}
                  </span>
                </button>
              ))
            )}
          </div>
        </aside>

        <main className="space-y-6">
          <div className="rounded-lg border bg-white p-4">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <p className="text-sm font-semibold">
                  {courseForm.id ? t(courseForm.title.es || "Curso sin título", courseForm.title.en || "Untitled course") : t("Curso nuevo", "New course")}
                </p>
                <p className="text-xs text-[#7b8fa1]">
                  {courseForm.status} · {courseForm.pricingModel}
                  {selectedCourse ? ` · ${selectedCourse._count.enrollments} ${t("matrículas", "enrollments")}` : ""}
                </p>
              </div>
              {selectedCourse && (
                <div className="rounded-md border p-3 text-sm">
                  <p className="mb-2 font-medium">{t("Publicación", "Publishing")}</p>
                  <div className="grid gap-1 text-xs text-[#7b8fa1] sm:grid-cols-2">
                    {publishChecks.map((check) => (
                      <span key={check.label} className={check.ok ? "text-green-700" : "text-red-700"}>
                        {check.ok ? "OK" : "Falta"} · {check.label}
                      </span>
                    ))}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      onClick={() => updateCourseStatus("PUBLISHED")}
                      disabled={saving || courseForm.status === "PUBLISHED" || !canPublish}
                      className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                    >
                      {t("Publicar curso", "Publish course")}
                    </button>
                    <button
                      onClick={() => updateCourseStatus("ARCHIVED")}
                      disabled={saving || courseForm.status === "ARCHIVED"}
                      className="rounded-md border px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50"
                    >
                      {t("Archivar curso", "Archive course")}
                    </button>
                    {(courseForm.status === "DRAFT" || courseForm.status === "ARCHIVED") && (
                      <button
                        onClick={deleteCourse}
                        disabled={saving}
                        className="rounded-md border border-red-600 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                      >
                        {t("Eliminar curso", "Delete course")}
                      </button>
                    )}
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-2 text-center sm:flex sm:text-left">
                <div className="rounded-md bg-accent/50 px-3 py-2">
                  <p className="text-lg font-semibold">{selectedCourse?.editions?.length || 0}</p>
                  <p className="text-xs text-[#7b8fa1]">{t("Ediciones", "Editions")}</p>
                </div>
                <div className="rounded-md bg-accent/50 px-3 py-2">
                  <p className="text-lg font-semibold">{selectedCourse?._count.modules || 0}</p>
                  <p className="text-xs text-[#7b8fa1]">{t("Módulos", "Modules")}</p>
                </div>
                <div className="rounded-md bg-accent/50 px-3 py-2">
                  <p className="text-lg font-semibold">{selectedSessionCount}</p>
                  <p className="text-xs text-[#7b8fa1]">{t("Sesiones", "Sessions")}</p>
                </div>
                <div className="rounded-md bg-accent/50 px-3 py-2">
                  <p className="text-lg font-semibold">{selectedEvaluation ? evaluationForm.questions.length : 0}</p>
                  <p className="text-xs text-[#7b8fa1]">{t("Preguntas", "Questions")}</p>
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2 border-t pt-4">
              {courseSections.map((section) => {
                const Icon = section.icon;
                return (
                  <button
                    key={section.id}
                    onClick={() => {
                      setActiveSection(section.id);
                      if (section.id === "analytics" && selectedCourseId) {
                        loadAnalytics(selectedCourseId);
                      }
                      if (section.id === "questionBank" && selectedCourseId) {
                        loadQuestionBank(selectedCourseId);
                      }
                    }}
                    disabled={section.disabled}
                    className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                      activeSection === section.id ? "bg-primary text-white" : "border hover:bg-accent"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {section.label}
                  </button>
                );
              })}
              {selectedCourse && (
                <div className="ml-auto flex flex-wrap gap-2">
                  <button onClick={() => void exportCourse()} disabled={saving} className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium hover:bg-accent disabled:opacity-50">
                    <Download className="h-4 w-4" />
                    {t("Exportar", "Export")}
                  </button>
                  <Link href={`/${lang}/courses/${selectedCourse.slug}`} target="_blank" className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium hover:bg-accent">
                    <Eye className="h-4 w-4" />
                    {t("Vista pública", "Public view")}
                  </Link>
                </div>
              )}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-[#52667a]">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 font-medium hover:bg-accent">
                <Upload className="h-4 w-4" />
                {t("Importar curso JSON", "Import JSON course")}
                <input
                  type="file"
                  accept="application/json,.json"
                  className="sr-only"
                  disabled={saving}
                  onChange={(event) => {
                    void importCourse(event.target.files?.[0] || null);
                    event.currentTarget.value = "";
                  }}
                />
              </label>
              <span>{t("La importación crea un borrador y conserva videos y materiales como enlaces.", "Import creates a draft and keeps videos and materials as links.")}</span>
            </div>
          </div>

          {activeSection === "course" && (
          <section className="rounded-lg border bg-white p-5">
            <div className="mb-4 flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              <h2 className="font-semibold">{courseForm.id ? t("Editar curso", "Edit course") : t("Crear curso", "Create course")}</h2>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <input className="rounded-md border px-3 py-2 text-sm" placeholder="Slug" value={courseForm.slug} onChange={(e) => setCourseForm({ ...courseForm, slug: e.target.value })} />
              {courseForm.id ? (
                <select
                  className="rounded-md border px-3 py-2 text-sm"
                  value={courseForm.status}
                  onChange={(e) => setCourseForm({ ...courseForm, status: e.target.value })}
                  title={t("Primero guarda el curso como borrador. Luego podrás publicarlo cuando tenga sesiones con video.", "Save the course as a draft first. You can publish it after it has sessions with video.")}
                >
                  <option value="DRAFT">{t("Borrador", "Draft")}</option>
                  <option value="PUBLISHED">{t("Publicado", "Published")}</option>
                  <option value="ARCHIVED">{t("Archivado", "Archived")}</option>
                </select>
              ) : (
                <div className="rounded-md border bg-[#f4f7fb] px-3 py-2 text-sm text-[#52667a]">
                  {t("Estado inicial: Borrador", "Initial status: Draft")}
                </div>
              )}
              <input className="rounded-md border px-3 py-2 text-sm" placeholder="Título ES" value={courseForm.title.es} onChange={(e) => setCourseForm({ ...courseForm, title: { ...courseForm.title, es: e.target.value } })} />
              <input className="rounded-md border px-3 py-2 text-sm" placeholder="Title EN" value={courseForm.title.en} onChange={(e) => setCourseForm({ ...courseForm, title: { ...courseForm.title, en: e.target.value } })} />
              <textarea className="rounded-md border px-3 py-2 text-sm md:col-span-2" placeholder="Descripción ES" value={courseForm.description.es} onChange={(e) => setCourseForm({ ...courseForm, description: { ...courseForm.description, es: e.target.value } })} />
              <textarea className="rounded-md border px-3 py-2 text-sm md:col-span-2" placeholder="Description EN" value={courseForm.description.en} onChange={(e) => setCourseForm({ ...courseForm, description: { ...courseForm.description, en: e.target.value } })} />
              <div className="md:col-span-2 grid gap-3 rounded-md border bg-[#f4f7fb] p-3 md:grid-cols-[minmax(0,1fr)_220px]">
                <div className="space-y-3">
                  <input className="w-full rounded-md border bg-white px-3 py-2 text-sm" placeholder={t("URL de imagen de portada", "Cover image URL")} value={courseForm.coverImageUrl} onChange={(e) => setCourseForm({ ...courseForm, coverImageUrl: e.target.value })} />
                  <label className={`inline-flex cursor-pointer items-center gap-2 rounded-md border bg-white px-3 py-2 text-sm font-medium ${!courseForm.id || uploadingCover ? "pointer-events-none opacity-50" : "hover:bg-accent"}`}>
                    {uploadingCover ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    {t("Subir portada", "Upload cover")}
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="sr-only"
                      disabled={!courseForm.id || uploadingCover}
                      onChange={(e) => {
                        void uploadCover(e.target.files?.[0] || null);
                        e.currentTarget.value = "";
                      }}
                    />
                  </label>
                  {!courseForm.id && (
                    <p className="text-xs text-[#52667a]">
                      {t("Guarda primero el curso para habilitar la subida de portada.", "Save the course first to enable cover upload.")}
                    </p>
                  )}
                </div>
                <div className="overflow-hidden rounded-md border bg-white">
                  {courseForm.coverImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={courseForm.coverImageUrl} alt={t("Portada del curso", "Course cover")} className="h-32 w-full object-cover" />
                  ) : (
                    <div className="flex h-32 items-center justify-center text-xs text-[#7b8fa1]">
                      {t("Sin portada", "No cover")}
                    </div>
                  )}
                </div>
              </div>
              <div className="md:col-span-2 mt-2 border-t pt-4">
                <h3 className="text-sm font-semibold">{t("Ficha MOOC", "MOOC profile")}</h3>
              </div>
              <input className="rounded-md border px-3 py-2 text-sm" placeholder={t("Rama de la ciencia", "Science branch")} value={courseForm.scienceBranch} onChange={(e) => setCourseForm({ ...courseForm, scienceBranch: e.target.value })} />
              <input className="rounded-md border px-3 py-2 text-sm" placeholder={t("Temáticas, separadas por coma", "Topics, comma-separated")} value={courseForm.topics} onChange={(e) => setCourseForm({ ...courseForm, topics: e.target.value })} />
              <input className="rounded-md border px-3 py-2 text-sm md:col-span-2" placeholder={t("Palabras clave, separadas por coma", "Keywords, comma-separated")} value={courseForm.keywords} onChange={(e) => setCourseForm({ ...courseForm, keywords: e.target.value })} />
              {instructorProfile.role === "ADMIN" && (
                <div className="md:col-span-2 rounded-md border border-primary/30 bg-[#f4f7fb] p-4">
                  <h3 className="text-sm font-semibold">{t("Profesor líder del curso", "Course lead instructor")}</h3>
                  <p className="mt-1 text-xs text-[#52667a]">
                    {t("El profesor seleccionado será el responsable principal y verá este curso en su panel de instructor.", "The selected instructor will be the main responsible person and will see this course in their instructor dashboard.")}
                  </p>
                  <select
                    className="mt-3 w-full rounded-md border bg-white px-3 py-2 text-sm"
                    value={courseForm.leadInstructorId}
                    onChange={(e) => setCourseForm({ ...courseForm, leadInstructorId: e.target.value })}
                  >
                    <option value="">{t("Seleccionar profesor líder", "Select lead instructor")}</option>
                    {instructorCandidates.map((candidate) => (
                      <option key={candidate.id} value={candidate.id}>{candidate.name} · {candidate.email}</option>
                    ))}
                  </select>
                  {instructorCandidates.length === 0 && (
                    <p className="mt-2 text-xs text-amber-700">
                      {t("No hay profesores con rol de instructor registrados.", "No users with instructor role are registered.")}
                    </p>
                  )}
                </div>
              )}
              {instructorProfile.role === "ADMIN" ? (
                <div className="md:col-span-2 mt-2 border-t pt-4">
                  <h3 className="text-sm font-semibold">{t("Perfil del profesor líder", "Lead instructor profile")}</h3>
                  <p className="mt-1 text-xs text-[#52667a]">
                    {t("El profesor líder completa y actualiza su perfil desde su propia cuenta.", "The lead instructor completes and updates this profile from their own account.")}
                  </p>
                  {selectedLeadInstructor ? (
                    <div className="mt-3 grid gap-3 rounded-md border bg-[#f4f7fb] p-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                      <input className="rounded-md border bg-white px-3 py-2 text-sm text-[#52667a]" value={selectedLeadInstructor.name} readOnly aria-label={t("Nombre del profesor líder", "Lead instructor name")} />
                      <input className="rounded-md border bg-white px-3 py-2 text-sm text-[#52667a]" value={selectedLeadInstructor.email} readOnly aria-label={t("Correo del profesor líder", "Lead instructor email")} />
                      {selectedLeadInstructor.institution && <p className="text-sm text-[#52667a]">{selectedLeadInstructor.institution}</p>}
                      {selectedLeadInstructor.bio && <p className="text-sm leading-6 text-[#52667a] md:col-span-2">{selectedLeadInstructor.bio}</p>}
                    </div>
                  ) : (
                    <p className="mt-3 rounded-md border border-dashed p-3 text-sm text-[#7b8fa1]">
                      {t("Selecciona un profesor líder para consultar su perfil.", "Select a lead instructor to view their profile.")}
                    </p>
                  )}
                </div>
              ) : (
                <>
                  <div className="md:col-span-2 mt-2 border-t pt-4">
                    <h3 className="text-sm font-semibold">{t("Conozca a su instructor", "Meet your instructor")}</h3>
                    <p className="mt-1 text-xs text-[#52667a]">
                      {t("Este perfil se mostrará en los cursos publicados que usted imparte.", "This profile appears on published courses you teach.")}
                    </p>
                  </div>
                  <input className="rounded-md border bg-[#f4f7fb] px-3 py-2 text-sm text-[#52667a]" value={instructorProfile.name} readOnly aria-label={t("Nombre del instructor", "Instructor name")} />
                  <input className="rounded-md border bg-[#f4f7fb] px-3 py-2 text-sm text-[#52667a]" value={instructorProfile.email} readOnly aria-label={t("Correo del instructor", "Instructor email")} />
                  <input className="rounded-md border px-3 py-2 text-sm" placeholder={t("Institución", "Institution")} value={instructorProfile.institution} onChange={(e) => setInstructorProfile({ ...instructorProfile, institution: e.target.value })} />
                  <div className="flex flex-wrap items-center gap-2">
                    <label className={`inline-flex cursor-pointer items-center gap-2 rounded-md border bg-white px-3 py-2 text-sm font-medium ${uploadingAvatar ? "pointer-events-none opacity-50" : "hover:bg-accent"}`}>
                      {uploadingAvatar ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                      {t("Subir foto", "Upload photo")}
                      <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" disabled={uploadingAvatar} onChange={(e) => { void uploadInstructorAvatar(e.target.files?.[0] || null); e.currentTarget.value = ""; }} />
                    </label>
                    <input className="min-w-0 flex-1 rounded-md border px-3 py-2 text-sm" placeholder={t("o URL de la foto", "or photo URL")} value={instructorProfile.avatarUrl} onChange={(e) => setInstructorProfile({ ...instructorProfile, avatarUrl: e.target.value })} />
                  </div>
                  <textarea className="rounded-md border px-3 py-2 text-sm md:col-span-2" rows={3} placeholder={t("Resumen profesional del instructor", "Instructor professional bio")} value={instructorProfile.bio} onChange={(e) => setInstructorProfile({ ...instructorProfile, bio: e.target.value })} />
                  <div className="md:col-span-2">
                    <button onClick={saveInstructorProfile} disabled={profileSaving} className="inline-flex items-center gap-2 rounded-md border border-primary px-3 py-2 text-sm font-medium text-primary hover:bg-primary/5 disabled:opacity-50">
                      {profileSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      {t("Guardar perfil del instructor", "Save instructor profile")}
                    </button>
                  </div>
                </>
              )}
              {courseForm.id && (
                <div className="md:col-span-2 rounded-md border bg-[#f4f7fb] p-3">
                  <h4 className="text-sm font-semibold">{t("Profesores del curso", "Course instructors")}</h4>
                  <div className="mt-2 space-y-2">
                    {courseInstructors.map((assignment) => (
                      <div key={assignment.id} className="flex items-center justify-between gap-3 rounded-md border bg-white px-3 py-2 text-sm">
                        <span><strong>{assignment.user.name}</strong> <span className="text-xs text-[#7b8fa1]">{assignment.role}</span></span>
                        {assignment.role !== "LEAD" && (
                          <button type="button" onClick={() => void removeInstructor(assignment.user.id)} className="text-xs font-medium text-red-700 hover:underline">
                            {t("Retirar", "Remove")}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto_auto]">
                    <select className="rounded-md border px-3 py-2 text-sm" value={selectedInstructorId} onChange={(e) => setSelectedInstructorId(e.target.value)}>
                      <option value="">{t("Seleccionar instructor registrado", "Select registered instructor")}</option>
                      {instructorCandidates.map((candidate) => (
                        <option key={candidate.id} value={candidate.id}>{candidate.name} · {candidate.email}</option>
                      ))}
                    </select>
                    <select className="rounded-md border px-3 py-2 text-sm" value={selectedInstructorRole} onChange={(e) => setSelectedInstructorRole(e.target.value)}>
                      <option value="INSTRUCTOR">Instructor</option>
                      <option value="EDITOR">Editor</option>
                    </select>
                    <button type="button" onClick={() => void assignInstructor()} disabled={!selectedInstructorId || saving} className="rounded-md border border-primary px-3 py-2 text-sm font-medium text-primary disabled:opacity-50">
                      {t("Asignar", "Assign")}
                    </button>
                  </div>
                </div>
              )}
              <select className="rounded-md border px-3 py-2 text-sm" value={courseForm.level} onChange={(e) => setCourseForm({ ...courseForm, level: e.target.value })}>
                <option value="BEGINNER">{t("Principiante", "Beginner")}</option>
                <option value="INTERMEDIATE">{t("Intermedio", "Intermediate")}</option>
                <option value="ADVANCED">{t("Avanzado", "Advanced")}</option>
              </select>
              <select className="rounded-md border px-3 py-2 text-sm" value={courseForm.language} onChange={(e) => setCourseForm({ ...courseForm, language: e.target.value })}>
                <option value="es">Español</option>
                <option value="en">English</option>
              </select>
              <input className="rounded-md border px-3 py-2 text-sm" placeholder={t("Duración estimada (horas)", "Estimated duration (hours)")} value={courseForm.estimatedHours} onChange={(e) => setCourseForm({ ...courseForm, estimatedHours: e.target.value })} />
              <input className="rounded-md border px-3 py-2 text-sm" placeholder={t("Esfuerzo semanal (horas)", "Weekly effort (hours)")} value={courseForm.weeklyHours} onChange={(e) => setCourseForm({ ...courseForm, weeklyHours: e.target.value })} />
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={courseForm.certificateAvailable} onChange={(e) => setCourseForm({ ...courseForm, certificateAvailable: e.target.checked })} />
                {t("Certificado disponible", "Certificate available")}
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={courseForm.selfPaced} onChange={(e) => setCourseForm({ ...courseForm, selfPaced: e.target.checked })} />
                {t("Ritmo autodirigido", "Self-paced")}
              </label>
              <textarea className="rounded-md border px-3 py-2 text-sm" placeholder={t("Objetivos ES, uno por línea", "Objectives ES, one per line")} value={courseForm.learningObjectives.es} onChange={(e) => setCourseForm({ ...courseForm, learningObjectives: { ...courseForm.learningObjectives, es: e.target.value } })} />
              <textarea className="rounded-md border px-3 py-2 text-sm" placeholder={t("Objectives EN, one per line", "Objectives EN, one per line")} value={courseForm.learningObjectives.en} onChange={(e) => setCourseForm({ ...courseForm, learningObjectives: { ...courseForm.learningObjectives, en: e.target.value } })} />
              <textarea className="rounded-md border px-3 py-2 text-sm" placeholder={t("Público objetivo ES, uno por línea", "Target audience ES, one per line")} value={courseForm.targetAudience.es} onChange={(e) => setCourseForm({ ...courseForm, targetAudience: { ...courseForm.targetAudience, es: e.target.value } })} />
              <textarea className="rounded-md border px-3 py-2 text-sm" placeholder={t("Target audience EN, one per line", "Target audience EN, one per line")} value={courseForm.targetAudience.en} onChange={(e) => setCourseForm({ ...courseForm, targetAudience: { ...courseForm.targetAudience, en: e.target.value } })} />
              <textarea className="rounded-md border px-3 py-2 text-sm" placeholder={t("Requisitos ES, uno por línea", "Requirements ES, one per line")} value={courseForm.requirements.es} onChange={(e) => setCourseForm({ ...courseForm, requirements: { ...courseForm.requirements, es: e.target.value } })} />
              <textarea className="rounded-md border px-3 py-2 text-sm" placeholder={t("Requirements EN, one per line", "Requirements EN, one per line")} value={courseForm.requirements.en} onChange={(e) => setCourseForm({ ...courseForm, requirements: { ...courseForm.requirements, en: e.target.value } })} />
              <textarea className="rounded-md border px-3 py-2 text-sm" placeholder={t("Competencias ES, una por línea", "Competencies ES, one per line")} value={courseForm.competencies.es} onChange={(e) => setCourseForm({ ...courseForm, competencies: { ...courseForm.competencies, es: e.target.value } })} />
              <textarea className="rounded-md border px-3 py-2 text-sm" placeholder={t("Competencies EN, one per line", "Competencies EN, one per line")} value={courseForm.competencies.en} onChange={(e) => setCourseForm({ ...courseForm, competencies: { ...courseForm.competencies, en: e.target.value } })} />
              <select className="rounded-md border px-3 py-2 text-sm" value={courseForm.pricingModel} onChange={(e) => setCourseForm({ ...courseForm, pricingModel: e.target.value })}>
                <option value="FREE">Free</option>
                <option value="PAID">Paid</option>
              </select>
              <div className="grid grid-cols-2 gap-3">
                <input className="rounded-md border px-3 py-2 text-sm" placeholder="Precio" value={courseForm.price} onChange={(e) => setCourseForm({ ...courseForm, price: e.target.value })} />
                <select className="rounded-md border px-3 py-2 text-sm" value={courseForm.currency} onChange={(e) => setCourseForm({ ...courseForm, currency: e.target.value })}>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="CUP">CUP</option>
                </select>
              </div>
              <label className="text-sm">
                <span className="mb-1 block text-[#7b8fa1]">{t("Visibilidad", "Visibility")}</span>
                <select className="w-full rounded-md border px-3 py-2 text-sm" value={courseForm.visibility} onChange={(e) => setCourseForm({ ...courseForm, visibility: e.target.value })}>
                  <option value="PUBLIC">{t("Público: visible en el catálogo", "Public: visible in catalog")}</option>
                  <option value="ENROLLED_ONLY">{t("Solo personas matriculadas", "Enrolled learners only")}</option>
                  <option value="PRIVATE">{t("Privado: no visible en el catálogo", "Private: hidden from catalog")}</option>
                </select>
              </label>
            </div>
            <button onClick={saveCourse} disabled={saving} className="mt-4 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {t("Guardar curso", "Save course")}
            </button>
          </section>
          )}

          {selectedCourse && (
            <>
              {activeSection === "analytics" && (
              <section className="rounded-lg border bg-white p-5">
                <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-primary" />
                    <h2 className="font-semibold">{t("Analítica MOOC", "MOOC analytics")}</h2>
                  </div>
                  <button
                    onClick={() => loadAnalytics(selectedCourse.id)}
                    disabled={loadingAnalytics}
                    className="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs hover:bg-accent disabled:opacity-50"
                  >
                    {loadingAnalytics ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                    {t("Actualizar", "Refresh")}
                  </button>
                </div>

                {loadingAnalytics && !analytics ? (
                  <div className="rounded-md border border-dashed p-8 text-center text-sm text-[#7b8fa1]">
                    <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />
                    {t("Cargando métricas...", "Loading metrics...")}
                  </div>
                ) : !analytics ? (
                  <div className="rounded-md border border-dashed p-8 text-center text-sm text-[#7b8fa1]">
                    {t("Aún no hay métricas disponibles para este curso.", "No metrics available for this course yet.")}
                  </div>
                ) : (
                  <div className="space-y-6">
                    {renderAnalyticsCards(analytics.overall)}

                    <div className="rounded-md border p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium">{t("Visitas del curso", "Course views")}</p>
                          <p className="mt-1 text-xs text-[#7b8fa1]">{analytics.views.total} {t("visitas", "views")} · {analytics.views.unique} {t("visitantes únicos", "unique visitors")}</p>
                        </div>
                        <span className="text-xs text-[#7b8fa1]">{t("Últimos 30 días", "Last 30 days")}</span>
                      </div>
                      <div className="mt-5 flex h-32 items-end gap-1 border-b border-l border-[#d8e1ea] px-2 pb-0">
                        {(() => {
                          const maxViews = Math.max(...analytics.views.byDay.map((item) => item.views), 1);
                          return analytics.views.byDay.map((item) => (
                            <div key={item.day} className="group relative flex h-full flex-1 items-end" title={`${item.day}: ${item.views}`}>
                              <div className="w-full rounded-t-sm bg-primary/70 transition-colors group-hover:bg-primary" style={{ height: `${Math.max(item.views > 0 ? (item.views / maxViews) * 100 : 0, item.views > 0 ? 4 : 0)}%` }} />
                            </div>
                          ));
                        })()}
                      </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="rounded-md border p-4">
                        <p className="text-sm font-medium">{t("Estado de matrículas", "Enrollment status")}</p>
                        <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                          <span className="rounded-md bg-[#f7f9fb] px-3 py-2">{t("Pendientes", "Pending")} · {analytics.overall.pendingPayment}</span>
                          <span className="rounded-md bg-[#f7f9fb] px-3 py-2">{t("Suspendidas", "Suspended")} · {analytics.overall.suspended}</span>
                          <span className="rounded-md bg-[#f7f9fb] px-3 py-2">{t("Canceladas", "Cancelled")} · {analytics.overall.cancelled}</span>
                          <span className="rounded-md bg-[#f7f9fb] px-3 py-2">{t("Revocados", "Revoked")} · {analytics.overall.revokedCertificates}</span>
                        </div>
                      </div>
                      <div className="rounded-md border p-4">
                        <p className="text-sm font-medium">{t("Lectura rápida", "Quick read")}</p>
                        <p className="mt-2 text-sm text-[#52667a]">
                          {t(
                            `${analytics.overall.completionRate}% de los alumnos activos completó el curso y ${analytics.overall.passRate}% aprobó la evaluación.`,
                            `${analytics.overall.completionRate}% of active learners completed the course and ${analytics.overall.passRate}% passed the evaluation.`
                          )}
                        </p>
                        <p className="mt-2 text-sm text-[#52667a]">
                          {t(
                            `Se emitieron ${analytics.overall.certificatesIssued} certificados verificables.`,
                            `${analytics.overall.certificatesIssued} verifiable certificates were issued.`
                          )}
                        </p>
                      </div>
                    </div>

                    <div>
                      <h3 className="mb-3 text-sm font-semibold">{t("Por edición", "By edition")}</h3>
                      {analytics.editions.length === 0 ? (
                        <div className="rounded-md border border-dashed p-6 text-center text-sm text-[#7b8fa1]">
                          {t("Este curso no tiene ediciones configuradas.", "This course has no configured editions.")}
                        </div>
                      ) : (
                        <div className="overflow-x-auto rounded-md border">
                          <table className="w-full text-left text-sm">
                            <thead className="bg-[#f7f9fb] text-xs uppercase text-[#7b8fa1]">
                              <tr>
                                <th className="p-3">{t("Edición", "Edition")}</th>
                                <th className="p-3">{t("Activos", "Active")}</th>
                                <th className="p-3">{t("Progreso", "Progress")}</th>
                                <th className="p-3">{t("Finalización", "Completion")}</th>
                                <th className="p-3">{t("Aprobación", "Pass")}</th>
                                <th className="p-3">{t("Certificados", "Certificates")}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {analytics.editions.map((editionMetric) => (
                                <tr key={editionMetric.edition.id} className="border-t">
                                  <td className="p-3">
                                    <p className="font-medium">{t(editionMetric.edition.name.es, editionMetric.edition.name.en)}</p>
                                    <p className="text-xs text-[#7b8fa1]">{editionMetric.edition.status}{editionMetric.edition.isDefault ? ` · ${t("Defecto", "Default")}` : ""}</p>
                                  </td>
                                  <td className="p-3">{editionMetric.activeEnrollments}/{editionMetric.totalEnrollments}</td>
                                  <td className="p-3">{editionMetric.averageProgress}%</td>
                                  <td className="p-3">{editionMetric.completionRate}%</td>
                                  <td className="p-3">{editionMetric.passRate}%</td>
                                  <td className="p-3">{editionMetric.certificatesIssued}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>

                    {analytics.withoutEdition && (
                      <div>
                        <h3 className="mb-3 text-sm font-semibold">{t("Sin edición", "Without edition")}</h3>
                        {renderAnalyticsCards(analytics.withoutEdition)}
                      </div>
                    )}
                  </div>
                )}
              </section>
              )}

              {activeSection === "editions" && (
              <section className="rounded-lg border bg-white p-5">
                <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2">
                    <Layers className="h-5 w-5 text-primary" />
                    <h2 className="font-semibold">{t("Ediciones del curso", "Course editions")}</h2>
                  </div>
                  {editionForm.editionId && (
                    <button onClick={resetEditionForm} className="rounded-md border px-3 py-1.5 text-xs hover:bg-accent">
                      {t("Nueva edición", "New edition")}
                    </button>
                  )}
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <input className="rounded-md border px-3 py-2 text-sm" placeholder="Nombre ES" value={editionForm.name.es} onChange={(e) => setEditionForm({ ...editionForm, name: { ...editionForm.name, es: e.target.value } })} />
                  <input className="rounded-md border px-3 py-2 text-sm" placeholder="Name EN" value={editionForm.name.en} onChange={(e) => setEditionForm({ ...editionForm, name: { ...editionForm.name, en: e.target.value } })} />
                  <label className="text-sm">
                    <span className="mb-1 block text-[#7b8fa1]">{t("Inicio", "Start")}</span>
                    <input type="date" className="w-full rounded-md border px-3 py-2 text-sm" value={editionForm.startsAt} onChange={(e) => setEditionForm({ ...editionForm, startsAt: e.target.value })} />
                  </label>
                  <label className="text-sm">
                    <span className="mb-1 block text-[#7b8fa1]">{t("Fin", "End")}</span>
                    <input type="date" className="w-full rounded-md border px-3 py-2 text-sm" value={editionForm.endsAt} onChange={(e) => setEditionForm({ ...editionForm, endsAt: e.target.value })} />
                  </label>
                  <input className="rounded-md border px-3 py-2 text-sm" placeholder={t("Cupo", "Capacity")} value={editionForm.capacity} onChange={(e) => setEditionForm({ ...editionForm, capacity: e.target.value })} />
                  <select className="rounded-md border px-3 py-2 text-sm" value={editionForm.status} onChange={(e) => setEditionForm({ ...editionForm, status: e.target.value })}>
                    <option value="DRAFT">Draft</option>
                    <option value="SCHEDULED">Scheduled</option>
                    <option value="PUBLISHED">Published</option>
                    <option value="ARCHIVED">Archived</option>
                  </select>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={editionForm.isDefault} onChange={(e) => setEditionForm({ ...editionForm, isDefault: e.target.checked })} />
                    {t("Usar como edición por defecto", "Use as default edition")}
                  </label>
                </div>

                <button onClick={saveEdition} disabled={saving} className="mt-4 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {editionForm.editionId ? t("Guardar edición", "Save edition") : t("Agregar edición", "Add edition")}
                </button>

                <div className="mt-5 grid gap-5 xl:grid-cols-[360px_1fr]">
                  <div className="space-y-3">
                    {!selectedCourse.editions || selectedCourse.editions.length === 0 ? (
                      <div className="rounded-md border border-dashed p-6 text-center text-sm text-[#7b8fa1]">
                        {t("Aún no hay ediciones. Crea una edición para abrir matrículas por cohorte.", "No editions yet. Create an edition to open cohort-based enrollments.")}
                      </div>
                    ) : selectedCourse.editions.map((edition) => (
                      <button
                        key={edition.id}
                        onClick={() => {
                          setEditionForm({
                            editionId: edition.id,
                            name: edition.name,
                            startsAt: edition.startsAt ? edition.startsAt.slice(0, 10) : "",
                            endsAt: edition.endsAt ? edition.endsAt.slice(0, 10) : "",
                            capacity: edition.capacity ? String(edition.capacity) : "",
                            status: edition.status,
                            isDefault: edition.isDefault,
                          });
                          loadEditionEnrollments(edition.id);
                        }}
                        className={`w-full rounded-md border p-3 text-left text-sm hover:bg-accent ${selectedEditionId === edition.id ? "border-primary bg-primary/5" : ""}`}
                      >
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="font-medium">{t(edition.name.es, edition.name.en)}</p>
                            <p className="text-xs text-[#7b8fa1]">
                              {edition.status}
                              {edition.isDefault ? ` · ${t("por defecto", "default")}` : ""}
                              {edition.capacity ? ` · ${edition._count?.enrollments || 0}/${edition.capacity}` : ` · ${edition._count?.enrollments || 0} ${t("matrículas", "enrollments")}`}
                            </p>
                          </div>
                          <span className="text-xs text-primary">{t("Editar", "Edit")}</span>
                        </div>
                      </button>
                    ))}
                  </div>

                  <div className="rounded-md border">
                    <div className="flex items-center justify-between border-b p-3">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-primary" />
                        <h3 className="text-sm font-semibold">{t("Alumnos de la edición", "Edition students")}</h3>
                      </div>
                      {selectedEditionId && (
                        <button onClick={() => loadEditionEnrollments(selectedEditionId)} disabled={loadingEnrollments} className="rounded-md border px-3 py-1.5 text-xs hover:bg-accent disabled:opacity-50">
                          {loadingEnrollments ? t("Cargando...", "Loading...") : t("Actualizar", "Refresh")}
                        </button>
                      )}
                    </div>
                    {!selectedEditionId ? (
                      <div className="p-6 text-center text-sm text-[#7b8fa1]">
                        {t("Selecciona una edición para ver sus alumnos.", "Select an edition to see its students.")}
                      </div>
                    ) : loadingEnrollments ? (
                      <div className="p-8 text-center">
                        <Loader2 className="mx-auto h-5 w-5 animate-spin text-[#7b8fa1]" />
                      </div>
                    ) : (
                      <div>
                        <div className="border-b p-3">
                          <div className="grid gap-2 lg:grid-cols-[1fr_auto]">
                            <input
                              value={studentSearch}
                              onChange={(e) => setStudentSearch(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  searchStudents();
                                }
                              }}
                              placeholder={t("Buscar alumno por nombre o email", "Search student by name or email")}
                              className="rounded-md border px-3 py-2 text-sm"
                            />
                            <button
                              onClick={searchStudents}
                              disabled={searchingStudents || studentSearch.trim().length < 2}
                              className="inline-flex items-center justify-center gap-2 rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent disabled:opacity-50"
                            >
                              {searchingStudents ? <Loader2 className="h-4 w-4 animate-spin" /> : <Users className="h-4 w-4" />}
                              {t("Buscar", "Search")}
                            </button>
                          </div>
                          {studentResults.length > 0 && (
                            <div className="mt-3 grid gap-2 md:grid-cols-2">
                              {studentResults.map((student) => (
                                <button
                                  key={student.id}
                                  onClick={() => setManualEnrollmentEmail(student.email)}
                                  className={`rounded-md border p-3 text-left text-sm hover:bg-accent ${
                                    manualEnrollmentEmail === student.email ? "border-primary bg-primary/5" : ""
                                  }`}
                                >
                                  <span className="block font-medium">{student.name}</span>
                                  <span className="text-xs text-[#7b8fa1]">
                                    {student.email}
                                    {student.country ? ` · ${student.country}` : ""}
                                  </span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="grid gap-2 border-b p-3 lg:grid-cols-[1fr_170px_auto]">
                          <input
                            type="email"
                            value={manualEnrollmentEmail}
                            onChange={(e) => setManualEnrollmentEmail(e.target.value)}
                            placeholder={t("Email del alumno existente", "Existing student email")}
                            className="rounded-md border px-3 py-2 text-sm"
                          />
                          <select
                            value={manualEnrollmentStatus}
                            onChange={(e) => setManualEnrollmentStatus(e.target.value)}
                            className="rounded-md border bg-white px-3 py-2 text-sm"
                          >
                            <option value="ACTIVE">ACTIVE</option>
                            <option value="PENDING_PAYMENT">PENDING_PAYMENT</option>
                            <option value="SUSPENDED">SUSPENDED</option>
                            <option value="CANCELLED">CANCELLED</option>
                          </select>
                          <button
                            onClick={createManualEnrollment}
                            disabled={saving || !manualEnrollmentEmail.trim()}
                            className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                          >
                            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                            {t("Matricular", "Enroll")}
                          </button>
                        </div>

                        {editionEnrollments.length === 0 ? (
                          <div className="p-6 text-center text-sm text-[#7b8fa1]">
                            {t("No hay alumnos matriculados en esta edición.", "No students enrolled in this edition.")}
                          </div>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full">
                              <thead>
                                <tr className="bg-accent/50 text-left text-xs">
                                  <th className="p-3">{t("Alumno", "Student")}</th>
                                  <th className="p-3">{t("Progreso", "Progress")}</th>
                                  <th className="p-3">{t("Pago", "Payment")}</th>
                                  <th className="p-3">{t("Estado", "Status")}</th>
                                </tr>
                              </thead>
                              <tbody>
                                {editionEnrollments.map((enrollment) => {
                                  const payment = enrollment.payments?.[0];
                                  return (
                                    <tr key={enrollment.id} className="border-t align-top text-sm">
                                      <td className="p-3">
                                        <p className="font-medium">{enrollment.user.name}</p>
                                        <p className="text-xs text-[#7b8fa1]">{enrollment.user.email}</p>
                                        {enrollment.user.country && <p className="text-xs text-[#7b8fa1]">{enrollment.user.country}</p>}
                                      </td>
                                      <td className="p-3">{Math.round(enrollment.progress)}%</td>
                                      <td className="p-3 text-xs text-[#7b8fa1]">
                                        {payment ? `${payment.status} · ${Number(payment.amount)} ${payment.currency} · ${payment.method}` : t("Sin pago", "No payment")}
                                      </td>
                                      <td className="p-3">
                                        <select
                                          value={enrollment.status}
                                          onChange={(e) => updateEnrollmentStatus(enrollment.id, e.target.value)}
                                          disabled={saving}
                                          className="rounded-md border bg-white px-2 py-1 text-xs"
                                        >
                                          <option value="ACTIVE">ACTIVE</option>
                                          <option value="PENDING_PAYMENT">PENDING_PAYMENT</option>
                                          <option value="SUSPENDED">SUSPENDED</option>
                                          <option value="CANCELLED">CANCELLED</option>
                                        </select>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </section>
              )}

              {activeSection === "modules" && (
              <section className="rounded-lg border bg-white p-5">
                <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2">
                    <Layers className="h-5 w-5 text-primary" />
                    <h2 className="font-semibold">{t("Módulos", "Modules")}</h2>
                  </div>
                  {moduleForm.moduleId && (
                    <button onClick={resetModuleForm} className="rounded-md border px-3 py-1.5 text-xs hover:bg-accent">
                      {t("Nuevo módulo", "New module")}
                    </button>
                  )}
                </div>
                <div className="grid gap-3 md:grid-cols-[1fr_1fr_100px_140px]">
                  <input className="rounded-md border px-3 py-2 text-sm" placeholder="Módulo ES" value={moduleForm.title.es} onChange={(e) => setModuleForm({ ...moduleForm, title: { ...moduleForm.title, es: e.target.value } })} />
                  <input className="rounded-md border px-3 py-2 text-sm" placeholder="Module EN" value={moduleForm.title.en} onChange={(e) => setModuleForm({ ...moduleForm, title: { ...moduleForm.title, en: e.target.value } })} />
                  <input className="rounded-md border px-3 py-2 text-sm" placeholder="Orden" value={moduleForm.order} onChange={(e) => setModuleForm({ ...moduleForm, order: e.target.value })} />
                  <button onClick={saveModule} disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
                    <Plus className="h-4 w-4" />
                    {moduleForm.moduleId ? t("Actualizar", "Update") : t("Agregar", "Add")}
                  </button>
                  <textarea className="rounded-md border px-3 py-2 text-sm md:col-span-2" placeholder={t("Descripción u objetivo del módulo ES", "Module description or objective ES")} value={moduleForm.description.es} onChange={(e) => setModuleForm({ ...moduleForm, description: { ...moduleForm.description, es: e.target.value } })} />
                  <textarea className="rounded-md border px-3 py-2 text-sm md:col-span-2" placeholder={t("Description or objective EN", "Description or objective EN")} value={moduleForm.description.en} onChange={(e) => setModuleForm({ ...moduleForm, description: { ...moduleForm.description, en: e.target.value } })} />
                </div>
                <div className="mt-4 space-y-3">
                  {selectedCourse.modules.length === 0 ? (
                    <div className="rounded-md border border-dashed p-6 text-center text-sm text-[#7b8fa1]">
                      {t("Aún no hay módulos. Crea el primer bloque académico del curso.", "No modules yet. Create the first academic block for the course.")}
                    </div>
                  ) : selectedCourse.modules.map((module) => (
                    <div key={module.id} className="rounded-md border p-3">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="font-medium">{module.order}. {t(module.title.es, module.title.en)}</p>
                          {module.description && (module.description.es || module.description.en) && (
                            <p className="mt-1 text-xs text-[#52667a]">{t(module.description.es || "", module.description.en || "")}</p>
                          )}
                          <p className="text-xs text-[#7b8fa1]">{module.sessions.length} {t("sesiones", "sessions")}</p>
                        </div>
                        <button onClick={() => setModuleForm({ moduleId: module.id, title: module.title, description: module.description || { ...emptyText }, order: String(module.order), status: module.status })} className="rounded-md border px-3 py-1.5 text-xs hover:bg-accent">
                          {t("Editar módulo", "Edit module")}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
              )}

              {activeSection === "sessions" && (
              <section className="rounded-lg border bg-white p-5">
                <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2">
                    <Video className="h-5 w-5 text-primary" />
                    <h2 className="font-semibold">{t("Sesiones y videos", "Sessions and videos")}</h2>
                  </div>
                  {sessionForm.sessionId && (
                    <button onClick={() => resetSessionForm()} className="rounded-md border px-3 py-1.5 text-xs hover:bg-accent">
                      {t("Nueva sesión", "New session")}
                    </button>
                  )}
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <select className="rounded-md border px-3 py-2 text-sm" value={sessionForm.moduleId} onChange={(e) => setSessionForm({ ...sessionForm, moduleId: e.target.value })}>
                    <option value="">{t("Sin módulo", "No module")}</option>
                    {selectedCourse.modules.map((module) => (
                      <option key={module.id} value={module.id}>{module.order}. {t(module.title.es, module.title.en)}</option>
                    ))}
                  </select>
                  <div className="rounded-md border bg-[#f7f9fb] px-3 py-2 text-sm text-[#52667a]">
                    <span className="font-medium text-[#17212b]">{t("Sesión grabada", "Recorded session")}</span>
                    <span className="ml-2 text-xs">{t("Las modalidades en vivo e híbrida se habilitarán en una etapa posterior.", "Live and hybrid modes will be enabled in a later stage.")}</span>
                  </div>
                  <input className="rounded-md border px-3 py-2 text-sm" placeholder="Sesión ES" value={sessionForm.title.es} onChange={(e) => setSessionForm({ ...sessionForm, title: { ...sessionForm.title, es: e.target.value } })} />
                  <input className="rounded-md border px-3 py-2 text-sm" placeholder="Session EN" value={sessionForm.title.en} onChange={(e) => setSessionForm({ ...sessionForm, title: { ...sessionForm.title, en: e.target.value } })} />
                  <div className="grid grid-cols-[1fr_90px] gap-3">
                    <select className="rounded-md border px-3 py-2 text-sm" value={sessionForm.videoPlatform} onChange={(e) => setSessionForm({ ...sessionForm, videoPlatform: e.target.value })}>
                      <option value="YOUTUBE">YouTube</option>
                      <option value="VIMEO">Vimeo</option>
                      <option value="LOCAL_UPLOAD">{t("Subido", "Uploaded")}</option>
                      <option value="EXTERNAL">{t("Otro enlace", "Other link")}</option>
                    </select>
                    <input className="rounded-md border px-3 py-2 text-sm" placeholder="Orden" value={sessionForm.order} onChange={(e) => setSessionForm({ ...sessionForm, order: e.target.value })} />
                  </div>
                  <input className="rounded-md border px-3 py-2 text-sm" placeholder={t("Duración min.", "Duration min.")} value={sessionForm.durationMinutes} onChange={(e) => setSessionForm({ ...sessionForm, durationMinutes: e.target.value })} />
                  <input className="rounded-md border px-3 py-2 text-sm" placeholder={t("URL externa o URL generada al subir", "External URL or generated upload URL")} value={sessionForm.videoUrl} onChange={(e) => setSessionForm({ ...sessionForm, videoUrl: e.target.value })} />
                  <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-accent">
                    {uploadingVideo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    {uploadingVideo ? t("Subiendo...", "Uploading...") : t("Subir video", "Upload video")}
                    <input type="file" accept="video/mp4,video/webm,video/quicktime,video/x-m4v" className="hidden" onChange={(e) => uploadVideo(e.target.files?.[0] || null)} />
                  </label>
                  <div className="grid grid-cols-[1fr_90px] gap-3">
                    <select className="rounded-md border px-3 py-2 text-sm" value={sessionForm.audioPlatform} onChange={(e) => setSessionForm({ ...sessionForm, audioPlatform: e.target.value })}>
                      <option value="EXTERNAL">{t("Audio externo", "External audio")}</option>
                      <option value="REPOSITORY">{t("Repositorio", "Repository")}</option>
                      <option value="LOCAL_UPLOAD">{t("Subido", "Uploaded")}</option>
                    </select>
                    <span className="flex items-center justify-center gap-1 text-xs text-[#7b8fa1]"><Headphones className="h-4 w-4" /> MP3</span>
                  </div>
                  <input className="rounded-md border px-3 py-2 text-sm" placeholder={t("URL externa o URL generada al subir el audio", "External URL or generated audio URL")} value={sessionForm.audioUrl} onChange={(e) => setSessionForm({ ...sessionForm, audioUrl: e.target.value })} />
                  <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-accent">
                    {uploadingAudio ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    {uploadingAudio ? t("Subiendo...", "Uploading...") : t("Subir audio", "Upload audio")}
                    <input type="file" accept="audio/mpeg,audio/mp4,audio/x-m4a,audio/ogg,audio/wav,audio/x-wav" className="hidden" onChange={(e) => uploadAudio(e.target.files?.[0] || null)} />
                  </label>
                  <textarea className="rounded-md border px-3 py-2 text-sm md:col-span-2" placeholder={t("Descripción de la sesión ES", "Session description ES")} value={sessionForm.description.es} onChange={(e) => setSessionForm({ ...sessionForm, description: { ...sessionForm.description, es: e.target.value } })} />
                  <textarea className="rounded-md border px-3 py-2 text-sm md:col-span-2" placeholder={t("Session description EN", "Session description EN")} value={sessionForm.description.en} onChange={(e) => setSessionForm({ ...sessionForm, description: { ...sessionForm.description, en: e.target.value } })} />
                  <p className="text-xs text-[#7b8fa1] md:col-span-2">
                    {t("El video y el audio son opcionales. Una sesión puede usar uno de los dos como contenido principal, o ser de lectura, material o actividad.", "Video and audio are optional. A session can use either as its primary content, or be a reading, resource or activity session.")}
                  </p>
                  <textarea className="rounded-md border px-3 py-2 text-sm md:col-span-2" placeholder={t("Actividad de práctica ES", "Practice activity ES")} value={sessionForm.practicePrompt.es} onChange={(e) => setSessionForm({ ...sessionForm, practicePrompt: { ...sessionForm.practicePrompt, es: e.target.value } })} />
                  <textarea className="rounded-md border px-3 py-2 text-sm md:col-span-2" placeholder={t("Actividad de práctica EN", "Practice activity EN")} value={sessionForm.practicePrompt.en} onChange={(e) => setSessionForm({ ...sessionForm, practicePrompt: { ...sessionForm.practicePrompt, en: e.target.value } })} />
                  <div className="space-y-3 rounded-md border p-3 md:col-span-2">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-medium">{t("Materiales complementarios", "Complementary resources")}</p>
                        <p className="mt-1 text-xs text-[#7b8fa1]">
                          {t("Añade lecturas, presentaciones, archivos o enlaces. Se guardarán al pulsar «Guardar sesión».", "Add readings, presentations, files or links. They are saved when you click \"Save session\".")}
                        </p>
                      </div>
                      <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-accent">
                        {uploadingResource ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                        {uploadingResource ? t("Subiendo...", "Uploading...") : t("Subir material", "Upload resource")}
                        <input type="file" accept=".pdf,.zip,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.csv,.png,.jpg,.jpeg,.webp,.mp3,.m4a,.ogg,.wav" className="hidden" onChange={(e) => uploadResource(e.target.files?.[0] || null)} />
                      </label>
                    </div>
                    <div className="grid gap-2 md:grid-cols-[1fr_1fr_130px_150px_auto]">
                      <input className="rounded-md border px-3 py-2 text-sm" placeholder={t("Título del recurso", "Resource title")} value={resourceForm.title} onChange={(e) => setResourceForm({ ...resourceForm, title: e.target.value })} />
                      <input className="rounded-md border px-3 py-2 text-sm" placeholder={t("URL externa o repositorio", "External or repository URL")} value={resourceForm.url} onChange={(e) => setResourceForm({ ...resourceForm, url: e.target.value })} />
                      <select className="rounded-md border px-3 py-2 text-sm" value={resourceForm.type} onChange={(e) => setResourceForm({ ...resourceForm, type: e.target.value })}>
                        <option value="LINK">Link</option>
                        <option value="PDF">PDF</option>
                        <option value="READING">{t("Lectura", "Reading")}</option>
                        <option value="SLIDES">{t("Diapositivas", "Slides")}</option>
                        <option value="AUDIO">{t("Audio", "Audio")}</option>
                        <option value="DATASET">Dataset</option>
                        <option value="OTHER">{t("Otro", "Other")}</option>
                      </select>
                      <select className="rounded-md border px-3 py-2 text-sm" value={resourceForm.source} onChange={(e) => setResourceForm({ ...resourceForm, source: e.target.value as SessionResource["source"] })}>
                        <option value="EXTERNAL">{t("Externo", "External")}</option>
                        <option value="REPOSITORY">{t("Repositorio", "Repository")}</option>
                      </select>
                      <button type="button" onClick={addResource} className="inline-flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-accent">
                        <Plus className="h-4 w-4" />
                        {t("Agregar", "Add")}
                      </button>
                    </div>
                    {resourceNotice && (
                      <p className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-800">{resourceNotice}</p>
                    )}
                    {sessionForm.resources.length > 0 && (
                      <div className="space-y-2">
                        {sessionForm.resources.map((resource, resourceIndex) => (
                          <div key={`${resource.id || resource.url || resource.title || "resource"}-${resourceIndex}`} className="flex flex-col gap-2 rounded-md bg-[#f7f9fb] p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                            <div className="min-w-0">
                              <a href={resource.url} target="_blank" rel="noopener noreferrer" className="inline-flex max-w-full items-center gap-1 font-medium text-primary underline">
                                <span className="truncate">{resource.title}</span>
                                <ExternalLink className="h-3.5 w-3.5 flex-shrink-0" />
                              </a>
                              <p className="mt-1 text-xs text-[#7b8fa1]">{resource.type} · {resource.source}</p>
                            </div>
                            <button type="button" onClick={() => removeResource(resource.id, resourceIndex)} className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs text-red-600 hover:bg-red-50">
                              <Trash2 className="h-3.5 w-3.5" />
                              {t("Quitar", "Remove")}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    <p className="text-xs text-[#7b8fa1]">
                      {t("Usa enlaces a repositorios de objetos de aprendizaje cuando existan; la subida local queda para materiales propios o cerrados.", "Use learning-object repository links when available; local upload is for owned or restricted materials.")}
                    </p>
                    <p className="text-xs text-[#7b8fa1]">
                      {t("Límite técnico de recursos: 50 MB. Se admiten PDF, documentos, presentaciones, ZIP, imágenes y audio MP3/M4A/OGG/WAV.", "Technical resource limit: 50 MB. PDF, documents, presentations, ZIP, images and MP3/M4A/OGG/WAV audio are supported.")}
                    </p>
                  </div>
                  {videoPreview && (
                    <div className="overflow-hidden rounded-md border bg-black md:col-span-2">
                      {videoPreview.type === "external" ? (
                        <iframe
                          src={videoPreview.embedUrl}
                          title={t("Vista previa del video", "Video preview")}
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                          allowFullScreen
                          className="aspect-video w-full"
                        />
                      ) : videoPreview.type === "file" ? (
                        <video src={videoPreview.url} controls preload="metadata" className="aspect-video w-full bg-black" />
                      ) : (
                        <div className="p-4">
                          <a href={videoPreview.url} target="_blank" rel="noopener noreferrer" className="text-sm text-white underline">
                            {t("Abrir video", "Open video")}
                          </a>
                        </div>
                      )}
                    </div>
                  )}
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={sessionForm.preview} onChange={(e) => setSessionForm({ ...sessionForm, preview: e.target.checked })} />
                    {t("Vista previa gratuita", "Free preview")}
                  </label>
                </div>
                <button onClick={saveSession} disabled={saving} className="mt-4 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
                  <Save className="h-4 w-4" />
                  {sessionForm.sessionId ? t("Guardar sesión", "Save session") : t("Agregar sesión", "Add session")}
                </button>

                <div className="mt-5 space-y-4">
                  {selectedSessionCount === 0 && (
                    <div className="rounded-md border border-dashed p-6 text-center text-sm text-[#7b8fa1]">
                      {t("Aún no hay sesiones. Puedes añadir una sesión con video, lectura, material o actividad.", "No sessions yet. You can add a session with a video, reading, resource or activity.")}
                    </div>
                  )}
                  {selectedCourse.sessions && selectedCourse.sessions.length > 0 && (
                    <div>
                      <h3 className="mb-2 text-sm font-semibold">{t("Sin módulo", "No module")}</h3>
                      <div className="space-y-2">
                        {selectedCourse.sessions.map((session) => (
                          <div key={session.id} className="flex flex-col gap-2 rounded-md border p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <span className="font-medium">{session.order}. {t(session.title.es, session.title.en)}</span>
                              <span className="ml-2 text-xs text-[#7b8fa1]">{session.status === "ARCHIVED" ? t("ARCHIVADA", "ARCHIVED") : session.videoPlatform || (session.audioPlatform ? t("Audio", "Audio") : t("Sin video/audio", "No video/audio"))}</span>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => setSessionForm({
                                  sessionId: session.id,
                                  moduleId: "",
                                  title: session.title,
                                  description: session.description,
                                  sessionType: "RECORDED",
                                  preview: session.preview,
                                  videoUrl: session.videoUrl || "",
                                  videoPlatform: session.videoPlatform || "",
                                  audioUrl: session.audioUrl || "",
                                  audioPlatform: session.audioPlatform || "",
                                  durationMinutes: session.durationMinutes ? String(session.durationMinutes) : "",
                                  resources: Array.isArray(session.resources) ? session.resources : [],
                                  practicePrompt: session.practicePrompt || { ...emptyText },
                                  order: String(session.order),
                                })}
                                className="rounded-md border px-3 py-1.5 text-xs hover:bg-accent"
                              >
                                {t("Editar", "Edit")}
                              </button>
                              {session.status !== "ARCHIVED" && (
                                <button
                                  onClick={() => archiveSession(session.id)}
                                  disabled={saving}
                                  className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs text-amber-700 hover:bg-amber-50 disabled:opacity-50"
                                >
                                  <Archive className="h-3.5 w-3.5" />
                                  {t("Archivar", "Archive")}
                                </button>
                              )}
                              {(session.status === "DRAFT" || session.status === "ARCHIVED") && (
                                <button
                                  onClick={() => deleteSession(session.id)}
                                  disabled={saving}
                                  className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                  {t("Eliminar", "Delete")}
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {selectedCourse.modules.map((module) => (
                    <div key={module.id}>
                      <h3 className="mb-2 text-sm font-semibold">{module.order}. {t(module.title.es, module.title.en)}</h3>
                      <div className="space-y-2">
                        {module.sessions.map((session) => (
                          <div key={session.id} className="flex flex-col gap-2 rounded-md border p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <span className="font-medium">{session.order}. {t(session.title.es, session.title.en)}</span>
                              <span className="ml-2 text-xs text-[#7b8fa1]">{session.status === "ARCHIVED" ? t("ARCHIVADA", "ARCHIVED") : session.videoPlatform || (session.audioPlatform ? t("Audio", "Audio") : t("Sin video/audio", "No video/audio"))}</span>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => setSessionForm({
                                  sessionId: session.id,
                                  moduleId: module.id,
                                  title: session.title,
                                  description: session.description,
                                  sessionType: "RECORDED",
                                  preview: session.preview,
                                  videoUrl: session.videoUrl || "",
                                  videoPlatform: session.videoPlatform || "",
                                  audioUrl: session.audioUrl || "",
                                  audioPlatform: session.audioPlatform || "",
                                  durationMinutes: session.durationMinutes ? String(session.durationMinutes) : "",
                                  resources: Array.isArray(session.resources) ? session.resources : [],
                                  practicePrompt: session.practicePrompt || { ...emptyText },
                                  order: String(session.order),
                                })}
                                className="rounded-md border px-3 py-1.5 text-xs hover:bg-accent"
                              >
                                {t("Editar", "Edit")}
                              </button>
                              {session.status !== "ARCHIVED" && (
                                <button
                                  onClick={() => archiveSession(session.id)}
                                  disabled={saving}
                                  className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs text-amber-700 hover:bg-amber-50 disabled:opacity-50"
                                >
                                  <Archive className="h-3.5 w-3.5" />
                                  {t("Archivar", "Archive")}
                                </button>
                              )}
                              {(session.status === "DRAFT" || session.status === "ARCHIVED") && (
                                <button
                                  onClick={() => deleteSession(session.id)}
                                  disabled={saving}
                                  className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                  {t("Eliminar", "Delete")}
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
              )}

              {activeSection === "questionBank" && (
              <section className="rounded-lg border bg-white p-5">
                <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-primary" />
                    <h2 className="font-semibold">{t("Banco de preguntas", "Question bank")}</h2>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={startNewBankQuestion} className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-white hover:opacity-90">
                      <Plus className="h-3.5 w-3.5" />
                      {t("Nueva pregunta", "New question")}
                    </button>
                    <button onClick={() => loadQuestionBank(selectedCourse.id)} disabled={loadingQuestionBank} className="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs hover:bg-accent disabled:opacity-50">
                      {loadingQuestionBank ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                      {t("Actualizar", "Refresh")}
                    </button>
                  </div>
                </div>
                <p className="mb-4 text-sm leading-6 text-[#52667a]">
                  {t("Crea y organiza aquí las preguntas reutilizables. Después selecciónalas para construir evaluaciones finales o parciales.", "Create and organize reusable questions here. Then select them to build final or partial assessments.")}
                </p>
                {bankNotice && <p className="mb-4 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-800">{bankNotice}</p>}
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-md border p-4">
                    <p className="text-xs text-[#7b8fa1]">{t("Preguntas reutilizables", "Reusable questions")}</p>
                    <p className="mt-1 text-2xl font-semibold">{questionBank.length}</p>
                  </div>
                  <button onClick={saveQuestionBankFromEvaluation} disabled={saving || evaluationForm.questions.length === 0} className="inline-flex items-center justify-center gap-2 rounded-md border p-4 text-sm font-medium hover:bg-accent disabled:opacity-50">
                    <Save className="h-4 w-4" />
                    {t("Importar preguntas de la evaluación", "Import evaluation questions")}
                  </button>
                  <button onClick={loadBankIntoEvaluation} disabled={questionBank.length === 0} className="inline-flex items-center justify-center gap-2 rounded-md bg-primary p-4 text-sm font-medium text-white disabled:opacity-50">
                    <Plus className="h-4 w-4" />
                    {t("Añadir selección a evaluación", "Add selection to assessment")}
                  </button>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-6">
                  <input className="rounded-md border px-3 py-2 text-sm" placeholder={t("Cantidad", "Count")} value={bankSelection.count} onChange={(e) => setBankSelection({ ...bankSelection, count: e.target.value })} />
                  <input className="rounded-md border px-3 py-2 text-sm" placeholder={t("Etiqueta", "Tag")} value={bankSelection.tag} onChange={(e) => setBankSelection({ ...bankSelection, tag: e.target.value })} />
                  <select className="rounded-md border px-3 py-2 text-sm" value={bankSelection.difficulty} onChange={(e) => setBankSelection({ ...bankSelection, difficulty: e.target.value })}>
                    <option value="">{t("Cualquier dificultad", "Any difficulty")}</option>
                    <option value="BASIC">{t("Básica", "Basic")}</option>
                    <option value="INTERMEDIATE">{t("Intermedia", "Intermediate")}</option>
                    <option value="ADVANCED">{t("Avanzada", "Advanced")}</option>
                  </select>
                  <select className="rounded-md border px-3 py-2 text-sm" value={bankSelection.moduleId} onChange={(e) => setBankSelection({ ...bankSelection, moduleId: e.target.value })}>
                    <option value="">{t("Cualquier módulo", "Any module")}</option>
                    {selectedCourse.modules.map((module) => (
                      <option key={module.id} value={module.id}>{module.order}. {t(module.title.es, module.title.en)}</option>
                    ))}
                  </select>
                  <input className="rounded-md border px-3 py-2 text-sm" placeholder={t("Tema", "Topic")} value={bankSelection.topic} onChange={(e) => setBankSelection({ ...bankSelection, topic: e.target.value })} />
                  <select className="rounded-md border px-3 py-2 text-sm" value={bankSelection.selectionMode} onChange={(e) => setBankSelection({ ...bankSelection, selectionMode: e.target.value as BankSelectionState["selectionMode"] })}>
                    <option value="FIXED">{t("Selección fija", "Fixed selection")}</option>
                    <option value="RANDOM">{t("Selección aleatoria", "Random selection")}</option>
                  </select>
                </div>
                <div className="mt-3 flex flex-col gap-3 rounded-md border border-primary/20 bg-[#f7fbff] p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-medium text-[#17212b]">{t("Selección manual de preguntas", "Manual question selection")}</p>
                    <p className="mt-1 text-xs text-[#52667a]">{t("Marca las preguntas que quieres añadir. Si no marcas ninguna, se aplicarán la cantidad y los filtros definidos arriba.", "Mark the questions you want to add. If none are marked, the count and filters above will be used.")}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-medium text-[#52667a]">{selectedBankQuestionIds.length} {t("seleccionadas", "selected")}</span>
                    <button
                      type="button"
                      onClick={() => setSelectedBankQuestionIds((current) => Array.from(new Set([...current, ...getFilteredBankQuestions().map((question) => question.id)])))}
                      disabled={getFilteredBankQuestions().length === 0}
                      className="rounded-md border px-3 py-1.5 text-xs hover:bg-accent disabled:opacity-50"
                    >
                      {t("Seleccionar coincidencias", "Select matches")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedBankQuestionIds([])}
                      disabled={selectedBankQuestionIds.length === 0}
                      className="rounded-md border px-3 py-1.5 text-xs hover:bg-accent disabled:opacity-50"
                    >
                      {t("Limpiar", "Clear")}
                    </button>
                  </div>
                </div>
                {bankQuestionForm && (
                  <div className="mt-5 rounded-md border border-primary/30 bg-[#f7fbff] p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-semibold">{t("Editar pregunta del banco", "Edit bank question")}</h3>
                        <p className="mt-1 text-xs text-[#7b8fa1]">{t("Esta pregunta podrá reutilizarse en varias evaluaciones.", "This question can be reused in several assessments.")}</p>
                      </div>
                      <button type="button" onClick={() => setBankQuestionForm(null)} className="rounded-md border px-3 py-1.5 text-xs hover:bg-accent">{t("Cancelar", "Cancel")}</button>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <select className="rounded-md border px-3 py-2 text-sm" value={bankQuestionForm.type} onChange={(e) => {
                        const nextType = e.target.value as QuestionType;
                        updateBankQuestion({
                          type: nextType,
                          options: nextType === "MCQ" ? [{ ...emptyText }, { ...emptyText }] : [],
                          correctAnswer: nextType === "TRUEFALSE" ? "true" : "",
                        });
                      }}>
                        <option value="MCQ">{t("Selección múltiple", "Multiple choice")}</option>
                        <option value="TRUEFALSE">{t("Verdadero/Falso", "True/False")}</option>
                        <option value="SHORT">{t("Respuesta corta", "Short answer")}</option>
                      </select>
                      <input className="rounded-md border px-3 py-2 text-sm" type="number" min="1" placeholder={t("Puntos", "Points")} value={bankQuestionForm.points} onChange={(e) => updateBankQuestion({ points: Number(e.target.value || 1) })} />
                      <input className="rounded-md border px-3 py-2 text-sm" placeholder="Pregunta ES" value={bankQuestionForm.question.es} onChange={(e) => updateBankQuestion({ question: { ...bankQuestionForm.question, es: e.target.value } })} />
                      <input className="rounded-md border px-3 py-2 text-sm" placeholder="Question EN" value={bankQuestionForm.question.en} onChange={(e) => updateBankQuestion({ question: { ...bankQuestionForm.question, en: e.target.value } })} />
                      <select className="rounded-md border px-3 py-2 text-sm" value={bankQuestionForm.difficulty || "BASIC"} onChange={(e) => updateBankQuestion({ difficulty: e.target.value as CmsQuestion["difficulty"] })}>
                        <option value="BASIC">{t("Básica", "Basic")}</option>
                        <option value="INTERMEDIATE">{t("Intermedia", "Intermediate")}</option>
                        <option value="ADVANCED">{t("Avanzada", "Advanced")}</option>
                      </select>
                      <select className="rounded-md border px-3 py-2 text-sm" value={bankQuestionForm.moduleId || ""} onChange={(e) => updateBankQuestion({ moduleId: e.target.value })}>
                        <option value="">{t("Sin módulo asociado", "No linked module")}</option>
                        {selectedCourse.modules.map((module) => <option key={module.id} value={module.id}>{module.order}. {t(module.title.es, module.title.en)}</option>)}
                      </select>
                      <input className="rounded-md border px-3 py-2 text-sm" placeholder={t("Tema", "Topic")} value={bankQuestionForm.topic || ""} onChange={(e) => updateBankQuestion({ topic: e.target.value })} />
                      <input className="rounded-md border px-3 py-2 text-sm" placeholder={t("Etiquetas separadas por coma", "Comma-separated tags")} value={(bankQuestionForm.tags || []).join(", ")} onChange={(e) => updateBankQuestion({ tags: e.target.value.split(",").map((tag) => tag.trim()).filter(Boolean) })} />
                    </div>
                    {bankQuestionForm.type === "MCQ" && (
                      <div className="mt-3 space-y-2">
                        {bankQuestionForm.options.map((option, optionIndex) => (
                          <div key={`bank-option-${optionIndex}`} className="grid gap-2 md:grid-cols-[1fr_1fr_auto]">
                            <input className="rounded-md border px-3 py-2 text-sm" placeholder={`Opción ${optionIndex + 1} ES`} value={option.es} onChange={(e) => updateBankQuestionOption(optionIndex, { ...option, es: e.target.value })} />
                            <input className="rounded-md border px-3 py-2 text-sm" placeholder={`Option ${optionIndex + 1} EN`} value={option.en} onChange={(e) => updateBankQuestionOption(optionIndex, { ...option, en: e.target.value })} />
                            <button type="button" onClick={() => updateBankQuestion({ correctAnswer: option.es || option.en })} className={`rounded-md border px-3 py-2 text-xs ${bankQuestionForm.correctAnswer === (option.es || option.en) ? "bg-primary text-white" : "hover:bg-accent"}`}>{t("Correcta", "Correct")}</button>
                          </div>
                        ))}
                        <button type="button" onClick={() => updateBankQuestion({ options: [...bankQuestionForm.options, { ...emptyText }] })} className="rounded-md border px-3 py-1.5 text-xs hover:bg-accent">{t("Agregar opción", "Add option")}</button>
                      </div>
                    )}
                    {bankQuestionForm.type === "TRUEFALSE" && (
                      <select className="mt-3 rounded-md border px-3 py-2 text-sm" value={bankQuestionForm.correctAnswer} onChange={(e) => updateBankQuestion({ correctAnswer: e.target.value })}>
                        <option value="true">{t("Verdadero", "True")}</option>
                        <option value="false">{t("Falso", "False")}</option>
                      </select>
                    )}
                    {bankQuestionForm.type === "SHORT" && <input className="mt-3 w-full rounded-md border px-3 py-2 text-sm" placeholder={t("Respuesta correcta", "Correct answer")} value={bankQuestionForm.correctAnswer} onChange={(e) => updateBankQuestion({ correctAnswer: e.target.value })} />}
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <textarea className="rounded-md border px-3 py-2 text-sm" placeholder={t("Retroalimentación ES", "Feedback ES")} value={bankQuestionForm.feedback.es} onChange={(e) => updateBankQuestion({ feedback: { ...bankQuestionForm.feedback, es: e.target.value } })} />
                      <textarea className="rounded-md border px-3 py-2 text-sm" placeholder={t("Retroalimentación EN", "Feedback EN")} value={bankQuestionForm.feedback.en} onChange={(e) => updateBankQuestion({ feedback: { ...bankQuestionForm.feedback, en: e.target.value } })} />
                    </div>
                    <button type="button" onClick={() => void saveBankQuestion()} disabled={saving} className="mt-4 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
                      <Save className="h-4 w-4" />
                      {t("Guardar pregunta", "Save question")}
                    </button>
                  </div>
                )}

                <div className="mt-5 space-y-2">
                  {questionBank.length === 0 ? (
                    <div className="rounded-md border border-dashed p-6 text-center text-sm text-[#7b8fa1]">
                      {t("El banco está vacío. Pulsa «Nueva pregunta» para comenzar.", "The bank is empty. Click “New question” to begin.")}
                    </div>
                  ) : getFilteredBankQuestions().length === 0 ? (
                    <div className="rounded-md border border-dashed p-6 text-center text-sm text-[#7b8fa1]">
                      {t("No hay preguntas que coincidan con los filtros actuales.", "No questions match the current filters.")}
                    </div>
                      ) : getFilteredBankQuestions().map((question, index) => (
                    <div key={question.id || index} className="rounded-md border p-3 text-sm">
                      <div className="flex items-start gap-3">
                        {(() => {
                          const alreadySelected = evaluationForm.questions.some((item) => item.id === question.id);
                          return (
                        <input
                          type="checkbox"
                          checked={alreadySelected || selectedBankQuestionIds.includes(question.id)}
                          disabled={alreadySelected}
                          onChange={() => setSelectedBankQuestionIds((current) => current.includes(question.id)
                            ? current.filter((id) => id !== question.id)
                            : [...current, question.id])}
                          aria-label={t(`Seleccionar pregunta ${index + 1}`, `Select question ${index + 1}`)}
                          className="mt-1 h-4 w-4 shrink-0 accent-primary disabled:cursor-not-allowed disabled:opacity-50"
                        />
                          );
                        })()}
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                            <p className="font-medium">{index + 1}. {t(question.question.es, question.question.en)}</p>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-[#7b8fa1]">{question.type} · {question.points} pt</span>
                              <button type="button" onClick={() => editBankQuestion(question)} className="rounded-md border px-2 py-1 text-xs hover:bg-accent">{t("Editar", "Edit")}</button>
                              <button type="button" onClick={() => void deleteBankQuestion(question.id)} disabled={saving} className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50"><Trash2 className="h-3 w-3" />{t("Eliminar", "Delete")}</button>
                            </div>
                          </div>
                          <p className="mt-1 text-xs text-[#7b8fa1]">
                            {[question.difficulty || "BASIC", question.topic, question.moduleId ? selectedCourse.modules.find((module) => module.id === question.moduleId)?.title.es : "", ...(question.tags || [])].filter(Boolean).join(" · ")}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
              )}

              {activeSection === "evaluation" && (
              <section className="rounded-lg border bg-white p-5">
                <div className="mb-4 flex items-center gap-2">
                  <Award className="h-5 w-5 text-primary" />
                  <h2 className="font-semibold">{t("Evaluación", "Evaluation")}</h2>
                </div>
                {partialEvaluations.length > 0 && (
                  <div className="mb-5 rounded-md border p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-semibold">{t("Evaluaciones por sesión", "Session assessments")}</h3>
                        <p className="mt-1 text-xs text-[#7b8fa1]">{t("Puedes quitar una autoevaluación o evaluación parcial sin afectar la evaluación final.", "You can remove a self-assessment or partial assessment without affecting the final assessment.")}</p>
                      </div>
                      <span className="text-xs text-[#7b8fa1]">{partialEvaluations.length}</span>
                    </div>
                    <div className="space-y-2">
                      {partialEvaluations.map((evaluation) => (
                        <div key={evaluation.id} className="flex flex-col gap-2 rounded-md bg-[#f7f9fb] p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="font-medium">{t(evaluation.title.es, evaluation.title.en)}</p>
                            <p className="mt-1 text-xs text-[#7b8fa1]">
                              {evaluation.evaluationType === "AUTOEVALUATION" ? t("Autoevaluación", "Self-assessment") : t("Evaluación parcial", "Partial assessment")}
                              {evaluation.session ? ` · ${t(evaluation.session.title.es, evaluation.session.title.en)}` : ""}
                            </p>
                          </div>
                          <button type="button" onClick={() => void deletePartialEvaluation(evaluation.id)} disabled={saving} className="inline-flex items-center justify-center gap-1 rounded-md border px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50">
                            <Trash2 className="h-3.5 w-3.5" />
                            {t("Quitar", "Remove")}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="mb-5 rounded-md border border-primary/20 bg-[#f7fbff] p-4">
                  <div className="grid gap-3 md:grid-cols-[minmax(0,240px)_1fr] md:items-start">
                    <label className="text-sm">
                      <span className="mb-1 block font-medium text-[#17212b]">{t("Tipo de evaluación", "Assessment type")}</span>
                      <select className="w-full rounded-md border px-3 py-2 text-sm" value={evaluationType} onChange={(e) => changeEvaluationType(e.target.value as EvaluationType)}>
                        <option value="FINAL">{t("Evaluación final del curso", "Final course assessment")}</option>
                        <option value="AUTOEVALUATION">{t("Autoevaluación de una sesión", "Session self-assessment")}</option>
                        <option value="PARTIAL">{t("Evaluación parcial de una sesión", "Session partial assessment")}</option>
                      </select>
                    </label>
                    <div className="text-sm text-[#52667a]">
                      <p>{evaluationType === "FINAL"
                        ? t("Comprueba el aprendizaje global del curso y puede ser requisito para el certificado.", "Checks overall course learning and can be required for the certificate.")
                        : evaluationType === "AUTOEVALUATION"
                          ? t("Actividad formativa para practicar y recibir retroalimentación. No afecta la aprobación del curso.", "Formative activity for practice and feedback. It does not affect course approval.")
                          : t("Actividad calificable de una sesión o módulo. En esta versión no bloquea por sí sola el certificado.", "Graded activity for a session or module. In this version it does not by itself block the certificate.")}</p>
                      {evaluationType !== "FINAL" && (
                        <select className="mt-3 w-full rounded-md border px-3 py-2 text-sm" value={partialSessionId} onChange={(e) => setPartialSessionId(e.target.value)}>
                          <option value="">{t("Seleccionar sesión asociada", "Select associated session")}</option>
                          {(selectedCourse.sessions || []).map((session) => <option key={session.id} value={session.id}>{session.order}. {t(session.title.es, session.title.en)}</option>)}
                          {selectedCourse.modules.flatMap((module) => module.sessions).map((session) => <option key={session.id} value={session.id}>{t("Módulo", "Module")} {session.order}: {t(session.title.es, session.title.en)}</option>)}
                        </select>
                      )}
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-primary/10 pt-3">
                    <button type="button" onClick={() => setActiveSection("questionBank")} className="inline-flex items-center gap-2 rounded-md border border-primary px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary hover:text-white"><BookOpen className="h-3.5 w-3.5" />{t("Seleccionar preguntas del banco", "Select questions from bank")}</button>
                    <span className="text-xs text-[#7b8fa1]">{evaluationForm.questions.length} {t("preguntas seleccionadas", "questions selected")}</span>
                  </div>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <input className="rounded-md border px-3 py-2 text-sm" placeholder="Título ES" value={evaluationForm.title.es} onChange={(e) => setEvaluationForm({ ...evaluationForm, title: { ...evaluationForm.title, es: e.target.value } })} />
                  <input className="rounded-md border px-3 py-2 text-sm" placeholder="Title EN" value={evaluationForm.title.en} onChange={(e) => setEvaluationForm({ ...evaluationForm, title: { ...evaluationForm.title, en: e.target.value } })} />
                  <textarea className="rounded-md border px-3 py-2 text-sm md:col-span-2" placeholder="Descripción ES" value={evaluationForm.description.es} onChange={(e) => setEvaluationForm({ ...evaluationForm, description: { ...evaluationForm.description, es: e.target.value } })} />
                  <textarea className="rounded-md border px-3 py-2 text-sm md:col-span-2" placeholder="Description EN" value={evaluationForm.description.en} onChange={(e) => setEvaluationForm({ ...evaluationForm, description: { ...evaluationForm.description, en: e.target.value } })} />
                  <label className="text-sm">
                    <span className="mb-1 block text-[#7b8fa1]">{t("Nota mínima (%)", "Passing score (%)")}</span>
                    <input className="w-full rounded-md border px-3 py-2 text-sm" value={evaluationForm.passingScore} onChange={(e) => setEvaluationForm({ ...evaluationForm, passingScore: e.target.value })} />
                  </label>
                  <label className="text-sm">
                    <span className="mb-1 block text-[#7b8fa1]">{t("Intentos permitidos", "Allowed attempts")}</span>
                    <input className="w-full rounded-md border px-3 py-2 text-sm" value={evaluationForm.maxAttempts} onChange={(e) => setEvaluationForm({ ...evaluationForm, maxAttempts: e.target.value })} />
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={evaluationForm.showFeedback} onChange={(e) => setEvaluationForm({ ...evaluationForm, showFeedback: e.target.checked })} />
                    {t("Mostrar retroalimentación inmediata", "Show immediate feedback")}
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={evaluationForm.shuffleQuestions} onChange={(e) => setEvaluationForm({ ...evaluationForm, shuffleQuestions: e.target.checked })} />
                    {t("Aleatorizar preguntas", "Shuffle questions")}
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={evaluationForm.shuffleOptions} onChange={(e) => setEvaluationForm({ ...evaluationForm, shuffleOptions: e.target.checked })} />
                    {t("Aleatorizar opciones", "Shuffle options")}
                  </label>
                </div>

                <div className="mt-5 space-y-4">
                  {evaluationForm.questions.length === 0 && (
                    <div className="rounded-md border border-dashed bg-[#f7fbff] p-6 text-center text-sm text-[#52667a]">
                      <p className="font-medium text-[#17212b]">{t("Esta evaluación todavía no tiene preguntas.", "This assessment has no questions yet.")}</p>
                      <p className="mt-1">{t("Crea primero las preguntas en el Banco y luego selecciónalas aquí.", "Create questions in the Bank first, then select them here.")}</p>
                      <button type="button" onClick={() => setActiveSection("questionBank")} className="mt-3 inline-flex items-center gap-2 rounded-md border border-primary px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary hover:text-white"><BookOpen className="h-3.5 w-3.5" />{t("Ir al banco", "Go to bank")}</button>
                    </div>
                  )}
                  {evaluationForm.questions.map((question, questionIndex) => (
                    <div key={question.id} className="rounded-md border p-4">
                      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-sm font-semibold">
                          {t("Pregunta", "Question")} {questionIndex + 1}
                        </p>
                        <button
                          onClick={() => setEvaluationForm((prev) => ({
                            ...prev,
                            questions: prev.questions.filter((_, i) => i !== questionIndex),
                          }))}
                          disabled={evaluationForm.questions.length <= 1}
                          title={evaluationForm.questions.length <= 1 ? t("Una evaluación debe conservar al menos una pregunta.", "An assessment must keep at least one question.") : undefined}
                          className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 disabled:opacity-40"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          {t("Eliminar", "Delete")}
                        </button>
                      </div>
                      <div className="grid gap-3 md:grid-cols-2">
                        <select
                          className="rounded-md border px-3 py-2 text-sm"
                          value={question.type}
                          onChange={(e) => {
                            const nextType = e.target.value as QuestionType;
                            updateQuestion(questionIndex, {
                              type: nextType,
                              options: nextType === "MCQ" ? [{ ...emptyText }, { ...emptyText }] : [],
                              correctAnswer: nextType === "TRUEFALSE" ? "true" : "",
                              feedback: question.feedback || { ...emptyText },
                            });
                          }}
                        >
                          <option value="MCQ">{t("Selección múltiple", "Multiple choice")}</option>
                          <option value="TRUEFALSE">{t("Verdadero/Falso", "True/False")}</option>
                          <option value="SHORT">{t("Respuesta corta", "Short answer")}</option>
                        </select>
                        <input className="rounded-md border px-3 py-2 text-sm" placeholder="Puntos" value={question.points} onChange={(e) => updateQuestion(questionIndex, { points: Number(e.target.value || 1) })} />
                        <input className="rounded-md border px-3 py-2 text-sm" placeholder="Pregunta ES" value={question.question.es} onChange={(e) => updateQuestion(questionIndex, { question: { ...question.question, es: e.target.value } })} />
                        <input className="rounded-md border px-3 py-2 text-sm" placeholder="Question EN" value={question.question.en} onChange={(e) => updateQuestion(questionIndex, { question: { ...question.question, en: e.target.value } })} />
                        <select className="rounded-md border px-3 py-2 text-sm" value={question.difficulty || "BASIC"} onChange={(e) => updateQuestion(questionIndex, { difficulty: e.target.value as CmsQuestion["difficulty"] })}>
                          <option value="BASIC">{t("Básica", "Basic")}</option>
                          <option value="INTERMEDIATE">{t("Intermedia", "Intermediate")}</option>
                          <option value="ADVANCED">{t("Avanzada", "Advanced")}</option>
                        </select>
                        <select className="rounded-md border px-3 py-2 text-sm" value={question.moduleId || ""} onChange={(e) => updateQuestion(questionIndex, { moduleId: e.target.value })}>
                          <option value="">{t("Sin módulo asociado", "No linked module")}</option>
                          {selectedCourse.modules.map((module) => (
                            <option key={module.id} value={module.id}>{module.order}. {t(module.title.es, module.title.en)}</option>
                          ))}
                        </select>
                        <input className="rounded-md border px-3 py-2 text-sm" placeholder={t("Tema", "Topic")} value={question.topic || ""} onChange={(e) => updateQuestion(questionIndex, { topic: e.target.value })} />
                        <input className="rounded-md border px-3 py-2 text-sm md:col-span-2" placeholder={t("Etiquetas separadas por coma", "Comma-separated tags")} value={(question.tags || []).join(", ")} onChange={(e) => updateQuestion(questionIndex, { tags: e.target.value.split(",").map((tag) => tag.trim()).filter(Boolean) })} />
                      </div>

                      {question.type === "MCQ" && (
                        <div className="mt-3 space-y-2">
                          {question.options.map((option, optionIndex) => (
                            <div key={optionIndex} className="grid gap-2 md:grid-cols-[1fr_1fr_auto]">
                              <input className="rounded-md border px-3 py-2 text-sm" placeholder={`Opción ${optionIndex + 1} ES`} value={option.es} onChange={(e) => updateQuestionOption(questionIndex, optionIndex, { ...option, es: e.target.value })} />
                              <input className="rounded-md border px-3 py-2 text-sm" placeholder={`Option ${optionIndex + 1} EN`} value={option.en} onChange={(e) => updateQuestionOption(questionIndex, optionIndex, { ...option, en: e.target.value })} />
                              <button
                                onClick={() => updateQuestion(questionIndex, { correctAnswer: option.es || option.en })}
                                className={`rounded-md border px-3 py-2 text-xs ${question.correctAnswer === (option.es || option.en) ? "bg-primary text-white" : "hover:bg-accent"}`}
                              >
                                {t("Correcta", "Correct")}
                              </button>
                            </div>
                          ))}
                          <button
                            onClick={() => updateQuestion(questionIndex, { options: [...question.options, { ...emptyText }] })}
                            className="rounded-md border px-3 py-1.5 text-xs hover:bg-accent"
                          >
                            {t("Agregar opción", "Add option")}
                          </button>
                        </div>
                      )}

                      {question.type === "TRUEFALSE" && (
                        <select className="mt-3 rounded-md border px-3 py-2 text-sm" value={question.correctAnswer} onChange={(e) => updateQuestion(questionIndex, { correctAnswer: e.target.value })}>
                          <option value="true">{t("Verdadero", "True")}</option>
                          <option value="false">{t("Falso", "False")}</option>
                        </select>
                      )}

                      {question.type === "SHORT" && (
                        <input className="mt-3 w-full rounded-md border px-3 py-2 text-sm" placeholder={t("Respuesta correcta", "Correct answer")} value={question.correctAnswer} onChange={(e) => updateQuestion(questionIndex, { correctAnswer: e.target.value })} />
                      )}
                      <div className="mt-3 grid gap-3 md:grid-cols-2">
                        <textarea className="rounded-md border px-3 py-2 text-sm" placeholder={t("Retroalimentación ES", "Feedback ES")} value={question.feedback.es} onChange={(e) => updateQuestion(questionIndex, { feedback: { ...question.feedback, es: e.target.value } })} />
                        <textarea className="rounded-md border px-3 py-2 text-sm" placeholder={t("Retroalimentación EN", "Feedback EN")} value={question.feedback.en} onChange={(e) => updateQuestion(questionIndex, { feedback: { ...question.feedback, en: e.target.value } })} />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex flex-wrap gap-3">
                  <button onClick={() => setEvaluationForm((prev) => ({ ...prev, questions: [...prev.questions, createQuestion()] }))} className="inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent">
                    <Plus className="h-4 w-4" />
                    {t("Agregar pregunta", "Add question")}
                  </button>
                  <button onClick={saveEvaluation} disabled={saving || evaluationForm.questions.length === 0} className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
                    <Save className="h-4 w-4" />
                    {evaluationType === "FINAL"
                      ? t("Guardar evaluación final", "Save final assessment")
                      : evaluationType === "AUTOEVALUATION"
                        ? t("Guardar autoevaluación", "Save self-assessment")
                        : t("Guardar evaluación parcial", "Save partial assessment")}
                  </button>
                </div>
              </section>
              )}

              {activeSection === "reviews" && (
              <section className="rounded-lg border bg-white p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="font-semibold">{t("Moderación de reseñas", "Review moderation")}</h2>
                    <p className="mt-1 text-xs text-[#7b8fa1]">{t("Solo las reseñas aprobadas aparecen públicamente.", "Only approved reviews appear publicly.")}</p>
                  </div>
                  <button onClick={() => loadCourseReviews(selectedCourse.id)} disabled={loadingReviews} className="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs hover:bg-accent disabled:opacity-50">
                    {loadingReviews ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                    {t("Actualizar", "Refresh")}
                  </button>
                </div>
                {loadingReviews ? (
                  <div className="flex items-center justify-center gap-2 rounded-md border border-dashed p-8 text-sm text-[#7b8fa1]"><Loader2 className="h-4 w-4 animate-spin" />{t("Cargando reseñas...", "Loading reviews...")}</div>
                ) : courseReviews.length === 0 ? (
                  <div className="rounded-md border border-dashed p-8 text-center text-sm text-[#7b8fa1]">
                    <p className="font-medium text-[#52667a]">{t("Todavía no hay reseñas para este curso.", "There are no reviews for this course yet.")}</p>
                    <p className="mt-2">{t("Las reseñas las envían los estudiantes matriculados desde la vista pública. Cuando exista una, aparecerá aquí para moderarla.", "Enrolled students submit reviews from the public course page. Once one exists, it will appear here for moderation.")}</p>
                    <button type="button" onClick={() => void loadCourseReviews(selectedCourse.id)} className="mt-3 inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs hover:bg-accent"><RefreshCw className="h-3.5 w-3.5" />{t("Comprobar de nuevo", "Check again")}</button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {courseReviews.map((review) => (
                      <article key={review.id} className="rounded-md border p-4">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="font-medium">{review.user.name}</p>
                            <p className="text-xs text-[#7b8fa1]">{review.user.email} · {review.rating}/5 · {review.status}</p>
                          </div>
                          <div className="flex flex-wrap items-center justify-end gap-2">
                            <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${review.status === "PUBLISHED" ? "bg-green-100 text-green-800" : review.status === "REJECTED" ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800"}`}>
                              {review.status === "PUBLISHED" ? t("Aprobada", "Approved") : review.status === "REJECTED" ? t("Rechazada", "Rejected") : t("Pendiente", "Pending")}
                            </span>
                            {review.status !== "PUBLISHED" && (
                              <button onClick={() => void moderateReview(review.id, "PUBLISHED")} disabled={saving} className="rounded-md border border-green-700 px-2.5 py-1 text-xs font-medium text-green-700 hover:bg-green-50 disabled:opacity-50">{t("Aprobar", "Approve")}</button>
                            )}
                            {review.status !== "REJECTED" && (
                              <button onClick={() => void moderateReview(review.id, "REJECTED")} disabled={saving} className="rounded-md border border-red-700 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50">{t("Rechazar", "Reject")}</button>
                            )}
                          </div>
                        </div>
                        {review.testimonial && <p className="mt-3 text-sm leading-6 text-[#52667a]">“{review.testimonial}”</p>}
                      </article>
                    ))}
                  </div>
                )}
              </section>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
