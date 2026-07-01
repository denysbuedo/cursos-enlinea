"use client";

import {
  Banknote,
  Smartphone,
  Building2,
  Coins,
  Globe,
  CreditCard,
} from "lucide-react";

interface PaymentMethod {
  id: string;
  method: string;
  currency: string;
  label: { es: string; en: string };
  instructions: { es: string; en: string };
  accountInfo?: Record<string, string>;
  geoRestriction?: string;
}

const methodIcons: Record<string, React.ElementType> = {
  ENZONA: Smartphone,
  TRANSFERMOVIL: Smartphone,
  BANK_TRANSFER_CUP: Building2,
  BANK_TRANSFER_INTL: Globe,
  CRYPTO_USDT: Coins,
  CRYPTO_USDC: Coins,
  MANUAL: CreditCard,
};

const methodLabelFallback: Record<string, { es: string; en: string }> = {
  ENZONA: { es: "EnZona", en: "EnZona" },
  TRANSFERMOVIL: { es: "Transfermóvil", en: "Transfermóvil" },
  BANK_TRANSFER_CUP: { es: "Transferencia Bancaria (CUP)", en: "Bank Transfer (CUP)" },
  BANK_TRANSFER_INTL: { es: "Transferencia Internacional", en: "International Wire" },
  CRYPTO_USDT: { es: "USDT (Tether)", en: "USDT (Tether)" },
  CRYPTO_USDC: { es: "USDC", en: "USDC" },
  MANUAL: { es: "Pago Manual", en: "Manual Payment" },
};

interface PaymentSelectorProps {
  methods: PaymentMethod[];
  selectedMethod: string;
  onSelect: (method: string) => void;
  lang: string;
  coursePrice?: number;
  courseCurrency?: string;
}

export function PaymentSelector({
  methods,
  selectedMethod,
  onSelect,
  lang,
  coursePrice,
  courseCurrency,
}: PaymentSelectorProps) {
  const t = (es: string, en: string) => (lang === "en" ? en : es);

  if (methods.length === 0) {
    return (
      <div className="text-center py-8">
        <Banknote className="w-12 h-12 mx-auto text-[#7b8fa1] mb-3" />
        <p className="text-[#7b8fa1]">
          {t(
            "No hay métodos de pago disponibles para tu región.",
            "No payment methods available for your region."
          )}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium">
        {t("Selecciona tu método de pago", "Select your payment method")}
      </label>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {methods.map((method) => {
          const Icon = methodIcons[method.method] || Banknote;
          const isSelected = selectedMethod === method.method;
          const label =
            method.label ||
            methodLabelFallback[method.method] || {
              es: method.method,
              en: method.method,
            };

          return (
            <button
              key={method.id}
              onClick={() => onSelect(method.method)}
              aria-pressed={isSelected}
              aria-label={`${t(label.es, label.en)} — ${method.currency}`}
              className={`flex items-start gap-3 p-4 rounded-xl border text-left transition-all ${
                isSelected
                  ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                  : "hover:border-primary/30 hover:bg-accent/50"
              }`}
            >
              <div
                className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                  isSelected
                    ? "bg-primary text-white"
                    : "bg-[#e8ecf1] text-[#7b8fa1]"
                }`}
              >
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{t(label.es, label.en)}</p>
                <p className="text-xs text-[#7b8fa1] mt-0.5">
                  {method.currency}
                  {coursePrice && courseCurrency === method.currency
                    ? ` — ${coursePrice} ${method.currency}`
                    : ""}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
