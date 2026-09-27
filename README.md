# MertOS

Mert'in kişisel hayat işletim sistemi. iPhone'da bir PWA (ana ekrana eklenen
uygulama) olarak çalışır. **Tüm verilerin telefonunda kalır** — bu proje
sadece kodu barındırmak için Vercel'e konur, hiçbir kişisel veri sunucuya
gitmez.

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

Uygulama tamamen offline çalışır — uçak modunda bile su, sigara, antrenman
kaydı yapabilirsin, veriler telefondaki IndexedDB'de tutulur. İlk açılışta
bir kez internetteyken açman, sayfaların önbelleğe alınması için yeterli.

### Bildirim izni

1. aşamada bildirim gönderimi yok (2. aşamada eklenecek), bu yüzden şimdilik
bir izin istemi görmeyeceksin.

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
npm run test       # Vitest — lib/scoring ve lib/programs birim testleri
```

Mimari, veri şeması ve "2. aşamada neler var" için **CLAUDE.md**'ye bak.
