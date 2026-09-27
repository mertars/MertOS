# MertOS — CLAUDE.md

Bu dosya, sonraki oturumlarda (Claude Code veya başka biri) bağlamı hızlıca
kazanmak için yazıldı. **Önce bunu oku.** Mimari kararlar, veri şeması,
tasarım token'ları ve "sıradaki adımlar" burada.

## 0. Durum

**1. Aşama tamamlandı.** Aşağıdaki her şey çalışır durumda, TypeScript
hataları sıfır, ESLint temiz, `npm run build` ve `npm run test` başarılı.

Tamamlanan fazlar (bkz. § 13 orijinal görev tanımı):
1. Temel: proje kurulumu, tasarım sistemi, Dexie şeması, modül registry, PWA
   (manifest + service worker), PIN kilidi.
2. Ana ekran ("Bugün"), Hızlı Ekle, Su modülü, Sigara modülü (sayaç, azaltma,
   bırakma, sağlık kazanımları, para, analiz).
3. Antrenman & Kondisyon: gömülü 8 haftalık program, program motoru, canlı
   oturum ekranı (interval/kuvvet/kardiyo), kişisel rekorlar, Kondisyon Skoru.
4. MertOS Skoru v1, Ayarlar, demo veri seed'i, Vitest testleri, bu döküman.

## 1. Stack ve komutlar

- Next.js 16 (App Router, **webpack** — Turbopack henüz Serwist ile uyumlu
  değil, bu yüzden `package.json`'daki `dev`/`build` script'leri `--webpack`
  bayrağıyla çalışıyor, sakın kaldırma).
