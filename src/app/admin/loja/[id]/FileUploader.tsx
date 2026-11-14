"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { formatBytes } from "@/lib/storeShared";

/**
 * Envio em partes (multipart) direto para o R2:
 * - divide o arquivo em pedaços de 64 MB;
 * - envia 4 pedaços ao mesmo tempo;
 * - tenta de novo até 3 vezes se um pedaço falhar.
 * Assim arquivos de vários GB não dependem de uma conexão perfeita.
 */

const CONCURRENCY = 4;
const RETRIES = 3;
const URL_BATCH = 50;

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

function putPart(url: string, blob: Blob, onProgress: (loaded: number) => void, xhrs: Set<XMLHttpRequest>) {
  return new Promise<string>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhrs.add(xhr);
    xhr.open("PUT", url);
    xhr.upload.onprogress = (e) => onProgress(e.loaded);
    xhr.onload = () => {
      xhrs.delete(xhr);
      const etag = xhr.getResponseHeader("ETag");
      if (xhr.status >= 200 && xhr.status < 300 && etag) resolve(etag);
      else if (xhr.status >= 200 && xhr.status < 300) reject(new Error("Sem ETag: libere o header ETag no CORS do bucket"));
      else reject(new Error(`R2 respondeu ${xhr.status}`));
    };
    xhr.onerror = () => {
      xhrs.delete(xhr);
      reject(new Error("Falha de rede"));
    };
    xhr.onabort = () => {
      xhrs.delete(xhr);
      reject(new Error("cancelado"));
    };
    xhr.send(blob);
  });
}

type Job = { name: string; size: number; sent: number; status: "enviando" | "finalizando" | "ok" | "erro" | "cancelado"; error?: string };

export default function FileUploader({ productId, disabled }: { productId: string; disabled?: boolean }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [job, setJob] = useState<Job | null>(null);
  const cancelRef = useRef<{ cancelled: boolean; xhrs: Set<XMLHttpRequest>; fileId?: string } | null>(null);
  const [speed, setSpeed] = useState<number>(0);

  const running = job?.status === "enviando" || job?.status === "finalizando";

  // Avisa antes de fechar a aba no meio do envio
  useEffect(() => {
    if (!running) return;
    const handler = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [running]);

  async function upload(file: File) {
    const ctl = { cancelled: false, xhrs: new Set<XMLHttpRequest>(), fileId: undefined as string | undefined };
    cancelRef.current = ctl;
    setJob({ name: file.name, size: file.size, sent: 0, status: "enviando" });

    const progress = new Map<number, number>();
    const started = Date.now();
    const update = () => {
      let sent = 0;
      for (const v of progress.values()) sent += v;
      setJob((j) => (j ? { ...j, sent } : j));
      const secs = (Date.now() - started) / 1000;
      if (secs > 1) setSpeed(sent / secs);
    };

    try {
      const { fileId, partSize, partCount } = await api({
        action: "start",
        productId,
        fileName: file.name,
        size: file.size,
        contentType: file.type || "application/octet-stream",
      });
      ctl.fileId = fileId;

      const urls: Record<number, string> = {};
      const etags: { partNumber: number; etag: string }[] = [];
      let next = 1;

      const getUrl = async (n: number) => {
        if (!urls[n]) {
          const batch = [];
          for (let i = n; i < n + URL_BATCH && i <= partCount; i++) if (!urls[i]) batch.push(i);
          const res = await api({ action: "parts", fileId, partNumbers: batch });
          Object.assign(urls, res.urls);
        }
        return urls[n];
      };

      const worker = async () => {
        while (!ctl.cancelled) {
          const n = next++;
          if (n > partCount) return;
          const start = (n - 1) * partSize;
          const blob = file.slice(start, Math.min(start + partSize, file.size));
          let lastErr: unknown;
          for (let attempt = 0; attempt < RETRIES && !ctl.cancelled; attempt++) {
            try {
              const url = await getUrl(n);
              const etag = await putPart(url, blob, (loaded) => {
                progress.set(n, loaded);
                update();
              }, ctl.xhrs);
              etags.push({ partNumber: n, etag });
              lastErr = null;
              break;
            } catch (e) {
              lastErr = e;
              progress.set(n, 0);
              // Link pode ter expirado: pede outro na próxima tentativa
              delete urls[n];
              await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
            }
          }
          if (lastErr) throw lastErr;
        }
      };

      await Promise.all(Array.from({ length: Math.min(CONCURRENCY, partCount) }, worker));
      if (ctl.cancelled) throw new Error("cancelado");

      setJob((j) => (j ? { ...j, status: "finalizando", sent: file.size } : j));
      await api({ action: "complete", fileId, parts: etags });
      setJob((j) => (j ? { ...j, status: "ok" } : j));
      router.refresh();
    } catch (e) {
      ctl.cancelled = true;
      for (const x of ctl.xhrs) x.abort();
      if (ctl.fileId) await api({ action: "abort", fileId: ctl.fileId }).catch(() => {});
      const msg = e instanceof Error ? e.message : "Erro";
      setJob((j) => (j ? { ...j, status: msg === "cancelado" ? "cancelado" : "erro", error: msg } : j));
      router.refresh();
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function cancel() {
    const ctl = cancelRef.current;
    if (!ctl) return;
    ctl.cancelled = true;
    for (const x of ctl.xhrs) x.abort();
  }

  const pct = job ? Math.min(100, Math.floor((job.sent / Math.max(1, job.size)) * 100)) : 0;
  const eta = job && speed > 0 && job.status === "enviando" ? Math.round((job.size - job.sent) / speed) : null;

  return (
    <div>
      <input ref={inputRef} type="file" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
      {!running && (
        <button
          type="button"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
          className="rounded-xl bg-[#b64cff] px-4 py-2.5 text-sm font-bold disabled:opacity-40"
        >
          + Enviar arquivo
        </button>
      )}

      {job && (
        <div className="mt-3 rounded-2xl border border-white/10 bg-black/20 p-4">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="truncate font-bold">{job.name}</span>
            <span className="shrink-0 text-xs text-[#aaa3b5]">
              {formatBytes(job.sent)} / {formatBytes(job.size)}
            </span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className={`h-full transition-all ${job.status === "erro" ? "bg-[#f07878]" : job.status === "ok" ? "bg-[#7ee2a8]" : "bg-[#b64cff]"}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-[#7d7588]">
            <span>
              {job.status === "enviando" && (
                <>
                  {pct}% • {formatBytes(speed)}/s{eta !== null && ` • falta ~${eta > 90 ? `${Math.round(eta / 60)} min` : `${eta} s`}`}
                </>
              )}
              {job.status === "finalizando" && "Juntando as partes..."}
              {job.status === "ok" && <span className="text-[#7ee2a8]">✓ Enviado</span>}
              {job.status === "cancelado" && "Envio cancelado"}
              {job.status === "erro" && <span className="text-[#f07878]">{job.error}</span>}
            </span>
            {job.status === "enviando" && (
              <button type="button" onClick={cancel} className="font-bold text-[#f07878]">Cancelar</button>
            )}
          </div>
          {running && <p className="mt-2 text-[11px] text-[#7d7588]">Não feche esta aba até terminar.</p>}
        </div>
      )}
    </div>
  );
}
