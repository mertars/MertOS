# MertOS Asistan — Görev Dosyası: FAZ 4 (Ses + Proaktif Konuşma + Sesle Günlük Kayıt)

> Kaynak: Mert'in görev dosyası, Faz 4 bölümü (Ekim 2026'da sohbete birebir
> yapıştırıldı). **Birebir uygula.**

## FAZ 4 — SES + PROAKTİF KONUŞMA + SESLE GÜNLÜK KAYIT

Bitiş ölçütü: sesle konuşup cevap duyuluyor, programdaki saatlerde asistan kendiliğinden konuşuyor, "koşumu yaptım" gibi cümleler günlük kayda yazılıyor. Gerçek telefonda denenmemiş hiçbir şey için "çalışıyor" deme.

### 1) SES
- Konuşmayı yazıya çevirme: tarayıcı Web Speech API (tr-TR). iPhone'da ana ekrana eklenmiş PWA'da sorunlu olabilir. Gerçek telefonda dene. Olmazsa yedek olarak klavyedeki mikrofon tuşunu Mert'e anlat.
- Sesli okuma: iki seçenek kur, Mert dinleyip seçsin: (1) tarayıcının hazır sesi, (2) Gemini'nin ses özelliği (ücretsiz katmanda var mı ve limiti ne, resmi dokümandan doğrula). Gemini sesi çalışmazsa otomatik hazır sese dönsün. Seçim ayarlarda tutulsun.
- Mikrofon: boştayken şık ikon, konuşulunca sese göre canlı hareket eden animasyon, bitince geri döner (efekt seviyesine bağlı).
- Ses modunda kısa cevap (2-3 cümle, liste yok). Sohbet tuşu: aynı asistan, aynı hafıza, daha uzun cevap.

### 2) PROAKTİF KONUŞMA
- Programdaki her görevde (sabah rutini, koşu/yürüyüş, öğünler, temizlik, proje özeti) asistan UYGULAMA AÇIKKEN kendisi konuşur. Saatler `schedule_items` tablosundan gelir.
- Karakter bağlama göre: sabah/spor anlarında disiplinli koç (net, motive edici, kısa), yemekte samimi arkadaş (rahat, hafif esprili). Hitap: ayarlardaki hitap (varsayılan "Mert Bey").
- Örnek: "Mert Bey, öğle yemeği vaktiniz geldi. Bugün farklı bir şey deneyelim mi? 2 gün önce yaptığınız tarif güzeldi." Cümle LLM ile kurulur ama içindeki bilgi koddan gelen gerçek veridir. Kayıtta olmayan geçmişi uydurma.
- Bildirim YOK. Kapalı uygulama konuşamaz, bunu Mert'e açıkça söyle.
- Tarayıcı dokunuşsuz sesi engelleyebilir: uygulamayı açınca tek "Başlat" dokunuşu iste, sonrasında planlı konuşmalar çalışsın. Bunu gerçek telefonda test et.
- Ses efekti ekleme.

### 3) SESLE GÜNLÜK KAYIT (yapıldı işaretleme)
- Mert "koşumu yaptım, duşumu aldım, öğle yemeğini yedim" dediğinde LLM yalnızca niyeti ayırır: mark_done(items) ve log_meal(meal, rating?). Kaydı KOD yazar.
- İzin verilen kayıtlar: routine_log maddeleri (uyanış, buzlu su, hidrasyon, soğuk duş, koşu/yürüyüş, wall sit, su) ve meal_log (yedim, isteğe bağlı puan ve not).
- Kayıt bugünün tarihine yazılır. Geçmiş güne yalnızca Mert "dün" gibi açıkça söylerse.
- Her kayıttan sonra tek satır onay: "İşaretledim: koşu, soğuk duş." Mert "geri al" derse son kayıt silinir.
- Belirsizse tek kısa soru sor ("Koşuyu mu işaretleyeyim?"). Tahminle işaret koyma.
- Program, tarif, rotasyon ve ayarlar sohbetle DEĞİŞMEZ.

### 4) TEST
- 10 farklı gerçek cümleyle sesle kaydı test et ("koştum", "duş aldım ama koşmadım", "yemeği yedim, güzeldi"...), yanlış anlama oranını raporda yaz.
- Kota dolu, internet yok ve Gemini hata verirse uygulama bozulmasın. Ses kapalıysa metne dön.
- İki sesi de Mert'e dinlettir, seçimini ayarlara kaydet.
- Test edemediğin her şeyi (iPhone ses tanıma, dokunuşsuz ses) raporda açıkça yaz.

### 5) SERBESTLİK
- Faz başına en fazla 3 küçük ekleme yapabilirsin. Şartlar: yasakları çiğnemez, Gemini kotasını artırmaz ya da LLM'siz çalışır, tasarım dilini ve gizlilik kuralını bozmaz. Her eklemeyi faz raporunda "Ek olarak yaptım:" başlığıyla tek satır yaz, Mert geri alabilir. Büyük ya da belirsiz fikirlerde önce Mert'e tek soru sor.
