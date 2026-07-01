"use client";

import { useState, useEffect } from "react";
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
  const [activeTab, setActiveTab] = useState<"payments"|"users">("payments");
  const [rejectReason, setRejectReason] = useState<Record<string, string>>({});
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [usersTotal, setUsersTotal] = useState(0);
  const [usersLoading, setUsersLoading] = useState(false);
  const [roleLoading, setRoleLoading] = useState<string|null>(null);

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
    fetchPending();
  }, []);

  const fetchUsers = async () => { setUsersLoading(true); try {
    const res = await fetch("/api/admin/users"); if(!res.ok) return;
    const d = await res.json(); setUsers(d.data||[]); setUsersTotal(d.total||0);
  } finally { setUsersLoading(false); }};

  const changeRole = async (userId: string, newRole: string) => { setRoleLoading(userId); try {
    await fetch(`/api/admin/users/${userId}/role`, { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({role:newRole}) });
    setUsers(prev=>prev.map(u=>u.id===userId?{...u,role:newRole}:u));
  } finally { setRoleLoading(null); }};

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
      <div className="flex gap-1 mb-6 border-b">
        <button onClick={()=>setActiveTab("payments")} className={"px-4 py-2 text-sm font-medium rounded-t-lg "+(activeTab==="payments"?"bg-primary text-white":"text-muted-foreground hover:text-foreground")}>{dict.admin.payments}</button>
        <button onClick={()=>{setActiveTab("users");fetchUsers()}} className={"px-4 py-2 text-sm font-medium rounded-t-lg "+(activeTab==="users"?"bg-primary text-white":"text-muted-foreground hover:text-foreground")}>{t("Usuarios","Users")}</button>
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
                          <img
                            src={payment.proofUrl}
                            alt={t("Comprobante de pago", "Payment proof")}
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
      {activeTab==="users"&&(
        <div className="space-y-4">
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
                <tbody>{users.map((u:any)=><tr key={u.id} className="border-t hover:bg-accent/30">
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
    </div>
  );
}
