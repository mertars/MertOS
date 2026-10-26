# MertOS

Mert'in kişisel hayat işletim sistemi. iPhone'da bir PWA (ana ekrana eklenen
uygulama) olarak çalışır.

Veri iki yerde durur:

- **Asistan verisi** (günlük program, rutin işaretleri, öğün kayıtları,
  ayarlar, ileride hafıza ve sohbetler) → **Turso** bulut veritabanında.
  Telefon ve Mac aynı veriyi görür.
- **Eski modüllerin verisi** (su, sigara, antrenman, hub'lar…) → hâlâ
  telefonun kendi hafızasında (IndexedDB). Bunlara dokunulmadı.

Site tek şifreyle korunur: giriş yapmadan hiçbir sayfa açılmaz, hiçbir API
cevap vermez.

## Asistan kurulumu (Turso + şifre)

1. **Turso hesabı:** [app.turso.tech](https://app.turso.tech) → GitHub ile
   giriş → **Create Database** → ad: `mertos`, bölge: Avrupa (örn.
   Frankfurt) → oluştur.
2. Veritabanı sayfasında **Connect**'e tıkla: `libsql://…` adresini ve
   **Generate Token** ile oluşturulan anahtarı kopyala (anahtar bir kez
   gösterilir).
3. Siteyi aç: değişkenler henüz yoksa `/giris` sayfası **Kurulum** ekranı
   gösterir. Şifreni iki kez yaz, Turso adresini ve anahtarını yapıştır,
   **Ayar metnini oluştur** → **Kopyala**. (Şifre tarayıcıda şifrelenir,
   hiçbir yere gönderilmez.)
4. **Vercel → projen → Settings → Environment Variables** → ilk "Key"
   kutusuna yapıştır (satırlar kendiliğinden ayrılır) → **Save**.
5. **Deployments** → en üstteki deploy → **⋯ → Redeploy**.
6. Siteyi telefonda ve Mac'te birer kez aç, şifreyle gir. Oturum 180 gün
   sürer ve kullandıkça kendiliğinden uzar.

Haftalık yedek: Vercel Cron her Pazartesi 04:00'te (TR) asistan
tablolarının bir kopyasını aynı veritabanındaki `backups` tablosuna yazar
(son 8 kopya tutulur). Ayrıca **Ayarlar → Asistan → Sunucu yedeğini
indir** ile anlık bir JSON dosyası indirebilirsin.

## Vercel'e deploy

1. Bu repoyu kendi (özel/private) GitHub hesabına al.
2. [vercel.com](https://vercel.com) → **Add New Project** → repoyu seç.
3. Framework otomatik "Next.js" olarak algılanır, ekstra ayar gerekmez.
4. **Project Settings → Deployment Protection** kısmından erişimi
   kısıtlaman önerilir (Vercel Authentication veya Password Protection) —
   bu uygulama arama motorlarına kapalı (`robots: noindex, nofollow`) ama
   yine de linki bilmeyenin giremediğinden emin ol.
5. İsteğe bağlı: Vercel'in verdiği varsayılan `*.vercel.app` adresi yeterli;
   tahmin edilmesi zor olsun istiyorsan proje adını rastgele bir kelimeyle
   değiştir (örn. `mertos-x7q2.vercel.app`).
6. Deploy'u başlat. İlk build birkaç dakika sürer.

Not: `npm run build` script'i `next build --webpack` çalıştırır (Serwist
service worker'ı henüz Turbopack ile uyumlu değil) — Vercel bunu olduğu gibi
kullanır, ekstra ayar gerekmez.

## iPhone'a kurulum (Ana Ekrana Ekle)

1. iPhone'da **Safari**'yi aç (Chrome değil — "Ana Ekrana Ekle" ile PWA
   kurulumu sadece Safari'de tam çalışır).
2. Vercel'in verdiği adresi aç (örn. `https://mertos-x7q2.vercel.app`).
3. Alt ortadaki **Paylaş** ikonuna dokun (kare + yukarı ok).
4. Aşağı kaydır, **"Ana Ekrana Ekle"** seçeneğine dokun.
5. İsim "MertOS" olarak gelir, **Ekle**'ye dokun.
6. Ana ekranındaki MertOS ikonuna dokunarak aç — artık tam ekran, adres
   çubuğu olmadan, gerçek bir uygulama gibi açılır.
7. İlk açılışta PIN kilidi kapalı gelir; **Ayarlar → PIN Kilidi**'nden
   4-6 haneli bir PIN belirleyebilirsin.
8. Ana ekran ikonuna **uzun basarsan** üç hızlı kısayol görürsün: Su ekle,
   Sigara ekle, Koşu başlat.

### Offline kullanım

Eski modüller offline çalışır — uçak modunda bile su, sigara, antrenman
kaydı yapabilirsin, veriler telefondaki IndexedDB'de tutulur. Asistanın
günlük planı ise internet ister: bağlantı yoksa "Bugün" ekranı son
indirilen özeti "Çevrimdışı — son güncelleme …" etiketiyle gösterir,
işaretleme yapılamaz. Giriş için de bir kez internet gerekir.

## Apple Sağlık köprüsü

MertOS'un arka planda otomatik senkronizasyonu yok (native bir uygulama
değil, bir PWA) — `/import` sayfasına bir JSON yapıştırıyorsun/yüklüyorsun.
İki yol var, ilki çok daha az efor ister:

### Yöntem 1 — Health Auto Export uygulaması (önerilen)

1. App Store'dan ücretsiz **Health Auto Export – JSON+CSV** uygulamasını
   indir.
2. İçinde bir "Automation" ya da "Export" oluştur: adım sayısı, aktif
   enerji, dinlenik nabız, HRV, VO2 max, kilo, uyku analizi ve antrenmanları
   seç; format **JSON** olsun.
3. Dışa aktarılan JSON'u (Paylaş menüsünden "Panoya Kopyala" ya da dosya
   olarak) al.
4. MertOS'ta **Ayarlar → Veri → "Apple Sağlık'tan içe aktar"**a dokun,
   "Panodan Yapıştır"a dokun ya da dosyayı yükle. MertOS bu formatı otomatik
   tanır (`lib/health-import/parsers.ts` içindeki `fromHealthAutoExport`),
   önizlemeyi gösterir (kaç yeni antrenman, kaç tekrarlı/atlanan bulundu),
   onaylayınca kaydeder.

### Yöntem 2 — Kendi iOS Kısayolun ("MertOS Sync")

Daha az veri taşımak ya da tam kontrol istiyorsan, **Kısayollar**
uygulamasında normalize edilmiş "MertOS Sync" şeklini üreten bir Kısayol
kurabilirsin (bkz. `lib/health-import/schema.ts`):

1. Kısayollar → yeni kısayol → sırayla **Sağlık Örnekleri Bul** (adım,
   aktif enerji, dinlenik nabız, HRV, VO2 max, kilo, uyku analizi için ayrı
   ayrı) ve **Antrenmanları Bul** eylemlerini ekle.
2. Bulunan değerleri, aşağıdaki şekle uyan bir **Sözlük** (Dictionary)
   eyleminde topla (hepsi opsiyonel, sadece elindekini doldur):
   ```json
   {
     "source": "apple-shortcuts",
     "workouts": [
       { "type": "kosu", "startedAt": "2026-01-10T08:00:00Z", "durationSec": 1800, "distanceM": 5000, "avgHr": 145 }
     ],
     "steps": 8500,
     "activeEnergyKcal": 420,
     "restingHr": 58,
     "hrv": 45,
     "vo2max": 42,
     "weightKg": 78.5,
     "sleep": { "bedTime": "2026-01-09T23:30:00Z", "wakeTime": "2026-01-10T07:15:00Z", "durationMin": 435, "quality": 4 }
   }
   ```
   `type` alanı şunlardan biri olmalı: `kosu`, `interval`, `kuvvet`,
   `halisaha`, `yuruyus`, `ip_atlama`, `serbest`.
3. Sözlüğü **JSON'a Dönüştür**, sonra **URL Kodla**.
4. Son eylem olarak **URL'leri Aç**: `https://<domain>/import?data=[URL
   Kodlanmış JSON]` — bu, uygulamayı doğrudan önizleme ekranıyla açar.
   (Alternatif: JSON'u panoya kopyala, `/import`'u elle aç, "Panodan
   Yapıştır"a dokun.)
5. İstersen bu Kısayolu Sağlık uygulamasının "Otomasyon"larına (ör. her gün
   22:00'de) bağlayarak yarı-otomatik hale getirebilirsin — iOS güvenlik
   kısıtları yüzünden tam sessiz/arka plan çalışma garantisi yok, bildirim
   dokunuşu gerekebilir.

Her iki yöntemde de içe aktarma **çakışan antrenmanları otomatik atlar**
(±5 dk zaman + ±%10 süre toleransıyla eşleşen bir kayıt varsa "tekrarlı"
işaretlenir, tekrar eklenmez) — aynı JSON'u yanlışlıkla iki kez içe
aktarsan bile veri çoğalmaz.

## Bildirim sunucusu kurulumu (KAPATILDI)

> Asistan planı gereği bildirimler kapatıldı: `/api/push/*` uç noktaları
> 410 döner, Ayarlar menüsünden kaldırıldı. cron-job.org'da bir görev
> kurduysan silebilirsin. Aşağıdaki adımlar yalnızca kayıt için duruyor.

Push bildirimleri, tamamen opsiyonel küçük bir sunucu bileşeni ister —
**hiçbiri kurulmazsa uygulamanın geri kalanı sorunsuz çalışmaya devam
eder**, sadece Ayarlar → Bildirimler'de "sunucu yapılandırılmamış" uyarısı
görünür. Ham verin (su/sigara/antrenman kayıtların) hiçbir zaman bu
sunucuya gitmez — sadece bildirim metinlerinde kullanılacak yedi küçük
sayı/etiket (bkz. `lib/notifications/types.ts`).

1. **Upstash Redis** (aboneliği ve son gönderim kayıtlarını tutar):
   - [console.upstash.com](https://console.upstash.com) → ücretsiz bir
     hesap aç → **Create Database** (herhangi bir bölge, TLS açık).
   - Veritabanı sayfasında **REST API** bölümünden `UPSTASH_REDIS_REST_URL`
     ve `UPSTASH_REDIS_REST_TOKEN` değerlerini kopyala.
2. **VAPID anahtar çifti** (push mesajlarını imzalamak için):
   - Yerelde `npx web-push generate-vapid-keys` çalıştır, çıkan Public/
     Private anahtarları kopyala.
   - `VAPID_PUBLIC_KEY` ve `NEXT_PUBLIC_VAPID_PUBLIC_KEY` **aynı** public
     anahtar olmalı; `VAPID_PRIVATE_KEY` sadece sunucuda kalır.
   - `VAPID_SUBJECT` bir `mailto:` adresi olmalı (herhangi bir e-posta).
3. Bu değerleri (+ rastgele bir `CRON_SECRET`) **Vercel → Project Settings
   → Environment Variables**'a ekle ve yeniden deploy et. (`.env.example`
   dosyasına bak.)
4. **cron-job.org** (veya benzeri ücretsiz bir cron servisi) ile
   `https://<domain>/api/push/tick?secret=<CRON_SECRET>` adresini her
   5 dakikada bir çağıracak bir görev kur — bildirimler zamanlaması bu
   uç noktanın düzenli tetiklenmesine dayanır (Vercel'de kalıcı bir arka
   plan zamanlayıcı yok).
5. Ayarlar → Bildirimler'den bildirimleri aç, kategorileri/saatleri/
   şablonları düzenle, "Test bildirimi gönder" ile doğrula.

## Asistan sohbeti — Gemini anahtarı

Sohbet Google Gemini API'sini **ücretli (faturalandırması açık) bir
anahtarla** kullanır. Anahtar yalnızca sunucuda (Vercel ortam değişkeni)
durur, tarayıcıya ve git'e asla gitmez.

Maliyet korumaları:
- Uygulama içi günlük sınır: `LLM_GUNLUK_SINIR` (varsayılan 200 çağrı/gün).
  Aşılınca sohbet "limitim doldu" der, Google'a istek gitmez.
- Google tarafında: AI Studio → proje → **harcama sınırı (spend cap)** koy;
  Google Cloud → Billing → **Budgets & alerts** ile e-posta uyarısı kur.
- Google Cloud → APIs & Services → Credentials → anahtar → **API
  restrictions** → yalnızca "Generative Language API".

Kurulum: Vercel → Settings → Environment Variables → `GEMINI_API_KEY`
(isteğe bağlı `LLM_GUNLUK_SINIR`) → Save → Redeploy.

Senaryo seti (cevap kalitesi ölçümü): `GEMINI_API_KEY=… npm run senaryo`
→ `scenarios/sonuclar/` altına bir tablo yazar.

## Yedekleme

**Ayarlar → Veri → Dışa aktar**, tüm verini tek bir JSON dosyası olarak
indirir (Dosyalar uygulamasına ya da iCloud'a kaydedebilirsin). Yedek
almadıysan veya son yedeğin 7 günden eskiyse Ayarlar'da bir hatırlatma
rozeti görürsün. **İçe aktar** aynı ekrandan, önceden alınmış bir JSON
yedeğini geri yükler.

## Geliştirme

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # prod build (service worker dahil)
npm run typecheck
npm run lint
npm run test       # Vitest — scoring/programs/notifications/health-import/stats birim testleri
```

Mimari, veri şeması ve bilinçli kapsam daraltmaları için **CLAUDE.md**'ye bak.
