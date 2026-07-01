"use client";

import { useState, useRef } from "react";
import { Upload, X, FileText, Image as ImageIcon, Check } from "lucide-react";

interface ProofUploadProps {
  onFileSelected: (file: File | null) => void;
  lang: string;
  existingUrl?: string;
}

const MAX_SIZE_MB = 10;
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
];

export function ProofUpload({
  onFileSelected,
  lang,
  existingUrl,
}: ProofUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(existingUrl || null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const t = (es: string, en: string) => (lang === "en" ? en : es);

  const validateAndSetFile = (f: File) => {
    setError(null);

    if (f.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(
        t(
          `El archivo excede ${MAX_SIZE_MB}MB`,
          `File exceeds ${MAX_SIZE_MB}MB`
        )
      );
      return;
    }

    if (!ALLOWED_TYPES.includes(f.type)) {
      setError(
        t(
          "Formato no permitido. Usa JPG, PNG, WEBP o PDF.",
          "Format not allowed. Use JPG, PNG, WEBP or PDF."
        )
      );
      return;
    }

    setFile(f);
    onFileSelected(f);

    // Preview para imágenes
    if (f.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target?.result as string);
      reader.readAsDataURL(f);
    } else {
      // Para PDFs, usamos el nombre como "preview" para que se muestre el estado
      setPreview(f.name);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) validateAndSetFile(dropped);
  };

  const clearFile = () => {
    setFile(null);
    setPreview(null);
    setError(null);
    onFileSelected(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">
        {t("Subir comprobante de pago", "Upload payment proof")}
      </label>

      {preview ? (
        <div className="relative rounded-xl border overflow-hidden">
          {existingUrl && !file ? (
            <div className="flex items-center gap-3 p-4 bg-[#f0fdf4] dark:bg-green-900/20">
              <Check className="w-5 h-5 text-black" />
              <span className="text-sm text-black dark:text-green-400">
                {t("Comprobante existente", "Existing proof")}
              </span>
            </div>
          ) : file?.type.startsWith("image/") ? (
            <img
              src={preview!}
              alt="Preview"
              className="w-full max-h-64 object-contain bg-[#e8ecf1]/30"
            />
          ) : file?.type === "application/pdf" ? (
            <div className="flex items-center gap-3 p-4">
              <FileText className="w-8 h-8 text-red-500" />
              <div>
                <p className="text-sm font-medium">{file.name}</p>
                <p className="text-xs text-[#7b8fa1]">
                  {(file.size / 1024).toFixed(1)} KB
                </p>
              </div>
            </div>
          ) : null}

          <button
            onClick={clearFile}
            className="absolute top-2 right-2 p-1 rounded-full bg-[#fafbfc]/80 hover:bg-[#fafbfc] border shadow-sm"
            aria-label={t("Eliminar archivo", "Remove file")}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`flex flex-col items-center justify-center gap-2 p-8 rounded-xl border-2 border-dashed cursor-pointer transition-colors ${
            dragging
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-primary/40 hover:bg-accent/30"
          }`}
        >
          <Upload className="w-8 h-8 text-[#7b8fa1]" />
          <p className="text-sm text-[#7b8fa1] text-center">
            {t(
              "Arrastra tu comprobante aquí o haz clic para seleccionar",
              "Drag your proof here or click to select"
            )}
          </p>
          <p className="text-xs text-[#7b8fa1]">
            {t(
              `JPG, PNG, WEBP o PDF (máx. ${MAX_SIZE_MB}MB)`,
              `JPG, PNG, WEBP or PDF (max ${MAX_SIZE_MB}MB)`
            )}
          </p>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) validateAndSetFile(f);
        }}
        className="hidden"
      />

      {error && <p className="text-sm text-black">{error}</p>}
    </div>
  );
}
