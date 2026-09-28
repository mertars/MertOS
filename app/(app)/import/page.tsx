"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { ClipboardPaste, HeartPulse, CheckCircle2, AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { db } from "@/lib/db/schema";
import { parseHealthImportInput, HealthImportError } from "@/lib/health-import/parsers";
import { buildImportPreview, applyHealthImport, type ImportPreview } from "@/lib/health-import/apply";
import type { HealthImportPayload } from "@/lib/health-import/schema";
import { useToastStore } from "@/lib/store/toast-store";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

export default function ImportPage() {
  return (
    <Suspense fallback={null}>
      <ImportContent />
    </Suspense>
  );
}

function ImportContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const push = useToastStore((s) => s.push);
  const [raw, setRaw] = useState(() => {
    const fromQuery = searchParams.get("data");
    return fromQuery ? decodeURIComponent(fromQuery) : "";
  });
  const [payload, setPayload] = useState<HealthImportPayload | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const history = useLiveQuery(() => db.healthImportBatches.orderBy("importedAt").reverse().limit(5).toArray(), []);

  async function handleParse(text: string) {
    setError(null);
    setPayload(null);
    setPreview(null);
    if (!text.trim()) return;
    try {
      const parsed = parseHealthImportInput(text);
      const prev = await buildImportPreview(parsed);
      setPayload(parsed);
      setPreview(prev);
    } catch (e) {
      setError(e instanceof HealthImportError ? e.message : "Veri okunamadı, tekrar dene.");
    }
  }

  async function handlePasteFromClipboard() {
    try {
      const text = await navigator.clipboard.readText();
      setRaw(text);
      await handleParse(text);
    } catch {
      setError("Panoya erişilemedi — metni aşağıya elle yapıştır.");
    }
  }

  async function handleConfirm() {
    if (!payload || !preview) return;
    setSaving(true);
    await applyHealthImport(payload, preview);
    setSaving(false);
    setDone(true);
    push({ title: "Sağlık verisi içe aktarıldı", variant: "success" });
  }

  if (done) {
    return (
      <>
        <PageHeader eyebrow="Apple Sağlık" title="İçe Aktar" />
        <div className="px-5 mt-2">
          <Card className="flex flex-col items-center gap-3 py-8 text-center">
            <CheckCircle2 className="h-8 w-8 text-[var(--color-success)]" />
            <p className="text-[15px] font-semibold text-[var(--color-text-primary)]">Kaydedildi</p>
            <p className="text-[13px] text-[var(--color-text-secondary)]">{preview?.summaryText}</p>
            <Button variant="secondary" onClick={() => router.push("/bugun")}>
Bugün&apos;e dön
            </Button>
          </Card>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader eyebrow="Apple Sağlık" title="İçe Aktar" />
      <div className="px-5 mt-2 space-y-4 pb-4">
        {!preview && (
          <Card className="space-y-3">
            <p className="text-[13px] text-[var(--color-text-secondary)]">
              &quot;MertOS Sync&quot; Kestirmesini çalıştırdıktan sonra veriyi panoya kopyaladıysan aşağıdan içe aktarabilirsin.
              Kestirme kurulumu için Ayarlar → Veri → Apple Sağlık köprüsü rehberine bak.
            </p>
            <Button variant="accent" accentVar="--color-kondisyon" onClick={handlePasteFromClipboard} className="w-full">
              <ClipboardPaste className="h-4 w-4" />
              Panodan İçe Aktar
            </Button>
            <textarea
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              onBlur={() => handleParse(raw)}
              rows={5}
              placeholder="…ya da JSON verisini buraya yapıştır"
              className="w-full rounded-[14px] border border-[var(--color-border-strong)] bg-[var(--color-card-raised)] px-3.5 py-2.5 text-[12px] font-mono text-[var(--color-text-primary)] outline-none resize-none"
            />
            {error && (
              <div className="flex items-start gap-2 rounded-xl bg-[var(--color-danger)]/10 px-3 py-2.5">
                <AlertTriangle className="h-4 w-4 text-[var(--color-danger)] shrink-0 mt-0.5" />
                <p className="text-[12.5px] text-[var(--color-danger)]">{error}</p>
              </div>
            )}
          </Card>
        )}

        {preview && (
          <Card className="space-y-3">
            <p className="text-[15px] font-semibold text-[var(--color-text-primary)]">{preview.summaryText}</p>
            <div className="space-y-1.5 text-[13px] text-[var(--color-text-secondary)]">
              {preview.newWorkoutCount > 0 && <p>• {preview.newWorkoutCount} yeni antrenman eklenecek</p>}
              {preview.duplicateWorkoutCount > 0 && <p>• {preview.duplicateWorkoutCount} antrenman zaten kayıtlı, atlanacak</p>}
              {preview.restingHr && <p>• Dinlenik nabız: {preview.restingHr} bpm</p>}
              {preview.hrv && <p>• HRV: {preview.hrv} ms</p>}
              {preview.vo2max && <p>• VO2max: {preview.vo2max}</p>}
              {preview.weightKg && <p>• Kilo: {preview.weightKg} kg</p>}
              {preview.hasSleep && <p>• Uyku kaydı eklenecek</p>}
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={() => setPreview(null)}>
                Vazgeç
              </Button>
              <Button variant="accent" accentVar="--color-kondisyon" className="flex-1" disabled={saving} onClick={handleConfirm}>
                {saving ? "Kaydediliyor…" : "Onayla"}
              </Button>
            </div>
          </Card>
        )}

        <div>
          <p className="text-[13px] font-medium text-[var(--color-text-secondary)] mb-2 px-1">Son içe aktarmalar</p>
          {history && history.length > 0 ? (
            <Card>
              {history.map((h) => (
                <div key={h.id} className="flex items-center justify-between py-2 border-b border-[var(--color-border)] last:border-0">
                  <span className="text-[12.5px] text-[var(--color-text-primary)]">{h.summary}</span>
                  <span className="text-[11px] text-[var(--color-text-tertiary)]">{format(new Date(h.importedAt), "d MMM HH:mm", { locale: tr })}</span>
                </div>
              ))}
            </Card>
          ) : (
            <EmptyState icon={<HeartPulse className="h-6 w-6" />} title="Henüz içe aktarma yok" />
          )}
        </div>
      </div>
    </>
  );
}