- TypeScript strict, Tailwind CSS v4 (`@theme` ile token'lar, config dosyası
  yok — her şey `app/globals.css` içinde), Framer Motion, Recharts, Dexie
  (+ dexie-react-hooks), Zustand, Zod v4, date-fns (+ tr locale),
  lucide-react, Radix (Dialog/Switch/Toast/Tabs primitive'leri).
- `npm run dev` — geliştirme (Serwist SW geliştirmede devre dışı).
- `npm run build` — prod build (SW gerçekten bundle'lanır).
- `npm run typecheck`, `npm run lint`, `npm run test` (Vitest).
- `.npmrc` içinde `legacy-peer-deps=true` var — bazı paketlerin peer
  aralıkları henüz React 19.2/Next 16 ile tam hizalanmadığı için gerekli.

## 2. Klasör yapısı

```
app/
  layout.tsx            # kök layout, font, metadata, <Providers>
  page.tsx               # "/" → redirect("/bugun")
  manifest.ts, robots.ts, sw.ts, icon.png
  offline/               # Serwist navigation fallback sayfası
  (app)/                 # route group: TabBar + QuickAddSheet içeren kabuk
    layout.tsx
    bugun/
    hublar/page.tsx           # Hub'lar ızgarası
    hublar/[hub]/page.tsx     # jenerik hub özeti + modül kartları
    hublar/beden/antrenman/…  # modül-özel statik route'lar (bkz. § 4)
    hublar/beslenme/su/
    hublar/sigara/takip/
    ayarlar/
components/
  ui/          # tasarım sistemi primitifleri (Button, Card, Sheet, Ring…)
  shell/       # TabBar, PinGate, Providers, PageHeader, QuickAddSheet…
  home/        # "Bugün" ekranının kartları + dashboard reorder/hide
  hub/         # Hub'lar ızgarası + hub özet bileşenleri
  modules/     # modül-özel bileşenler: su/, sigara/, antrenman/ (+ session/)
  settings/    # Ayarlar'a özel alt bileşenler
lib/
  db/          # Dexie şeması, tipler, repo/* (tablo başına CRUD fonksiyonları)
  registry/    # modül + hub kayıt sistemi (bkz. § 3)
  scoring/     # MertOS Skoru motoru + Kondisyon Skoru (saf fonksiyonlar)
  programs/    # 8 haftalık program verisi + motor + rekorlar + zod şemaları
  session/     # canlı oturum segment kuyruğu (interval/finisher zamanlayıcı)
  cigarette/   # tetikleyici listesi + antrenman koruması penceresi
  pin/         # PIN hash (Web Crypto) + repo
  backup/      # JSON dışa/içe aktarma, tüm veriyi silme
  hooks/       # Dexie useLiveQuery sarmalayıcıları + skor hook'u
  store/       # Zustand: lock, toast, ui (quick-add sheet, dashboard edit)
  quick-add/   # Hızlı Ekle aksiyon listesi (kullanım sıklığına göre sıralı)
  nav.ts       # alt tab bar tanımı
data/seed/     # motivasyon cümleleri + demo veri üretici
```

## 3. Modül Registry (kritik mimari parça)

`lib/registry/modules.ts` uygulamanın **tek doğruluk kaynağı**dır: hangi
modüllerin/hub'ların var olduğu, hangi fazda tamamlandığı
(`phase: 1 | 2`), varsayılan açık/kapalı durumu, rengi ve route'u.

`CURRENT_PHASE = 1` sabiti UI'da neyin göründüğünü kontrol eder:
- `getEnabledModules/getEnabledHubs/getModulesForHub` sadece
  `phase <= CURRENT_PHASE && moduleToggles[id] !== false` olan kayıtları
  döndürür.
- Hub'lar ızgarası, ana ekran hub mini kartları, Ayarlar > Modüller listesi
  hep buradan besleniyor. **Hiçbir yerde elle "eğer modül X yoksa gizle"
  kontrolü yazılmadı** — 2. aşamada bir modülü açmak için tek yapılması
  gereken: `MODULES` dizisindeki ilgili kaydın `phase: 2`'sini
  `CURRENT_PHASE`'e eşit hale getirmek (ya da `CURRENT_PHASE = 2` yapmak) ve
  route'un işaret ettiği sayfayı yazmak.
- 2. aşamadaki tüm modüller (Aktivite, Kalp, Uyku, Vücut, Öğünler,
  Takviyeler, Zihin alt modülleri, Üretkenlik, Finans, Alışkanlık, Takvim)
  registry'de **zaten kayıtlı** (`phase: 2` ile) — sadece sayfaları yok.

Sigara hub'ının modül route'u bilinçli olarak `/hublar/sigara/takip`
(hub route'u olan `/hublar/sigara`'dan farklı) — böylece jenerik hub özeti
sayfası (`[hub]/page.tsx`) hiçbir zaman gölgelenmiyor ve Beden/Beslenme ile
aynı iki katmanlı gezinme deseni (hub özeti → modül detayı) korunuyor.

## 4. Veri şeması (Dexie)

`lib/db/schema.ts` + `lib/db/types.ts`. Versiyonlama kuralı: **var olan
alanı asla silme/tipini değiştirme**; 2. aşamada yeni tablo/alan eklerken
`this.version(2).stores({...})` şeklinde yeni bir migration adımı aç (Dexie
otomatik olarak eski verinin üzerine uygular, veri kaybı olmaz).

v1 tabloları: `profile`, `settings` (tekil kayıtlar — id `"me"` / `"app"`),
`workouts`, `strengthSets`, `personalRecords`, `programs`, `programProgress`,
`waterEntries`, `cigaretteEntries`, `cigaretteSettings`, `expenses`
(sadece sigara harcaması yazıyor, Finans modülü 2. aşamada okuyacak),
`quickAddUsage`.

Önemli tasarım kararı: **boolean/null/undefined alanlar indexlenmedi**
(IndexedDB bunları güvenilir indexleyemiyor) — `isActive`, `deletedAt` gibi
alanlar için sorgular `toArray()` + JS `filter()` ile yapılıyor. Veri hacmi
kişisel kullanım için küçük olduğundan performans sorun değil.

Soft-delete deseni: `deletedAt: string | null`. Silme = `deletedAt` set
etmek, "Geri al" toast'u = `deletedAt: null` yapmak. Su/Sigara/Antrenman
kayıtları bunu kullanıyor.

## 5. Skor motorları

- `lib/scoring/engine.ts` — **MertOS Skoru** (ana ekrandaki halkalar).
  Hareket / Yakıt (şimdilik sadece su) / Temiz halkaları + ağırlıklı toplam.
  Zihin halkası şimdilik `null` — `computeDailyScore` eksik halkaları
  **ağırlıkları yeniden normalize ederek** dışlıyor, yani 2. aşamada Zihin
  eklenince tek yapılacak iş `rings.zihin`'i gerçek bir değerle doldurmak
  (formül değişmeyecek). Seri (streak) `lib/hooks/use-mertos-score.ts`
  içinde geriye doğru gün gün tarama ile hesaplanıyor (son 45 gün, ilk
  eşik-altı günde durur).
- `lib/scoring/kondisyon.ts` — Antrenman modülüne özel **Kondisyon Skoru**
  (pace + VO2max + haftalık hacim, ağırlıklı ve eksik girdilerde yeniden
  normalize). "Dinlenik nabız trendi" girdisi 2. aşamadaki Kalp modülü
  gelince eklenecek — aynı normalize-etme deseni kullanılacak.
- İkisi de **saf fonksiyonlar**, Dexie'den bağımsız → `*.test.ts` dosyaları
  bunları doğrudan test ediyor.

## 6. Program motoru (Antrenman & Kondisyon)

- `lib/programs/kondisyon-8-hafta.ts` — gömülü "MertOS Kondisyon — 8 Hafta"
  programının statik verisi (haftalık ilerleme tablosu elle kalibre edildi:
  4. ve 8. hafta deload, %10 kuralına uyumlu artış).
- `lib/programs/engine.ts` — saf yardımcı fonksiyonlar: geçerli hafta
  numarası (program başlangıcından bu yana geçen takvim haftası, sona
  sabitlenir), bugünün planlı günü (`PROGRAM_SCHEDULE`: Salı/Perşembe/
  Cumartesi — sabit, uygulama genelinde tek program şeması), haftalık koşu
  artışını %10 ile sınırlama, RPE/his ortalamasına göre interval tekrar
  önerisi (`suggestIntervalAdjustment`).
- `lib/programs/records.ts` — kişisel rekor tespiti (1/5/10 km en iyi süre,
  en uzun koşu, hareket bazlı maks ağırlık/tekrar). Mesafe hedefe ±%5
  toleransla normalize ediliyor.
- `lib/session/segments.ts` + `components/modules/antrenman/session/*` —
  canlı oturum motoru: interval günleri ısınma+sprint segment kuyruğu,
  kuvvet günleri devre koşucusu (set/tekrar/RPE girişi + otomatik dinlenme
  sayacı), her iki günde de ortak "finisher" segment kuyruğu (ip atlama /
  EMOM). Wake Lock API ile ekran açık kalır, Web Audio ile geçiş bipleri.
- **Bilinçli kapsam daraltması:** Özel program oluşturma tek haftalık,
  tekrarlayan bir şablon (deload/periyotlama yok) — embedded 8 haftalık
  programın tam esnek gün-bazlı düzenlenmesi (satır satır değiştirme) yok;
  bunun yerine kullanıcı embedded programı örnek alıp kendi basit programını
  sıfırdan oluşturabiliyor ("Kendi Programını Oluştur"). 2. aşamada
  istenirse tam CRUD editörü eklenebilir.

## 7. Tasarım sistemi

Token'lar `app/globals.css` içinde `@theme` bloğunda (Tailwind v4 config
dosyası yok, her şey CSS). Koyu tema varsayılan; `:root[data-theme="light"]`
override'ları var. Tema değişimi `components/shell/theme-provider.tsx`
`<html data-theme>` attribute'unu ayarlıyor ("sistem" seçiliyse
`prefers-color-scheme` dinleniyor).

