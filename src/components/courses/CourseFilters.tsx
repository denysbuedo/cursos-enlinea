"use client";

import { Search } from "lucide-react";

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
    <div className="flex flex-col sm:flex-row gap-4 mb-8">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder={tl("Buscar cursos...", "Search courses...")}
          onChange={(e) => onSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
        />
      </div>

      <select
        value={selectedCurrency}
        onChange={(e) => onCurrencyChange(e.target.value)}
        className="px-4 py-2.5 rounded-lg border border-gray-200 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
      >
        {currencies.map((c) => (
          <option key={c.value} value={c.value}>
            💰 {tl(c.labelEs, c.labelEn)}
          </option>
        ))}
      </select>

      <select
        value={selectedPricingModel}
        onChange={(e) => onPricingModelChange(e.target.value)}
        className="px-4 py-2.5 rounded-lg border border-gray-200 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
      >
        {pricingModels.map((p) => (
          <option key={p.value} value={p.value}>
            📚 {tl(p.labelEs, p.labelEn)}
          </option>
        ))}
      </select>
    </div>
  );
}
