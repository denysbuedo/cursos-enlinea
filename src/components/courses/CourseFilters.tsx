"use client";

import { CircleDollarSign, ListFilter, Search } from "lucide-react";

interface CourseFiltersProps {
  lang: string;
  onSearch: (value: string) => void;
  onCurrencyChange: (value: string) => void;
  onPricingModelChange: (value: string) => void;
  selectedCurrency: string;
  selectedPricingModel: string;
}

const currencies = [
  { value: "", labelEs: "Todas", labelEn: "All" },
  { value: "CUP", labelEs: "CUP", labelEn: "CUP" },
  { value: "USD", labelEs: "USD", labelEn: "USD" },
  { value: "EUR", labelEs: "EUR", labelEn: "EUR" },
];

const pricingModels = [
  { value: "", labelEs: "Todos", labelEn: "All" },
  { value: "FREE", labelEs: "Gratuitos", labelEn: "Free" },
  { value: "PAID", labelEs: "De pago", labelEn: "Paid" },
];

export function CourseFilters({
  lang,
  onSearch,
  onCurrencyChange,
  onPricingModelChange,
  selectedCurrency,
  selectedPricingModel,
}: CourseFiltersProps) {
  const tl = (es: string, en: string) => (lang === "en" ? en : es);

  return (
    <div className="mb-8 grid gap-3 rounded-lg border border-border bg-white p-3 shadow-sm sm:grid-cols-[1fr_auto_auto]">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder={tl("Buscar cursos...", "Search courses...")}
          onChange={(e) => onSearch(e.target.value)}
          className="focus-ring w-full rounded-md border border-border bg-background py-2.5 pl-10 pr-4 text-sm text-foreground transition-colors placeholder:text-muted-foreground"
        />
      </div>

      <label className="relative block">
        <CircleDollarSign className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <select
          value={selectedCurrency}
          onChange={(e) => onCurrencyChange(e.target.value)}
          className="focus-ring w-full appearance-none rounded-md border border-border bg-background py-2.5 pl-10 pr-8 text-sm text-foreground transition-colors sm:w-36"
          aria-label={tl("Filtrar por moneda", "Filter by currency")}
        >
          {currencies.map((c) => (
            <option key={c.value} value={c.value}>
              {tl(c.labelEs, c.labelEn)}
            </option>
          ))}
        </select>
      </label>

      <label className="relative block">
        <ListFilter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <select
          value={selectedPricingModel}
          onChange={(e) => onPricingModelChange(e.target.value)}
          className="focus-ring w-full appearance-none rounded-md border border-border bg-background py-2.5 pl-10 pr-8 text-sm text-foreground transition-colors sm:w-40"
          aria-label={tl("Filtrar por precio", "Filter by price")}
        >
          {pricingModels.map((p) => (
            <option key={p.value} value={p.value}>
              {tl(p.labelEs, p.labelEn)}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
