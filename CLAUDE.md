# MertOS — CLAUDE.md

Bu dosya, sonraki oturumlarda (Claude Code veya başka biri) bağlamı hızlıca
kazanmak için yazıldı. **Önce bunu oku.** Mimari kararlar, veri şeması,
tasarım token'ları ve "sıradaki adımlar" burada.

## 0. Durum

**1. ve 2. Aşama tamamlandı.** Aşağıdaki her şey çalışır durumda, TypeScript
hataları sıfır, ESLint temiz, `npm run build` ve `npm run test` başarılı.
`lib/registry/modules.ts`'teki `CURRENT_PHASE = 2` — yani tüm modüller,
Hub'lar ve alt tab bar'daki İstatistik/Koç sekmeleri artık UI'da görünür.

Tamamlanan fazlar (bkz. § 14 orijinal görev tanımları — 1. ve 2. aşama):
1. Temel: proje kurulumu, tasarım sistemi, Dexie şeması, modül registry, PWA
   (manifest + service worker), PIN kilidi.
2. Ana ekran ("Bugün"), Hızlı Ekle, Su modülü, Sigara modülü (sayaç, azaltma,
   bırakma, sağlık kazanımları, para, analiz).
3. Antrenman & Kondisyon: gömülü 8 haftalık program, program motoru, canlı
   oturum ekranı (interval/kuvvet/kardiyo), kişisel rekorlar, Kondisyon Skoru.
4. MertOS Skoru v1, Ayarlar, demo veri seed'i, Vitest testleri.
5. Dexie v2 şema + Beslenme (besin DB, makro hedefleri, öğün şablonları,
   fotoğraf, takviyeler).
6. Apple Sağlık köprüsü (`/import`), Uyku, Vücut, Kalp, Aktivite (adım).
7. Zihin (ruh hali/enerji/stres, günlük, minnettarlık, okuma), Üretkenlik
   (görevler, projeler, odak), Finans (gelir-gider, bütçe, abonelik,
   birikim), Alışkanlık & Hedef, Takvim & Rutin.
8. MertOS Skoru tam sürüm (4 halka), rozetler, seviye/XP, haftalık rapor,
   İstatistik sekmesi (korelasyonlar).
9. Sunucu tarafı bildirim sistemi (Web Push) + Ayarlar > Bildirimler UI.
10. AI Koç (`/koc` sekmesi, Anthropic API).
11. Cilalama: ana ekran/hızlı ekle'nin 2. aşama modülleriyle tamamlanması,
    `CURRENT_PHASE` bump, ek birim testleri, bu döküman + README'nin
    tam güncellemesi.

## 1. Stack ve komutlar

- Next.js 16 (App Router, **webpack** — Turbopack henüz Serwist ile uyumlu
  değil, bu yüzden `package.json`'daki `dev`/`build` script'leri `--webpack`
  bayrağıyla çalışıyor, sakın kaldırma).