Modül aksan renkleri CSS değişkeni olarak (`--color-hareket`, `--color-su`,
`--color-sigara`, `--color-sigara-temiz`, `--color-kondisyon`,
`--color-zihin`, `--color-finans`, `--color-uyku`, `--color-uretkenlik`,
`--color-beslenme`) — bileşenler `var(${accentVar})` ile referans alıyor,
böylece 2. aşamada yeni bir modül eklendiğinde sadece registry'ye doğru
`accentVar`'ı yazmak yeterli.

Aktivite halkaları: `components/ui/activity-rings.tsx` (SVG, Framer Motion
ile animasyonlu dolum). Su modülünün "dolan şişe" görseli:
`components/modules/su/water-visual.tsx` (CSS keyframe dalga + animasyonlu
yükseklik).

## 8. PWA / Offline / PIN

- `app/manifest.ts` (Next'in yerleşik `MetadataRoute.Manifest`'i) +
  `app/sw.ts` (Serwist — precache + `defaultCache` runtime caching +
  `/offline` navigation fallback). İkonlar bağımlılıksız bir Node script'i
  ile üretildi (aktivite halkası motifi) — `public/icons/*` ve `app/icon.png`.
- PIN kilidi: `lib/pin/crypto.ts` (SHA-256 + salt, Web Crypto), hash/salt
  `settings` tablosunda saklanıyor. Kilit durumu (`useLockStore`) **bellekte,
  kalıcı değil** — uygulama her yeniden açılışta kilitleniyor (beklenen
  davranış). `components/shell/pin-gate.tsx` tüm `(app)` ağacını sarmalıyor.
