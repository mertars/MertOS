"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Copy, KeyRound, Lock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label } from "@/components/ui/input";

// Giriş ekranı. Şifre henüz ayarlanmamışsa "kurulum" görünümü açılır: şifre
// tarayıcıda hash'lenir (bcrypt), sunucuya HİÇBİR ŞEY gönderilmez; çıkan
// metin Vercel'in ortam değişkenleri ekranına yapıştırılır.

interface Status {
  authConfigured: boolean;
  dbConfigured: boolean;
}

export default function GirisPage() {
  return (
    <Suspense fallback={null}>
      <GirisInner />
    </Suspense>
  );
}

function GirisInner() {
  const [status, setStatus] = useState<Status | null>(null);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    fetch("/api/auth/status", { cache: "no-store" })
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => setOffline(true));
  }, []);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-5 pt-safe pb-safe">
      <div className="w-full max-w-sm">
        <p className="text-center text-[28px] font-bold tracking-tight">MertOS</p>
        {offline && <p className="mt-6 text-center text-[13px] text-[var(--color-text-secondary)]">İnternet yok — giriş için bağlantı gerekli.</p>}
        {status && (status.authConfigured ? <LoginForm /> : <SetupHelper dbConfigured={status.dbConfigured} />)}
      </div>
    </div>
  );
}

function LoginForm() {
  const params = useSearchParams();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(undefined);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error ?? "Giriş başarısız.");
        setBusy(false);
        return;
      }
      const next = params.get("sonra");
      // Sadece site içi yollara dön (açık yönlendirme olmasın).
      window.location.replace(next && next.startsWith("/") && !next.startsWith("//") ? next : "/bugun");
    } catch {
      setError("İnternet bağlantısı yok.");
      setBusy(false);
    }
  }

  return (
    <Card className="mt-8">
      <form onSubmit={submit} className="space-y-4">
        <div className="flex items-center gap-2 text-[13px] text-[var(--color-text-secondary)]">
          <Lock className="h-4 w-4" /> Bu cihazda bir kez giriş yapman yeterli.
        </div>
        <div>
          <Label htmlFor="sifre">Şifre</Label>
          <Input id="sifre" type="password" autoComplete="current-password" autoFocus value={password} onChange={(e) => setPassword(e.target.value)} />
          <FieldError>{error}</FieldError>
        </div>
        <Button type="submit" className="w-full" disabled={busy || password.length === 0}>
          {busy ? "Kontrol ediliyor…" : "Giriş"}
        </Button>
      </form>
    </Card>
  );
}

function randomSecret(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function SetupHelper({ dbConfigured }: { dbConfigured: boolean }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [tursoUrl, setTursoUrl] = useState("");
  const [tursoToken, setTursoToken] = useState("");
  const [output, setOutput] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const mismatch = confirm.length > 0 && password !== confirm;
  const tooShort = password.length > 0 && password.length < 8;

  async function generate() {
    setBusy(true);
    const bcrypt = (await import("bcryptjs")).default;
    const hash = await bcrypt.hash(password, 12);
    const lines = [
      tursoUrl.trim() && `TURSO_DATABASE_URL=${tursoUrl.trim()}`,
      tursoToken.trim() && `TURSO_AUTH_TOKEN=${tursoToken.trim()}`,
      `APP_PASSWORD_HASH=${btoa(hash)}`,
      `SESSION_SECRET=${randomSecret()}`,
      `CRON_SECRET=${randomSecret()}`,
    ];
    setOutput(lines.filter(Boolean).join("\n"));
    setBusy(false);
  }

  async function copy() {
    await navigator.clipboard.writeText(output);
    setCopied(true);
  }

  return (
    <Card className="mt-8 space-y-4">
      <div className="flex items-start gap-2">
        <KeyRound className="h-5 w-5 shrink-0 text-[var(--color-warning)]" />
        <div>
          <p className="text-[15px] font-semibold">Kurulum: şifre belirle</p>
          <p className="text-[12.5px] text-[var(--color-text-secondary)] mt-1">
            Şifren bu telefonda/bilgisayarda şifrelenir, hiçbir yere gönderilmez. Çıkan metni Vercel&apos;e yapıştıracaksın.
          </p>
        </div>
      </div>
      {!output ? (
        <>
          <div>
            <Label htmlFor="yeni-sifre">Yeni şifre (en az 8 karakter)</Label>
            <Input id="yeni-sifre" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
            <FieldError>{tooShort ? "En az 8 karakter olmalı." : undefined}</FieldError>
          </div>
          <div>
            <Label htmlFor="yeni-sifre-2">Şifre tekrar</Label>
            <Input id="yeni-sifre-2" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            <FieldError>{mismatch ? "Şifreler aynı değil." : undefined}</FieldError>
          </div>
          {!dbConfigured && (
            <>
              <div>
                <Label htmlFor="turso-url">Turso adresi (libsql://…) — isteğe bağlı</Label>
                <Input id="turso-url" value={tursoUrl} onChange={(e) => setTursoUrl(e.target.value)} placeholder="libsql://mertos-....turso.io" />
              </div>
              <div>
                <Label htmlFor="turso-token">Turso anahtarı — isteğe bağlı</Label>
                <Input id="turso-token" type="password" value={tursoToken} onChange={(e) => setTursoToken(e.target.value)} />
              </div>
            </>
          )}
          <Button className="w-full" disabled={busy || password.length < 8 || password !== confirm} onClick={generate}>
            {busy ? "Hazırlanıyor…" : "Ayar metnini oluştur"}
          </Button>
        </>
      ) : (
        <>
          <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-all rounded-[12px] bg-black/40 p-3 text-[11px] leading-relaxed">{output}</pre>
          <Button className="w-full" onClick={copy}>
            <Copy className="h-4 w-4" /> {copied ? "Kopyalandı" : "Kopyala"}
          </Button>
          <ol className="list-decimal space-y-1 pl-5 text-[12.5px] text-[var(--color-text-secondary)]">
            <li>Vercel → projen → Settings → Environment Variables.</li>
            <li>İlk &quot;Key&quot; kutusuna tıkla ve yapıştır — satırlar kendiliğinden ayrılır.</li>
            <li>Save, sonra Deployments → son deploy → Redeploy.</li>
          </ol>
        </>
      )}
    </Card>
  );
}