- TypeScript strict, Tailwind CSS v4 (`@theme` ile token'lar, config dosyası
  yok — her şey `app/globals.css` içinde), Framer Motion, Recharts, Dexie
  (+ dexie-react-hooks), Zustand, Zod v4, date-fns (+ date-fns-tz, tr
  locale), lucide-react, Radix (Dialog/Switch/Toast/Tabs primitive'leri).
- Sunucu tarafı (opsiyonel, bkz. § 10-11): `web-push`, `@upstash/redis`,
  `server-only` (server-only modüllerin client bundle'ına sızmasını derleme
  zamanında engelleyen guard paketi).
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
  api/
    coach/route.ts        # AI Koç — Anthropic Messages API proxy'si
    push/
      subscribe/route.ts   # Push aboneliğini Redis'e kaydeder
      unsubscribe/route.ts # Aboneliği siler
      summary/route.ts     # İstemcinin gönderdiği küçük özeti kaydeder
      test/route.ts         # Anlık test bildirimi gönderir
      tick/route.ts         # cron-job.org'un ~5 dk'da bir çağırdığı zamanlayıcı
  (app)/                 # route group: TabBar + QuickAddSheet içeren kabuk
    layout.tsx
    bugun/
    hublar/page.tsx           # Hub'lar ızgarası
    hublar/[hub]/page.tsx     # jenerik hub özeti + modül kartları
    hublar/beden/{antrenman,aktivite,kalp,uyku,vucut}/
    hublar/beslenme/{su,ogunler,takviyeler}/
    hublar/sigara/takip/
    hublar/zihin/{ruh-hali,stres,gunluk,minnettarlik,okuma}/
    hublar/uretkenlik/{gorevler,projeler,odak}/
    hublar/finans/{gelir-gider,butce,abonelikler,birikim}/
    hublar/aliskanlik/{aliskanliklar,hedefler}/
    hublar/takvim/{cizelge,rutinler}/
    import/                   # Apple Sağlık köprüsü — JSON yapıştır/yükle
    istatistik/                # zaman aralığı seçici + korelasyon kartları
    koc/                       # AI Koç sohbet ekranı
    ayarlar/
    ayarlar/bildirimler/       # push bildirim ayarları + şablon editörü
components/
  ui/          # tasarım sistemi primitifleri (Button, Card, Sheet, Ring…)
  shell/       # TabBar, PinGate, Providers, PageHeader, QuickAddSheet,
               # AutoOpenFromQuery (Hızlı Ekle'nin ?ekle=1 yönlendirmesi)…
  home/        # "Bugün" ekranının kartları + dashboard reorder/hide
  hub/         # Hub'lar ızgarası + hub özet bileşenleri (her hub için
               # HubQuickMetric alt bileşeni)
  modules/     # modül-özel bileşenler: su/, sigara/, antrenman/ (+ session/),
               # beslenme/, uyku/, vucut/, kalp/, zihin/, uretkenlik/,
               # finans/, koc/
  settings/    # Ayarlar'a özel alt bileşenler (+ settings/notifications/)
  stats/       # İstatistik sekmesi kartları (seviye, rozetler, korelasyon,
               # haftalık rapor sheet'i)
lib/
  db/          # Dexie şeması, tipler, repo/* (tablo başına CRUD fonksiyonları)
  registry/    # modül + hub kayıt sistemi (bkz. § 3)
  scoring/     # MertOS Skoru motoru, Kondisyon Skoru, XP/seviye (saf fonksiyonlar)
  programs/    # 8 haftalık program verisi + motor + rekorlar + zod şemaları
  session/     # canlı oturum segment kuyruğu (interval/finisher zamanlayıcı)
  cigarette/   # tetikleyici listesi + antrenman koruması penceresi
  pin/         # PIN hash (Web Crypto) + repo
  backup/      # JSON dışa/içe aktarma, tüm veriyi silme
  hooks/       # Dexie useLiveQuery sarmalayıcıları + skor/seviye/rozet/
               # istatistik/streak hook'ları
  store/       # Zustand: lock, toast, ui (quick-add sheet, dashboard edit)
  quick-add/   # Hızlı Ekle aksiyon listesi (kullanım sıklığına göre sıralı)
  nav.ts       # alt tab bar tanımı
  nutrition/   # TDEE/BMR/makro hedef hesaplama (saf fonksiyonlar)
  health-import/ # Apple Sağlık JSON içe aktarma: şema, parser'lar, uygulama
  sleep/       # uyku borcu + ideal yatış saati hesaplama (saf fonksiyonlar)
  aliskanlik/  # alışkanlık↔skor metriği bağlama mantığı
  badges/      # rozet tanımları + değerlendirme motoru
  reports/     # haftalık rapor derleme (saf fonksiyon)
  stats/       # Pearson korelasyon + açıklama metni (saf fonksiyonlar)
  notifications/ # Web Push: şablonlar, zamanlayıcı (saf fonksiyon),
                  # server-store (Redis, server-only), push-sender
                  # (web-push, server-only), subscribe.ts (client)
  coach/       # AI Koç: context.ts (Dexie'den küçük özet çıkarır),
               # anthropic.ts (server-only, Anthropic API çağrısı),
               # prompts.ts (sistem/kullanıcı promptları)
  audio/       # Web Audio geçiş bipleri (canlı oturum)
  media/       # fotoğraf sıkıştırma (öğün/vücut fotoğrafları)
data/seed/     # motivasyon cümleleri, besin DB, öğün şablonları, demo veri
```

## 3. Modül Registry (kritik mimari parça)

`lib/registry/modules.ts` uygulamanın **tek doğruluk kaynağı**dır: hangi
modüllerin/hub'ların var olduğu, hangi fazda tamamlandığı
(`phase: 1 | 2`), varsayılan açık/kapalı durumu, rengi ve route'u.

`CURRENT_PHASE` sabiti UI'da neyin göründüğünü kontrol eder — **şu an 2**:
- `getEnabledModules/getEnabledHubs/getModulesForHub` sadece
  `phase <= CURRENT_PHASE && moduleToggles[id] !== false` olan kayıtları
  döndürür.
- Hub'lar ızgarası, ana ekran hub mini kartları, Ayarlar > Modüller listesi,
  alt tab bar (`lib/nav.ts`, aynı `phase` deseniyle İstatistik/Koç
  sekmelerini gösterir/gizler) hep buradan besleniyor. **Hiçbir yerde elle
  "eğer modül X yoksa gizle" kontrolü yazılmadı.**
- Bir sonraki aşamada yeni modül eklemek için: `MODULES` dizisine yeni bir
  kayıt (`phase: 3` gibi) eklemek, `CURRENT_PHASE`'i buna eşitlemek, ve
  route'un işaret ettiği sayfayı yazmak yeterli.

Sigara hub'ının modül route'u bilinçli olarak `/hublar/sigara/takip`
(hub route'u olan `/hublar/sigara`'dan farklı) — böylece jenerik hub özeti
sayfası (`[hub]/page.tsx`) hiçbir zaman gölgelenmiyor ve diğer hub'larla
aynı iki katmanlı gezinme deseni (hub özeti → modül detayı) korunuyor.

`components/hub/hub-quick-metric.tsx` her hub için "büyük metrik" satırını
üretir — `hubId`'ye göre switch yapan küçük bir bileşen seti (jenerik değil,
her hub'ın en anlamlı günlük özetini elle seçiyoruz: Beden→haftalık
antrenman sayısı, Beslenme→su, Sigara→bugünkü adet, Zihin→bugün kayıt var
mı, Üretkenlik→açık görev sayısı, Finans→bu ayki net, Alışkanlık→bugünkü
tamamlanma oranı, Takvim→bugünkü blok sayısı). Yeni bir hub eklenirse burada
bir `if` daha eklemek gerekiyor — bu, registry'nin "hiçbir yerde elle
kontrol yok" ilkesinin **bilinçli tek istisnası** (bkz. § 12).

## 4. Veri şeması (Dexie)

`lib/db/schema.ts` + `lib/db/types.ts`. Versiyonlama kuralı: **var olan
alanı asla silme/tipini değiştirme, ve zaten `npm run build`/kullanıcıya
push edilmiş bir version() bloğundaki index string'ini değiştirme**; yeni
tablo/alan eklerken `this.version(3).stores({...})` şeklinde yeni bir
migration adımı aç (Dexie otomatik olarak eski verinin üzerine uygular,
veri kaybı olmaz). **v2 bu kuralın altına girmez** çünkü bu oturumda
oluşturuldu ve henüz gerçek kullanıcı verisiyle hiç deploy edilmedi — bu
yüzden v2 bloğu üzerinde (v1'e dokunmadan) birkaç kez küçük düzeltme
yapıldı (bkz. § 12).

v1 tabloları (bkz. Faz 1-4): `profile`, `settings`, `workouts`,
`strengthSets`, `personalRecords`, `programs`, `programProgress`,
`waterEntries`, `cigaretteEntries`, `cigaretteSettings`, `expenses`,
`quickAddUsage`.

v2 tabloları (bkz. Faz 5-9), gruplandırılmış:
- **Beslenme**: `foods`, `recipes`, `mealEntries`, `mealTemplates`,
  `mealPhotos`, `nutritionSettings`, `supplements`, `supplementLogs`.
- **Sağlık köprüsü**: `sleepEntries`, `bodyMetrics`, `bodyPhotos`,
  `heartMetrics`, `activityDaily`, `healthImportBatches`.
- **Zihin**: `moodEntries`, `journalEntries`, `gratitudeEntries`, `books`,
  `readingLogs`.
- **Üretkenlik**: `tasks`, `projects`, `focusSessions`.
- **Finans**: `categoryBudgets`, `subscriptions`, `savingsGoals`,
  `savingsContributions` (+ v1'deki `expenses` artık `type` alanıyla
  gelir/gider ayrımı da yapıyor).
- **Alışkanlık & Hedef**: `habits`, `habitLogs`, `longTermGoals`.
- **Takvim & Rutin**: `scheduleBlocks`, `routineTemplates`,
  `importantDates`.
- **Skor/Bildirim/Koç**: `earnedBadges`, `coachMessages`,
  `notificationSettings`.

Tekil kayıt (`SINGLETON_IDS`, `lib/db/index.ts`): `profile`(`me`),
`settings`(`app`), `cigaretteSettings`(`sigara`),
`nutritionSettings`(`beslenme`), `notificationSettings`(`bildirim`).
`ensureDefaults()` her açılışta bunları (yoksa) oluşturur; registry'ye ya
da bildirim kategorilerine yeni bir kayıt eklendiğinde de (geriye dönük
uyumluluk için) eksik alt-anahtarları tamamlar.

Önemli tasarım kararı: **boolean alanlar indexlenmedi** (IndexedDB bunları
güvenilir indexleyemiyor) — `isActive`, `active`, `done` gibi alanlar için
sorgular `toArray()` + JS `filter()` ile yapılıyor. `deletedAt: string|null`
istisna: bu **indexlendi** (hem v1 hem v2'de tutarlı) çünkü `string|null`
IndexedDB'de güvenilir bir anahtar — ama yine de hiçbir yerde doğrudan
`.where("deletedAt")` ile sorgulanmıyor, sadece `toArray()+filter()` deseni
kullanılıyor (indexin varlığı ileride gerekebilecek bir "silinenler" görünümü
için hazır bekliyor). Veri hacmi kişisel kullanım için küçük olduğundan
performans sorun değil.

Soft-delete deseni: `deletedAt: string | null`. Silme = `deletedAt` set
etmek, "Geri al" toast'u = `deletedAt: null` yapmak. Çoğu modül (Su, Sigara,
Antrenman, Öğün, Uyku, Vücut, Ruh Hali, Günlük, Görev, İşlem) bunu kullanıyor.

## 5. Skor motorları

- `lib/scoring/engine.ts` — **MertOS Skoru** (ana ekrandaki 4 halka:
  Hareket / Yakıt / Temiz / Zihin). `computeDailyScore` eksik halkaları
  **ağırlıkları yeniden normalize ederek** dışlıyor. Varsayılan ağırlıklar
  `{hareket:0.3, yakit:0.25, temiz:0.25, zihin:0.2}` (Ayarlar'dan
  değiştirilebilir).
  - Hareket: antrenman + adım (varsa) karışımı.
  - Yakıt: su + protein hedefi (öğün varsa ortalaması, yoksa sadece su).
  - Temiz: sigara limit uyumu (bırakma modunda 0 sigara = 100).
  - Zihin: uyku + ruh hali + odak süresi alt-halkalarının karışımı
    (`computeZihinRing`) — bunlardan biri eksikse yine yeniden normalize
    edilir.
  - Seri (streak) hesaplama artık `computeCurrentStreak()` olarak
    `lib/hooks/use-mertos-score.ts`'ten export edilip hem canlı hook'ta hem
    de `lib/coach/context.ts`'te (AI Koç'un bağlamı için) paylaşılıyor (son
    45 gün, ilk eşik-altı günde durur, eşik 60).
- `lib/scoring/kondisyon.ts` — Antrenman modülüne özel **Kondisyon Skoru**
  (pace + VO2max + haftalık hacim + dinlenik nabız trendi — Kalp modülü
  geldiğinde eklendi — ağırlıklı ve eksik girdilerde yeniden normalize).
- `lib/scoring/xp.ts` — Basit seviye/XP: XP, geçmiş günlerin skorundan
  türetilir (event defteri yok, tamamen deterministik/saf), seviye eşiği
  üçgensel sayı ile ölçekleniyor (`50 * level * (level+1)`).
- `lib/badges/definitions.ts` + `engine.ts` — 10 statik rozet tanımı, her
  biri async bir `check()` predicate'i; `earnedBadges` tablosuna kaydediliyor,
  Bugün ekranı mount olduğunda fırsatçı biçimde değerlendiriliyor
  (`use-badge-evaluation.ts`), kazanılan her rozet bir toast olarak gösteriliyor.
- `lib/reports/weekly.ts` — haftalık rapor derleme (saf fonksiyon,
  `components/stats/weekly-report-sheet.tsx` tüketiyor).
- `lib/stats/correlation.ts` — basit Pearson korelasyonu + Türkçe açıklama
  cümlesi üreten saf fonksiyonlar (`lib/hooks/use-correlations.ts` bunu
  gerçek modül çiftleri için — ör. uyku↔ruh hali, sigara↔kondisyon —
  çalıştırıyor).
- Hepsi **saf fonksiyonlar**, Dexie'den bağımsız → `*.test.ts` dosyaları
  bunları doğrudan test ediyor.

## 6. Program motoru (Antrenman & Kondisyon)

- `lib/programs/kondisyon-8-hafta.ts` — gömülü "MertOS Kondisyon — 8 Hafta"
  programının statik verisi (haftalık ilerleme tablosu elle kalibre edildi:
  4. ve 8. hafta deload, %10 kuralına uyumlu artış).
- `lib/programs/engine.ts` — saf yardımcı fonksiyonlar: geçerli hafta
  numarası, bugünün planlı günü (`PROGRAM_SCHEDULE`: Salı/Perşembe/
  Cumartesi), haftalık koşu artışını %10 ile sınırlama, RPE/his ortalamasına
  göre interval tekrar önerisi.
- `lib/programs/records.ts` — kişisel rekor tespiti.
- `lib/session/segments.ts` + `components/modules/antrenman/session/*` —
  canlı oturum motoru (interval/kuvvet/finisher segment kuyruğu, Wake Lock,
  Web Audio geçiş bipleri — bkz. `lib/audio/`).
- **Bilinçli kapsam daraltması:** Özel program oluşturma tek haftalık,
  tekrarlayan bir şablon (deload/periyotlama yok). AI Koç'un "Program Öner"
  aksiyonu da CRUD değil, serbest metin öneri (bkz. § 9 Koç).

## 7. Tasarım sistemi

Token'lar `app/globals.css` içinde `@theme` bloğunda. Koyu tema varsayılan;
`:root[data-theme="light"]` override'ları var. `@media
(prefers-reduced-motion: reduce)` global CSS transition/animation
süresini sıfıra indiriyor (bkz. § 9 — bu, Framer Motion'ın JS-tabanlı
animasyonlarını KAPSAMAZ, sadece CSS transition/animation'ları).

Modül aksan renkleri CSS değişkeni olarak (`--color-hareket`, `--color-su`,
`--color-sigara`, `--color-sigara-temiz`, `--color-kondisyon`,
`--color-zihin`, `--color-finans`, `--color-uyku`, `--color-uretkenlik`,
`--color-beslenme`) — bileşenler `var(${accentVar})` ile referans alıyor.
Yeni bir hub/modül eklenince tek yapılması gereken registry'ye doğru
`accentVar`'ı yazmak.

`components/ui/toaster.tsx` toast `variant`'ına (`default`/`success`/
`danger`) göre farklı ikon + renk gösterir (`Info`/`CheckCircle2`/
`AlertCircle`) — bu, 2. aşamada (AI Koç'un hata durumlarını test ederken)
fark edilip düzeltilen bir 1. aşama hatasıydı (önceden her toast, variant'tan
bağımsız yeşil bir onay ikonu gösteriyordu).

## 8. PWA / Offline / PIN

- `app/manifest.ts` + `app/sw.ts` (Serwist — precache + `defaultCache`
  runtime caching + `/offline` navigation fallback + **push/notificationclick
  event listener'ları**, bkz. § 10).
- PIN kilidi: `lib/pin/crypto.ts` (SHA-256 + salt, Web Crypto). Kilit durumu
  bellekte, kalıcı değil.
- `robots.ts` → `noindex, nofollow`.

## 9. Apple Sağlık köprüsü (`/import`)

iOS'ta arka planda otomatik senkronizasyon yok (bu bir PWA, native değil) —
kullanıcı **iOS Kısayolları (Shortcuts)** ile bir JSON üretip `/import`
sayfasına yapıştırıyor/yüklüyor.

- `lib/health-import/schema.ts` — normalize edilmiş "MertOS Sync" şeması
  (Zod). Bu Kısayolun üreteceği hedef şekil.
- `lib/health-import/parsers.ts` — `parseHealthImportInput(rawText)`: önce
  ham JSON'un doğrudan normalize şemaya uyup uymadığına bakar
  (`looksLikeDirectFormat` — en az bir tanıdık üst-seviye alan var mı diye
  kontrol eder, **çünkü şemanın her alanı optional/default'lı olduğu için
  boş bir obje bile "başarılı" sayılırdı** — bu tam olarak bu fazda
  `parsers.test.ts` yazılırken ortaya çıkan gerçek bir bug'dı, bkz. § 12).
  Uymuyorsa **Health Auto Export** uygulamasının yaygın JSON şeklini
  (`data.metrics[]` / `data.workouts[]`) best-effort normalize eder.
  İkisi de tutmazsa `HealthImportError` fırlatır.
- `lib/health-import/apply.ts` — `buildImportPreview` (dedup: ±5 dk zaman +
  ±%10 süre toleransıyla var olan antrenmanlarla eşleşeni "duplicate"
  işaretler) ve `applyHealthImport` (önizlemeyi Dexie'ye yazar: antrenmanlar,
  adım/aktif enerji, kalp metrikleri, kilo, uyku).
- README'de tam kurulum adımları var (bkz. README § Apple Sağlık köprüsü —
  hem Health Auto Export uygulaması hem elle Kısayol kurma yöntemi).

## 10. Bildirimler (Web Push)

Tamamen **opsiyonel** bir sunucu bileşeni — kurulmazsa uygulamanın geri
kalanı sorunsuz çalışır, sadece ilgili uç noktalar 503 döner.

- `lib/notifications/types.ts` — `NotificationSummary` (istemcinin sunucuya
  gönderdiği YALNIZCA 7-8 küçük alan: su_kalan, sigara_bugun, seri, vb — ham
  kayıt asla gitmez), `ALL_CATEGORIES` (su/antrenman/sigara/uyku/beslenme/
  gorevler/aliskanliklar/haftalik_rapor/koc).
- `lib/notifications/templates.ts` — kategori başına varsayılan saatler +
  çoklu şablon metni (`{degisken}` interpolasyonu), `SAMPLE_SUMMARY`
  (Ayarlar'daki şablon önizlemesi için).
- `lib/notifications/scheduler.ts` — `shouldFireNow()`: **saf, test edilebilir**
  fonksiyon. Üç ısrar düzeyi: sakin (günde en fazla 1), normal (yapılandırılmış
  her saatte 1), israrci (hedef tutmadıysa yapılandırılmış saatlerin
  yanında ilave olarak her 2 saatte bir tekrarlar, günlük üst sınır 6).
  Sessiz saatler gece yarısını geçen aralıkları da doğru ele alıyor.
  Testler: `scheduler.test.ts`.
- `lib/notifications/server-store.ts`, `push-sender.ts` — `import
  "server-only"` ile işaretli; Upstash Redis (sabit anahtarlar — bu tek
  kullanıcılı bir uygulama, per-user namespace yok) ve `web-push` paketini
  sarmalıyor.
- `app/api/push/{subscribe,unsubscribe,summary,test,tick}/route.ts` — sırasıyla:
  aboneliği kaydet, sil, özeti güncelle, anlık test gönder, cron-job.org'un
  çağıracağı zamanlayıcı tick'i.
- `lib/notifications/subscribe.ts` (client) — `subscribeToPush`,
  `unsubscribeFromPush`, `hasActivePushSubscription`.
- `lib/notifications/summary-sync.ts` (client) — `buildNotificationSummary()`
  Dexie'den 7 alanı toplar, `syncNotificationSummary()` bunu
  `/api/push/summary`'e POST eder; `components/shell/providers.tsx` bunu
  uygulama açılışında ve her 15 dakikada bir (uygulama açıkken) tetikler.
- Ayarlar > Bildirimler (`app/(app)/ayarlar/bildirimler/page.tsx`): ana
  aç/kapa + sessiz saat aralığı (`PushStatusCard`), kategori başına
  aç/kapa + ısrar düzeyi + saat listesi + şablon editörü (değişken ekleme
  çipleri + canlı önizleme) + test bildirimi butonu (`CategorySettingsCard`).
- README'de Upstash/VAPID/cron-job.org kurulum adımları var.

## 11. AI Koç (`/koc`)

- `lib/coach/context.ts` — `buildCoachContext(rangeDays, streak)`: Dexie'den
  son N güne ait **küçük, özetlenmiş** istatistikleri toplar (su/sigara/
  antrenman/uyku/beslenme/zihin/üretkenlik/finans/alışkanlık ortalamaları) —
  ham kayıtlar hiçbir zaman gönderilmiyor.
- `lib/coach/anthropic.ts` — `server-only`; `claude-sonnet-5` ile ham
  `fetch` (ek bir SDK bağımlılığı eklemeden) çağrısı.
- `lib/coach/prompts.ts` — sistem promptu (bağlamı JSON olarak gömer) +
  aksiyon başına kullanıcı promptu (brifing/haftalık rapor/program önerisi/
  sohbet).
- `app/api/coach/route.ts` — Zod doğrulamalı POST, `ANTHROPIC_API_KEY`
  yoksa 503.
- `lib/db/repo/coach.ts` — `coachMessages` tablosu için CRUD +
  `getTodayCoachRequestCount`/`hasGeneratedToday`/`hasGeneratedThisWeek`
  (günlük istek limiti VE "brifing bugün zaten üretildi mi" kontrolleri
  için — `CoachMessage.kind` alanı hangi aksiyonun ürettiğini etiketler).
- `app/(app)/koc/page.tsx` — sohbet ekranı: hızlı aksiyon çipleri (Sabah
  Brifingi / Haftalık Rapor / Program Öner — günde/haftada bir kez
  üretilebilir), serbest metin girişi, günlük istek limiti (Ayarlar >
  Bildirimler'den değişebilir, **tamamen istemci tarafında** sayılıyor).
  Sunucu yapılandırılmamışsa ya da ağ hatası olursa toast ile net bir hata
  gösterir (bkz. § 9 toast fix) — çökme yok.

## 12. Bilinçli kapsam daraltmaları (v1 + v2 basitleştirmeleri)

Bunlar hata değil, bütçe/zaman dengesi için bilinçli kararlar:

- **Birimler (metrik/imperial) ayarı UI'da yok.**
- **Antrenman koruması "skora etkisi"** sadece bilgilendirici bir rozet.
- **Sigara "kondisyon skoruyla korelasyon"** İstatistik sekmesindeki genel
  Pearson korelasyon kartına taşındı (artık gerçek bir korelasyon
  hesaplaması, ama yine de günlük ortalamalar üzerinden — dakika bazlı bir
  zaman serisi değil).
- Ana ekran Dashboard'daki sabit "sigara" ve "hızlı şeritler" kartları VE
  Hızlı Ekle'nin aksiyon listesi (`lib/quick-add/actions.ts`), modül aç/kapa
  (`moduleToggles`) durumuna göre otomatik gizlenmiyor (sadece Hub'lar/Hub
  özet kartları registry-aware). Bir modülü kapatan kullanıcı bu kartları/
  aksiyonları elle görmezden gelebilir — 1. aşamadan beri süregelen bilinçli
  bir tutarlılık kararı.
- **İstatistik zaman aralığı** 7/30/90 gün ile sınırlı (spec'in ima ettiği
  "1 yıl" seçeneği yok) — `computeScoreForDate()` günde ~8 paralel Dexie
  sorgusu yapıyor, 365 günlük bir aralık ~2900 sorgu demek, ve kalıcı bir
  günlük-skor önbellek tablosu yok.
- **Program Öner (AI Koç)** tam bir CRUD değil, serbest metin öneri — Koç
  bir program "uygulamıyor", sadece öneriyor.
- **AI Koç günlük istek limiti** istemci tarafında (yerel `coachMessages`
  geçmişine bakarak) sayılıyor, sunucu tarafında değil — kararlı bir kişisel
  kullanım kısıtı, güvenlik sınırı değil.
- **Reduced-motion (erişilebilirlik) tam retrofit edilmedi.** Global CSS
  kuralı standart CSS transition/animation'ları kapsıyor;
  `activity-rings.tsx` ve `water-visual.tsx` gibi büyük/görünür Framer
  Motion animasyonları `useReducedMotion()` ile kontrol ediliyor; ama
  sheet/toast/segmented gibi küçük spring geçişleri her yerde tek tek
  retrofit edilmedi — bu, tek kullanıcılı bir kişisel uygulamada düşük
  öncelikli bir kapsam kararı.
- Apple Sağlık gerçek zamanlı/arka plan senkronizasyonu yok (native değil,
  bkz. § 9 — kullanıcı elle Kısayol çalıştırıyor). Bildirimler: 2. aşamada
  eklendi.

## 13. Bilinen, kabul edilmiş uyarılar

- `npm audit`: `@serwist/next`'in transitive `browserslist` bağımlılığında
  yüksek şiddetli 2 uyarı var; düzeltmesi `@serwist/next`'i eski bir sürüme
  düşürüyor (breaking). Bu sadece **build-time** bir araç, kullanıcı
  verisiyle veya çalışma zamanı güvenliğiyle ilgisi yok — bilinçli olarak
  ertelendi.
- Next 16 varsayılanı Turbopack'tir ama Serwist henüz desteklemiyor; bu
  yüzden `dev`/`build` script'leri `--webpack` bayrağı zorunlu.
- Bildirim sunucusu ve AI Koç, gerçek harici servisler (Upstash hesabı,
  gerçek VAPID anahtarı, Anthropic API anahtarı, cron-job.org) gerektiriyor
  — bu sandboxed ortamda gerçek push teslimatı uçtan uca test edilemedi;
  kod "yapılandırılmamış" durumunu (503 + net hata mesajı) doğru ele alacak
  şekilde yazıldı ve README'de kurulum adımları belgelendi.

## 14. Orijinal görev tanımları

Bu proje iki büyük spesifikasyon belgesiyle (1. Aşama ve 2. Aşama — "MertOS
2. Aşama: Tam Sürüm") ilerledi. Her ikisi de bu oturumların sohbet
geçmişinde tam metin olarak mevcut; bu döküman onların **sonucunu** (ne
inşa edildiğini, nerede olduğunu, hangi kısayolların bilinçli alındığını)
özetliyor. Üçüncü bir aşama planlanmıyor — burada durursa uygulama zaten
"bitmiş" bir kişisel ürün.
