"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

async function api(body: Record<string, unknown>) {
  const res = await fetch("/api/admin/store/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Erro ${res.status}`);
  return data;
}

export default function ImageUploader({ productId, disabled }: { productId: string; disabled?: boolean }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onPick(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const { url, key } = await api({ action: "image", productId, contentType: file.type, size: file.size });
      const put = await fetch(url, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
      if (!put.ok) throw new Error("Falha ao enviar a imagem (confira o CORS do bucket)");
      await api({ action: "imageDone", productId, key });
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao enviar");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={(e) => onPick(e.target.files?.[0])}
      />
      <button
        type="button"
        disabled={disabled || busy}
        onClick={() => inputRef.current?.click()}
        className="rounded-xl border border-white/15 px-4 py-2 text-xs font-bold disabled:opacity-40"
      >
        {busy ? "Enviando..." : "Escolher imagem"}
      </button>
      {error && <p className="mt-2 text-xs text-[#f07878]">{error}</p>}
    </div>
  );
}