- `robots.ts` → `noindex, nofollow`. Vercel'de gizli/tahmin edilmesi zor bir
  alt alan adı kullanılması README'de anlatılıyor.

## 9. Bilinçli kapsam daraltmaları (v1 basitleştirmeleri)

Bunlar hata değil, bütçe/zaman dengesi için bilinçli kararlar:

- **Birimler (metrik/imperial) ayarı UI'da yok.** Şema alanı (`unitSystem`)
  hazır ama hiçbir ekran gerçekten imperial dönüşüm yapmıyor; yarım/yanıltıcı
  bir toggle koymamak için Ayarlar'a hiç eklenmedi. 2. aşamada gerçek
  dönüşüm yazılınca eklenebilir.
- **Antrenman koruması "skora etkisi"** sadece bilgilendirici bir rozet
  (ShieldCheck) — MertOS Skoru formülüne zaman-bazlı bir ceza eklenmedi.
  Hook (`lib/cigarette/protection.ts`) hazır, istenirse `engine.ts`'e
  kolayca bağlanabilir.
- **Sigara "kondisyon skoruyla korelasyon"** tam bir zaman serisi
  korelasyonu değil; antrenman günü vs dinlenme günü ortalama sigara
  sayısını karşılaştıran basitleştirilmiş bir kart (`analiz-tab.tsx`).
- Ana ekran Dashboard'daki sabit "sigara" ve "hızlı şeritler" kartları,
  modül aç/kapa (`moduleToggles`) durumuna göre otomatik gizlenmiyor (sadece
  Hub'lar/Hub özet kartları registry-aware). Su veya Sigara modülünü
  kapatan bir kullanıcı bu iki kartı Ayarlar'dan elle gizleyebilir
  (Bugün > Düzenle).
- Apple Sağlık köprüsü, Bildirimler, AI Koç: 2. aşama — bu oturumda hiç
  UI/placeholder yok (kurala uygun).

## 10. Sonraki adımlar (2. Aşama)

Görev tanımındaki tam liste: Beslenme (Öğünler/Kalori/Takviyeler), Uyku,
Vücut, Zihin (ruh hali, stres, günlük, minnettarlık, okuma), Üretkenlik
(görevler, projeler, odak, günlük plan), Finans (gelir-gider, bütçe,
abonelik, birikim — `expenses` tablosu zaten sigara harcamasıyla dolu
geliyor), Alışkanlık & Hedef, Takvim & Rutin, İstatistik sekmesi, Bildirimler,
AI Koç (2 küçük API route: koç + bildirim gönderimi), Apple Sağlık köprüsü.

Her biri için: `lib/registry/modules.ts`'e route + `phase:1` güncellemesi,
Dexie'ye yeni `version(2)` migration'ı, sayfa + bileşenler. MertOS Skoru'na
Zihin halkasını eklemek için `use-mertos-score.ts`'teki `zihin: null`
satırını gerçek bir hesaplamayla değiştirmek yeterli.

## 11. Bilinen, kabul edilmiş uyarılar

- `npm audit`: `@serwist/next`'in transitive `browserslist` bağımlılığında
  yüksek şiddetli 2 uyarı var; düzeltmesi `@serwist/next`'i eski bir sürüme
  düşürüyor (breaking). Bu sadece **build-time** bir araç, kullanıcı
  verisiyle veya çalışma zamanı güvenliğiyle ilgisi yok — bilinçli olarak
  ertelendi.
- Next 16 varsayılanı Turbopack'tir ama Serwist henüz desteklemiyor; bu
  yüzden `dev`/`build` script'leri `--webpack` bayrağı zorunlu.
