// ─── Auth ────────────────────────────────────────
export interface RegisterInput {
  email: string;
  password: string;
  name: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: UserProfile;
  accessToken: string;
}

// ─── User ────────────────────────────────────────
export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "INSTRUCTOR" | "STUDENT";
  country?: string;
  preferredLang: string;
}

// ─── Course ──────────────────────────────────────
export interface CourseWithSessions {
  id: string;
  slug: string;
  title: { es: string; en: string };
  description: { es: string; en: string };
  visibility: "PUBLIC" | "ENROLLED_ONLY" | "PRIVATE";
  status: "DRAFT" | "SCHEDULED" | "PUBLISHED" | "ARCHIVED";
  pricingModel: string;
  price?: number;
  currency: "CUP" | "USD" | "EUR";
  instructorId: string;
  sessions: Session[];
  _count?: { enrollments: number };
}

// ─── Session ─────────────────────────────────────
export interface Session {
  id: string;
  courseId: string;
  title: { es: string; en: string };
  description: { es: string; en: string };
  keywords: string[];
  sessionType: "RECORDED" | "LIVE" | "HYBRID";
  preview: boolean;
  videoUrl?: string;
  videoPlatform?: string;
  scheduledAt?: string;
  order: number;
  status: string;
}

// ─── Enrollment ──────────────────────────────────
export interface EnrollmentWithProgress {
  id: string;
  userId: string;
  courseId: string;
  status: string;
  progress: number;
  admissionType: string;
  course?: CourseWithSessions;
}

// ─── Payment ─────────────────────────────────────
export interface PaymentWithEnrollment {
  id: string;
  enrollmentId: string;
  currency: string;
  method: string;
  status: string;
  amount: number;
  proofUrl?: string;
  cryptoTxHash?: string;
  userIp?: string;
  userCountry?: string;
  createdAt: string;
  enrollment?: {
    user: { name: string; email: string };
    course: { title: { es: string; en: string } };
  };
}

// ─── PaymentInstruction ──────────────────────────
export interface PaymentInstructionData {
  id: string;
  method: string;
  currency: string;
  label: { es: string; en: string };
  instructions: { es: string; en: string };
  accountInfo?: Record<string, string>;
  isActive: boolean;
  geoRestriction?: string;
}

// ─── Certificate ─────────────────────────────────
export interface CertificateWithRelations {
  id: string;
  badgeId: string;
  verificationUrl: string;
  credentialSubject: Record<string, unknown>;
  pdfUrl?: string;
  isRevoked: boolean;
  revocationReason?: string;
  issuedAt: string;
  enrollment: {
    user: { name: string };
    course: { title: { es: string; en: string } };
  };
}

// ─── API ─────────────────────────────────────────
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}
