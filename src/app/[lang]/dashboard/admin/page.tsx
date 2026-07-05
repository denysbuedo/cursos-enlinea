"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { getDictionary, getLangFromParams } from "@/lib/i18n";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Clock,
  User,
  BookOpen,
  DollarSign,
  AlertTriangle,
  RefreshCw,
  Award,
  FileClock,
  CreditCard,
} from "lucide-react";

interface PaymentPending {
  id: string;
  enrollmentId: string;
  currency: string;
  method: string;
  amount: number;
  proofUrl?: string;
  cryptoTxHash?: string;
  bankReference?: string;
  enzonaTxId?: string;
  userIp?: string;
  userCountry?: string;
  notes?: string;
  createdAt: string;
  enrollment: {
    user: { id: string; name: string; email: string; country: string | null };
    course: {
      id: string;
      slug: string;
      title: { es: string; en: string };
      currency: string;
      price: number;
    };
  };
}

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  country: string | null;
  createdAt: string;
}

interface AdminCertificate {
  id: string;
  badgeId: string;
  verificationUrl: string;
  isRevoked: boolean;
  revocationReason?: string | null;
  issuedAt: string;
  enrollment: {
    user: { id: string; name: string; email: string };
    course: { slug: string; title: { es: string; en: string } };
  };
}

interface AuditLogEntry {
  id: string;
  action: string;
  entity: string;
  entityId: string;
  userId?: string | null;
  metadata?: Record<string, unknown> | null;
  ipAddress?: string | null;
  createdAt: string;
}

interface PaymentInstruction {
  id: string;
  method: string;
  currency: string;
  label: { es: string; en: string };
  instructions: { es: string; en: string };
  accountInfo?: Record<string, unknown> | null;
  isActive: boolean;
  geoRestriction?: string | null;
}

interface PaymentInstructionForm {
  id: string;
  method: string;
  currency: string;
  label: { es: string; en: string };
  instructions: { es: string; en: string };
  accountInfo: string;
  isActive: boolean;
  geoRestriction: string;
}

const emptyPaymentInstruction: PaymentInstructionForm = {
  id: "",
  method: "ENZONA",
  currency: "CUP",
  label: { es: "", en: "" },
  instructions: { es: "", en: "" },
  accountInfo: "{\n  \"phoneNumber\": \"\",\n  \"concept\": \"\"\n}",
  isActive: true,
  geoRestriction: "",
};

const paymentMethods = ["ENZONA", "TRANSFERMOVIL", "BANK_TRANSFER_CUP", "BANK_TRANSFER_INTL", "CRYPTO_USDT", "CRYPTO_USDC", "MANUAL"];
const currencies = ["CUP", "USD", "EUR"];

export default function AdminDashboardPage() {
  const params = useParams<{ lang: string }>();
  const router = useRouter();
  const lang = getLangFromParams(params);
  const dict = getDictionary(lang);

  const [payments, setPayments] = useState<PaymentPending[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"payments" | "paymentSettings" | "users" | "certificates" | "audit">("payments");
  const [rejectReason, setRejectReason] = useState<Record<string, string>>({});
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [creatingUser, setCreatingUser] = useState(false);
  const [newUserForm, setNewUserForm] = useState({
    name: "",
    email: "",
    password: "password123",
    role: "STUDENT",
    country: "",
    preferredLang: "es",
  });
  const [roleLoading, setRoleLoading] = useState<string|null>(null);
  const [certificates, setCertificates] = useState<AdminCertificate[]>([]);
  const [certificatesTotal, setCertificatesTotal] = useState(0);
  const [certificatesLoading, setCertificatesLoading] = useState(false);
  const [revokeReason, setRevokeReason] = useState<Record<string, string>>({});
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditLoading, setAuditLoading] = useState(false);
  const [paymentInstructions, setPaymentInstructions] = useState<PaymentInstruction[]>([]);
  const [paymentInstructionsLoading, setPaymentInstructionsLoading] = useState(false);
  const [paymentInstructionForm, setPaymentInstructionForm] = useState<PaymentInstructionForm>(emptyPaymentInstruction);

  const t = (es: string, en: string) => (lang === "en" ? en : es);

  const fetchPending = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/payments/pending");
      if (res.status === 403 || res.status === 401) {
        router.push(`/${lang}/dashboard`);
        return;
      }
      if (!res.ok) throw new Error("Error");
      const data = await res.json();
      setPayments(data.data || []);
      setTotal(data.total || 0);
    } catch {
      setError(t("Error al cargar", "Error loading"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchPending();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchUsers = async () => { setUsersLoading(true); try {
    const res = await fetch("/api/admin/users"); if(!res.ok) return;
    const d = await res.json(); setUsers(d.data||[]);
  } finally { setUsersLoading(false); }};

  const createUser = async () => {
    setCreatingUser(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newUserForm,
          country: newUserForm.country || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || t("No se pudo crear el usuario", "User could not be created"));
      setUsers((prev) => [data.data, ...prev]);
      setNewUserForm({
        name: "",
        email: "",
        password: "password123",
        role: "STUDENT",
        country: "",
        preferredLang: "es",
      });
      await fetchAudit();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("No se pudo crear el usuario", "User could not be created"));
    } finally {
      setCreatingUser(false);
    }
  };

  const changeRole = async (userId: string, newRole: string) => { setRoleLoading(userId); try {
    await fetch(`/api/admin/users/${userId}/role`, { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({role:newRole}) });
    setUsers(prev=>prev.map(u=>u.id===userId?{...u,role:newRole}:u));
  } finally { setRoleLoading(null); }};

  const fetchCertificates = async () => {
    setCertificatesLoading(true);
    try {
      const res = await fetch("/api/admin/certificates?pageSize=50");
      if (!res.ok) return;
      const data = await res.json();
      setCertificates(data.data || []);
      setCertificatesTotal(data.total || 0);
    } finally {
      setCertificatesLoading(false);
    }
  };

  const revokeCertificate = async (id: string) => {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/admin/certificates/${id}/revoke`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: revokeReason[id] || t("Revocado desde panel admin", "Revoked from admin panel") }),
      });
      if (!res.ok) throw new Error();
      await fetchCertificates();
      setRevokeReason((prev) => {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      });
    } catch {
      setError(t("Error al revocar certificado", "Certificate revocation error"));
    } finally {
      setActionLoading(null);
    }
  };

  const fetchAudit = async () => {
    setAuditLoading(true);
    try {
      const res = await fetch("/api/admin/audit-log?pageSize=50");
      if (!res.ok) return;
      const data = await res.json();
      setAuditLogs(data.data || []);
      setAuditTotal(data.total || 0);
    } finally {
      setAuditLoading(false);
    }
  };

  const fetchPaymentInstructions = async () => {
    setPaymentInstructionsLoading(true);
    try {
      const res = await fetch("/api/admin/payment-instructions");
      if (!res.ok) return;
      const data = await res.json();
      setPaymentInstructions(data.data || []);
    } finally {
      setPaymentInstructionsLoading(false);
    }
  };

  const editPaymentInstruction = (instruction: PaymentInstruction) => {
    setPaymentInstructionForm({
      id: instruction.id,
      method: instruction.method,
      currency: instruction.currency,
      label: instruction.label || { es: "", en: "" },
      instructions: instruction.instructions || { es: "", en: "" },
      accountInfo: JSON.stringify(instruction.accountInfo || {}, null, 2),
      isActive: instruction.isActive,
      geoRestriction: instruction.geoRestriction || "",
    });
  };

  const savePaymentInstruction = async () => {
    setActionLoading("paymentInstruction");
    setError(null);
    try {
      let accountInfo: Record<string, unknown> | undefined;
      const trimmedAccountInfo = paymentInstructionForm.accountInfo.trim();
      if (trimmedAccountInfo) {
        accountInfo = JSON.parse(trimmedAccountInfo);
      }

      const res = await fetch("/api/admin/payment-instructions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: paymentInstructionForm.id || undefined,
          method: paymentInstructionForm.method,
          currency: paymentInstructionForm.currency,
          label: paymentInstructionForm.label,
          instructions: paymentInstructionForm.instructions,
          accountInfo,
          isActive: paymentInstructionForm.isActive,
          geoRestriction: paymentInstructionForm.geoRestriction || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || t("Error al guardar instrucciones de pago", "Payment instruction save error"));
      }
      setPaymentInstructionForm(emptyPaymentInstruction);
      await fetchPaymentInstructions();
      await fetchAudit();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("Error al guardar instrucciones de pago", "Payment instruction save error"));
    } finally {
      setActionLoading(null);
    }
  };

  const handleVerify = async (id: string) => {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/admin/payments/${id}/verify`, {
        method: "POST",
      });
      if (!res.ok) throw new Error();
      setPayments((prev) => prev.filter((p) => p.id !== id));
      setTotal((prev) => prev - 1);
    } catch {
      setError(t("Error al verificar", "Verification error"));
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id: string) => {
    const reason = rejectReason[id] || "";
    setActionLoading(id);
    try {
      const res = await fetch(`/api/admin/payments/${id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      if (!res.ok) throw new Error();
      setPayments((prev) => prev.filter((p) => p.id !== id));
      setTotal((prev) => prev - 1);
      // Limpiar razón
      setRejectReason((prev) => {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      });
    } catch {
      setError(t("Error al rechazar", "Rejection error"));
    } finally {
      setActionLoading(null);
    }
  };

  const methodLabel: Record<string, string> = {
    ENZONA: "EnZona",
    TRANSFERMOVIL: "Transfermóvil",
    BANK_TRANSFER_CUP: "Bank Transfer (CUP)",
    BANK_TRANSFER_INTL: "International Wire",
    CRYPTO_USDT: "USDT",
    CRYPTO_USDC: "USDC",
    MANUAL: "Manual",
  };

  return (
    <div className="container mx-auto py-10 px-4">
      <h1 className="text-3xl font-bold mb-2">{t("Panel de Administracion","Admin Panel")}</h1>
      <div className="flex flex-wrap gap-1 mb-6 border-b">
        <button onClick={()=>setActiveTab("payments")} className={"px-4 py-2 text-sm font-medium rounded-t-lg "+(activeTab==="payments"?"bg-primary text-white":"text-muted-foreground hover:text-foreground")}>{dict.admin.payments}</button>
        <button onClick={()=>{setActiveTab("paymentSettings");fetchPaymentInstructions()}} className={"px-4 py-2 text-sm font-medium rounded-t-lg "+(activeTab==="paymentSettings"?"bg-primary text-white":"text-muted-foreground hover:text-foreground")}>{t("Metodos de pago","Payment methods")}</button>
        <button onClick={()=>{setActiveTab("users");fetchUsers()}} className={"px-4 py-2 text-sm font-medium rounded-t-lg "+(activeTab==="users"?"bg-primary text-white":"text-muted-foreground hover:text-foreground")}>{t("Usuarios","Users")}</button>
        <button onClick={()=>{setActiveTab("certificates");fetchCertificates()}} className={"px-4 py-2 text-sm font-medium rounded-t-lg "+(activeTab==="certificates"?"bg-primary text-white":"text-muted-foreground hover:text-foreground")}>{t("Certificados","Certificates")}</button>
        <button onClick={()=>{setActiveTab("audit");fetchAudit()}} className={"px-4 py-2 text-sm font-medium rounded-t-lg "+(activeTab==="audit"?"bg-primary text-white":"text-muted-foreground hover:text-foreground")}>{t("Auditoria","Audit")}</button>
      </div>
      {activeTab==="payments"&&(<>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">{dict.admin.payments}</h1>
          <p className="text-[#7b8fa1] mt-1">
            {dict.admin.pendingPayments}: {total}
          </p>
        </div>
        <button
          onClick={fetchPending}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-accent transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          {t("Actualizar", "Refresh")}
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-[#c0392b]/10 text-black text-sm mb-6">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto">
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-32 bg-[#e8ecf1] animate-pulse rounded-xl" />
          ))}
        </div>
      ) : payments.length === 0 ? (
        <div className="text-center py-16">
          <CheckCircle2 className="w-12 h-12 mx-auto text-green-500 mb-3" />
          <p className="text-lg text-[#7b8fa1]">
            {t(
              "No hay pagos pendientes de revisión.",
              "No pending payments to review."
            )}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {payments.map((payment) => (
            <div
              key={payment.id}
              className="rounded-xl border bg-white overflow-hidden"
            >
              <div className="p-5">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Info */}
                  <div className="flex-1 space-y-3">
                    {/* Student + Course */}
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">
                          {payment.enrollment.user.name}
                        </p>
                        <p className="text-sm text-[#7b8fa1]">
                          {payment.enrollment.user.email}
                          {payment.enrollment.user.country &&
                            ` · ${payment.enrollment.user.country}`}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-sm">
                      <BookOpen className="w-4 h-4 text-[#7b8fa1]" />
                      <span>
                        {t(
                          payment.enrollment.course.title.es,
                          payment.enrollment.course.title.en
                        )}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-sm">
                      <span style={{background:"#fef3c6", color:"#000"}} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium">
                        <Clock className="w-3 h-3" />
                        {t("Pendiente", "Pending")}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[#7b8fa1]">
                        <DollarSign className="w-3.5 h-3.5" />
                        {Number(payment.amount)} {payment.currency}
                      </span>
                      <span className="text-[#7b8fa1]">
                        {methodLabel[payment.method] || payment.method}
                      </span>
                      <span className="text-xs text-[#7b8fa1]">
                        {new Date(payment.createdAt).toLocaleString(
                          lang === "en" ? "en-US" : "es-ES"
                        )}
                      </span>
                    </div>

                    {/* Extra info */}
                    {payment.cryptoTxHash && (
                      <p className="text-xs text-[#7b8fa1]">
                        TX Hash:{" "}
                        <code className="bg-[#e8ecf1] px-1 py-0.5 rounded">
                          {payment.cryptoTxHash}
                        </code>
                      </p>
                    )}
                    {payment.bankReference && (
                      <p className="text-xs text-[#7b8fa1]">
                        Ref: {payment.bankReference}
                      </p>
                    )}
                    {payment.notes && (
                      <p className="text-xs text-[#7b8fa1] italic">
                        {payment.notes}
                      </p>
                    )}
                    {payment.proofUrl && (
                      <div className="mt-2">
                        <a
                          href={payment.proofUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline mb-2"
                        >
                          📎 {t("Ver comprobante en otra pestaña", "View proof in new tab")}
                        </a>
                        {payment.proofUrl.match(/\.(jpg|jpeg|png|webp|gif)$/i) || payment.proofUrl.includes("/uploads/") ? (
                          <Image
                            src={payment.proofUrl}
                            alt={t("Comprobante de pago", "Payment proof")}
                            width={320}
                            height={192}
                            unoptimized
                            className="max-w-xs max-h-48 rounded-lg border object-contain bg-[#e8ecf1]/30"
                          />
                        ) : payment.proofUrl.match(/\.pdf$/i) ? (
                          <iframe
                            src={payment.proofUrl}
                            title={t("Comprobante PDF", "PDF Proof")}
                            className="w-full max-w-xs h-48 rounded-lg border"
                          />
                        ) : (
                          <span className="text-xs text-[#7b8fa1]">
                            {t("Archivo adjunto disponible", "File attached")}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2 lg:min-w-[200px]">
                    <button
                      onClick={() => handleVerify(payment.id)}
                      disabled={actionLoading === payment.id}
                      className="inline-flex items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2.5 text-white text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
                    >
                      {actionLoading === payment.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4" />
                      )}
                      {dict.admin.verifyPayment}
                    </button>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder={t("Motivo...", "Reason...")}
                        value={rejectReason[payment.id] || ""}
                        onChange={(e) =>
                          setRejectReason((prev) => ({
                            ...prev,
                            [payment.id]: e.target.value,
                          }))
                        }
                        className="flex-1 px-3 py-2 rounded-lg border text-xs focus:outline-none focus:ring-1 focus:ring-destructive"
                      />
                      <button
                        onClick={() => handleReject(payment.id)}
                        disabled={actionLoading === payment.id}
                        className="inline-flex items-center justify-center gap-1 rounded-lg bg-[#c0392b]/10 text-black px-4 py-2 text-sm font-medium hover:bg-[#c0392b]/20 transition-colors disabled:opacity-50"
                      >
                        <XCircle className="w-4 h-4" />
                        {dict.admin.rejectPayment}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      </> )}
      {activeTab==="paymentSettings"&&(
        <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
          <section className="rounded-xl border bg-white p-5">
            <div className="mb-4 flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              <h2 className="font-semibold">{paymentInstructionForm.id ? t("Editar metodo", "Edit method") : t("Nuevo metodo", "New method")}</h2>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <label className="text-sm">
                  <span className="mb-1 block text-muted-foreground">{t("Metodo", "Method")}</span>
                  <select value={paymentInstructionForm.method} onChange={(e)=>setPaymentInstructionForm(prev=>({...prev,method:e.target.value}))} disabled={Boolean(paymentInstructionForm.id)} className="w-full rounded-lg border bg-white px-3 py-2 text-sm disabled:bg-muted">
                    {paymentMethods.map((method)=><option key={method} value={method}>{methodLabel[method] || method}</option>)}
                  </select>
                </label>
                <label className="text-sm">
                  <span className="mb-1 block text-muted-foreground">{t("Moneda", "Currency")}</span>
                  <select value={paymentInstructionForm.currency} onChange={(e)=>setPaymentInstructionForm(prev=>({...prev,currency:e.target.value}))} disabled={Boolean(paymentInstructionForm.id)} className="w-full rounded-lg border bg-white px-3 py-2 text-sm disabled:bg-muted">
                    {currencies.map((currency)=><option key={currency} value={currency}>{currency}</option>)}
                  </select>
                </label>
              </div>
              <input value={paymentInstructionForm.label.es} onChange={(e)=>setPaymentInstructionForm(prev=>({...prev,label:{...prev.label,es:e.target.value}}))} placeholder="Etiqueta ES" className="w-full rounded-lg border px-3 py-2 text-sm" />
              <input value={paymentInstructionForm.label.en} onChange={(e)=>setPaymentInstructionForm(prev=>({...prev,label:{...prev.label,en:e.target.value}}))} placeholder="Label EN" className="w-full rounded-lg border px-3 py-2 text-sm" />
              <textarea value={paymentInstructionForm.instructions.es} onChange={(e)=>setPaymentInstructionForm(prev=>({...prev,instructions:{...prev.instructions,es:e.target.value}}))} placeholder="Instrucciones ES" rows={4} className="w-full rounded-lg border px-3 py-2 text-sm" />
              <textarea value={paymentInstructionForm.instructions.en} onChange={(e)=>setPaymentInstructionForm(prev=>({...prev,instructions:{...prev.instructions,en:e.target.value}}))} placeholder="Instructions EN" rows={4} className="w-full rounded-lg border px-3 py-2 text-sm" />
              <textarea value={paymentInstructionForm.accountInfo} onChange={(e)=>setPaymentInstructionForm(prev=>({...prev,accountInfo:e.target.value}))} placeholder="Datos de cuenta JSON" rows={5} className="w-full rounded-lg border px-3 py-2 font-mono text-xs" />
              <div className="grid grid-cols-[1fr_auto] items-end gap-3">
                <label className="text-sm">
                  <span className="mb-1 block text-muted-foreground">{t("Restriccion pais", "Country restriction")}</span>
                  <input value={paymentInstructionForm.geoRestriction} onChange={(e)=>setPaymentInstructionForm(prev=>({...prev,geoRestriction:e.target.value.toUpperCase()}))} placeholder="CU, US..." className="w-full rounded-lg border px-3 py-2 text-sm" />
                </label>
                <label className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm">
                  <input type="checkbox" checked={paymentInstructionForm.isActive} onChange={(e)=>setPaymentInstructionForm(prev=>({...prev,isActive:e.target.checked}))} />
                  {t("Activo", "Active")}
                </label>
              </div>
              <div className="flex flex-wrap gap-2 pt-2">
                <button onClick={savePaymentInstruction} disabled={actionLoading==="paymentInstruction"} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
                  {actionLoading==="paymentInstruction" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  {t("Guardar", "Save")}
                </button>
                <button onClick={()=>setPaymentInstructionForm(emptyPaymentInstruction)} className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-accent">
                  {t("Limpiar", "Clear")}
                </button>
              </div>
            </div>
          </section>

          <section className="rounded-xl border bg-white">
            <div className="flex items-center justify-between border-b p-5">
              <div>
                <h2 className="font-semibold">{t("Instrucciones configuradas", "Configured instructions")}</h2>
                <p className="text-sm text-muted-foreground">{paymentInstructions.length} {t("metodos", "methods")}</p>
              </div>
              <button onClick={fetchPaymentInstructions} disabled={paymentInstructionsLoading} className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-accent disabled:opacity-50">
                <RefreshCw className={`h-4 w-4 ${paymentInstructionsLoading ? "animate-spin" : ""}`} />
                {t("Actualizar", "Refresh")}
              </button>
            </div>
            {paymentInstructionsLoading ? (
              <div className="py-12 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : paymentInstructions.length === 0 ? (
              <div className="p-10 text-center">
                <CreditCard className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">{t("No hay instrucciones de pago configuradas.", "No payment instructions configured.")}</p>
              </div>
            ) : (
              <div className="divide-y">
                {paymentInstructions.map((instruction)=>(
                  <button key={instruction.id} onClick={()=>editPaymentInstruction(instruction)} className="block w-full p-5 text-left hover:bg-accent/40">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium">{t(instruction.label.es, instruction.label.en) || methodLabel[instruction.method] || instruction.method}</span>
                          <span className="rounded-full bg-muted px-2 py-0.5 text-xs">{instruction.currency}</span>
                          {instruction.geoRestriction && <span className="rounded-full bg-muted px-2 py-0.5 text-xs">{instruction.geoRestriction}</span>}
                          <span className={"rounded-full px-2 py-0.5 text-xs "+(instruction.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700")}>
                            {instruction.isActive ? t("Activo", "Active") : t("Inactivo", "Inactive")}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">{methodLabel[instruction.method] || instruction.method}</p>
                        <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{t(instruction.instructions.es, instruction.instructions.en)}</p>
                      </div>
                      <span className="text-xs text-primary">{t("Editar", "Edit")}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
      {activeTab==="users"&&(
        <div className="space-y-4">
          <div className="rounded-xl border bg-white p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">{t("Crear usuario", "Create user")}</h2>
                <p className="text-sm text-muted-foreground">{t("Alta manual para estudiantes, instructores o administradores.", "Manual creation for students, instructors or admins.")}</p>
              </div>
              <button onClick={fetchUsers} disabled={usersLoading} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-accent disabled:opacity-50">
                <RefreshCw className={`h-4 w-4 ${usersLoading ? "animate-spin" : ""}`} />
                {t("Actualizar", "Refresh")}
              </button>
            </div>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-6">
              <input value={newUserForm.name} onChange={(e)=>setNewUserForm((prev)=>({...prev,name:e.target.value}))} placeholder={t("Nombre", "Name")} className="rounded-lg border px-3 py-2 text-sm lg:col-span-2" />
              <input value={newUserForm.email} onChange={(e)=>setNewUserForm((prev)=>({...prev,email:e.target.value}))} placeholder="email@dominio.com" type="email" className="rounded-lg border px-3 py-2 text-sm lg:col-span-2" />
              <input value={newUserForm.password} onChange={(e)=>setNewUserForm((prev)=>({...prev,password:e.target.value}))} placeholder={t("Contrasena", "Password")} type="text" className="rounded-lg border px-3 py-2 text-sm" />
              <select value={newUserForm.role} onChange={(e)=>setNewUserForm((prev)=>({...prev,role:e.target.value}))} className="rounded-lg border bg-white px-3 py-2 text-sm">
                <option value="STUDENT">{t("Estudiante", "Student")}</option>
                <option value="INSTRUCTOR">{t("Instructor", "Instructor")}</option>
                <option value="ADMIN">Admin</option>
              </select>
              <input value={newUserForm.country} onChange={(e)=>setNewUserForm((prev)=>({...prev,country:e.target.value}))} placeholder={t("Pais", "Country")} maxLength={2} className="rounded-lg border px-3 py-2 text-sm" />
              <select value={newUserForm.preferredLang} onChange={(e)=>setNewUserForm((prev)=>({...prev,preferredLang:e.target.value}))} className="rounded-lg border bg-white px-3 py-2 text-sm">
                <option value="es">ES</option>
                <option value="en">EN</option>
              </select>
              <button onClick={createUser} disabled={creatingUser || !newUserForm.name.trim() || !newUserForm.email.trim() || newUserForm.password.length < 6} className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50 lg:col-span-2">
                {creatingUser && <Loader2 className="h-4 w-4 animate-spin" />}
                {t("Crear usuario", "Create user")}
              </button>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">{users.length} {t("usuarios","users")}</p>
          {usersLoading ? <div className="text-center py-12"><Loader2 className="w-6 h-6 mx-auto animate-spin text-muted-foreground"/></div> : (
            <div className="overflow-x-auto rounded-xl border">
              <table className="w-full">
                <thead><tr className="bg-muted">
                  <th className="p-3 text-left text-sm">{t("Nombre","Name")}</th>
                  <th className="p-3 text-left text-sm">Email</th>
                  <th className="p-3 text-left text-sm">{t("Rol","Role")}</th>
                  <th className="p-3 text-left text-sm">{t("Cambiar","Change")}</th>
                </tr></thead>
                <tbody>{users.map((u: AdminUser)=><tr key={u.id} className="border-t hover:bg-accent/30">
                  <td className="p-3"><p className="text-sm font-medium">{u.name}</p></td>
                  <td className="p-3 text-sm text-muted-foreground">{u.email}</td>
                  <td className="p-3"><span className={"inline-flex rounded-full px-2 py-0.5 text-xs font-medium "+(u.role==="ADMIN"?"bg-red-100 text-red-700":u.role==="INSTRUCTOR"?"bg-amber-100 text-amber-700":"bg-blue-100 text-blue-700")}>{u.role==="ADMIN"?"Admin":u.role==="INSTRUCTOR"?"Instructor":"Estudiante"}</span></td>
                  <td className="p-3"><select value={u.role} onChange={e=>changeRole(u.id,e.target.value)} disabled={roleLoading===u.id} className="text-xs border rounded px-2 py-1 bg-white"><option value="STUDENT">{t("Estudiante","Student")}</option><option value="INSTRUCTOR">{t("Instructor","Instructor")}</option><option value="ADMIN">Admin</option></select>{roleLoading===u.id&&<Loader2 className="w-3 h-3 inline ml-2 animate-spin"/>}</td>
                </tr>)}</tbody>
              </table>
            </div>
          )}
        </div>
      )}
      {activeTab==="certificates"&&(
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{certificatesTotal} {t("certificados emitidos","issued certificates")}</p>
            <button onClick={fetchCertificates} disabled={certificatesLoading} className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-accent disabled:opacity-50">
              <RefreshCw className={`w-4 h-4 ${certificatesLoading ? "animate-spin" : ""}`} />
              {t("Actualizar", "Refresh")}
            </button>
          </div>
          {certificatesLoading ? (
            <div className="text-center py-12"><Loader2 className="w-6 h-6 mx-auto animate-spin text-muted-foreground"/></div>
          ) : certificates.length === 0 ? (
            <div className="rounded-xl border bg-white p-10 text-center">
              <Award className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">{t("Aun no hay certificados emitidos.", "No certificates have been issued yet.")}</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border bg-white">
              <table className="w-full">
                <thead><tr className="bg-muted">
                  <th className="p-3 text-left text-sm">{t("Estudiante","Student")}</th>
                  <th className="p-3 text-left text-sm">{t("Curso","Course")}</th>
                  <th className="p-3 text-left text-sm">Badge ID</th>
                  <th className="p-3 text-left text-sm">{t("Estado","Status")}</th>
                  <th className="p-3 text-left text-sm">{t("Accion","Action")}</th>
                </tr></thead>
                <tbody>{certificates.map((cert)=><tr key={cert.id} className="border-t align-top hover:bg-accent/30">
                  <td className="p-3">
                    <p className="text-sm font-medium">{cert.enrollment.user.name}</p>
                    <p className="text-xs text-muted-foreground">{cert.enrollment.user.email}</p>
                  </td>
                  <td className="p-3 text-sm">{t(cert.enrollment.course.title.es, cert.enrollment.course.title.en)}</td>
                  <td className="p-3 text-xs text-muted-foreground">
                    <a href={cert.verificationUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{cert.badgeId}</a>
                    <p>{new Date(cert.issuedAt).toLocaleDateString(lang === "en" ? "en-US" : "es-ES")}</p>
                  </td>
                  <td className="p-3">
                    <span className={"inline-flex rounded-full px-2 py-0.5 text-xs font-medium "+(cert.isRevoked?"bg-red-100 text-red-700":"bg-green-100 text-green-700")}>
                      {cert.isRevoked ? t("Revocado","Revoked") : t("Vigente","Active")}
                    </span>
                    {cert.revocationReason && <p className="mt-1 max-w-xs text-xs text-muted-foreground">{cert.revocationReason}</p>}
                  </td>
                  <td className="p-3">
                    {cert.isRevoked ? (
                      <span className="text-xs text-muted-foreground">{t("Sin acciones", "No actions")}</span>
                    ) : (
                      <div className="flex min-w-60 gap-2">
                        <input value={revokeReason[cert.id] || ""} onChange={(e)=>setRevokeReason(prev=>({...prev,[cert.id]:e.target.value}))} placeholder={t("Motivo", "Reason")} className="flex-1 rounded-lg border px-3 py-2 text-xs" />
                        <button onClick={()=>revokeCertificate(cert.id)} disabled={actionLoading===cert.id} className="rounded-lg bg-[#c0392b]/10 px-3 py-2 text-xs font-medium text-black hover:bg-[#c0392b]/20 disabled:opacity-50">
                          {actionLoading===cert.id ? <Loader2 className="h-3 w-3 animate-spin" /> : t("Revocar","Revoke")}
                        </button>
                      </div>
                    )}
                  </td>
                </tr>)}</tbody>
              </table>
            </div>
          )}
        </div>
      )}
      {activeTab==="audit"&&(
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{auditTotal} {t("eventos registrados","logged events")}</p>
            <button onClick={fetchAudit} disabled={auditLoading} className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-accent disabled:opacity-50">
              <RefreshCw className={`w-4 h-4 ${auditLoading ? "animate-spin" : ""}`} />
              {t("Actualizar", "Refresh")}
            </button>
          </div>
          {auditLoading ? (
            <div className="text-center py-12"><Loader2 className="w-6 h-6 mx-auto animate-spin text-muted-foreground"/></div>
          ) : auditLogs.length === 0 ? (
            <div className="rounded-xl border bg-white p-10 text-center">
              <FileClock className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">{t("Aun no hay eventos de auditoria.", "No audit events yet.")}</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border bg-white">
              <table className="w-full">
                <thead><tr className="bg-muted">
                  <th className="p-3 text-left text-sm">{t("Fecha","Date")}</th>
                  <th className="p-3 text-left text-sm">{t("Accion","Action")}</th>
                  <th className="p-3 text-left text-sm">{t("Entidad","Entity")}</th>
                  <th className="p-3 text-left text-sm">{t("Detalle","Detail")}</th>
                </tr></thead>
                <tbody>{auditLogs.map((log)=><tr key={log.id} className="border-t align-top hover:bg-accent/30">
                  <td className="p-3 text-xs text-muted-foreground">{new Date(log.createdAt).toLocaleString(lang === "en" ? "en-US" : "es-ES")}</td>
                  <td className="p-3 text-sm font-medium">{log.action}</td>
                  <td className="p-3 text-sm">{log.entity}<p className="text-xs text-muted-foreground">{log.entityId}</p></td>
                  <td className="p-3 text-xs text-muted-foreground">
                    {log.userId && <p>User: {log.userId}</p>}
                    {log.ipAddress && <p>IP: {log.ipAddress}</p>}
                    {log.metadata && <code className="block max-w-lg whitespace-pre-wrap rounded bg-muted p-2">{JSON.stringify(log.metadata, null, 2)}</code>}
                  </td>
                </tr>)}</tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
