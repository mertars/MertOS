# FAZ 5 — PROJE DURUMU OKUYUCU (Mert'in görev dosyasından, birebir)

Önkoşul: Faz 1 (Turso bağlantısı ve giriş) hazır olmalı. Değilse önce Mert'e söyle.
Bitiş ölçütü: Projeler sekmesi gerçek GitHub verisini gösteriyor, asistan "GitHub'daki son duruma göre" diye konuşuyor, Routinix Kampüs için Mac betiği çalışıyor. Gerçek ortamda denemediğin hiçbir şeye "çalışıyor" deme.

1) GITHUB OKUMA
- Mert'in tüm projeleri GitHub'da. Okuyucu GitHub API'sine bağlanır. Routinix Kampüs gibi gizli depolar da okunur.
- Sunucu, Mert'in hesabındaki depoları listeler. Hangilerinin izleneceğini Mert sonra seçer (ekranda tek dokunuş).
- Seçilen her depoda şunlar okunur: ana daldaki tasks.json ve PROJECT_STATE.md, son commit'ler, açık dallar ve PR'lar ve her birinin test (CI) durumu (bekliyor / geçti / kaldı).
- git status kullanılmaz: kaydedilmemiş yerel değişiklikler GitHub'da görünmez. Bunu Mert'e bir kez söyle.
- GitHub limitlerini aşmamak için sonuçları kısa süreli önbelleğe al (en fazla ~15 dakika). Arka planda otomatik çalışan bir şey ekleme.
- Hiçbir projeye yazma, yalnızca oku.

2) ASİSTAN DAVRANIŞI
- Durumu şöyle ayır: "ana dalda: bitti", "dalda, test bekliyor", "GitHub'da yok: bilmiyorum".
- Proje konuşurken her zaman "GitHub'daki son duruma göre" de ve son güncelleme tarihini söyle. Commit edilmemiş işi bildiğini iddia etme, uydurma.
- Günlük özete proje bölümü ekle (bekleyen işler, testte bekleyen dallar).

3) ERİŞİM ANAHTARI
- GitHub'da fine-grained erişim anahtarı kullan: yalnızca seçilen depolar, yalnızca okuma (içerik, PR, test durumu). Süresini mümkün olduğunca uzun seç ve bitiş tarihini Mert'e söyle.
- Mert'e anahtarı nasıl oluşturacağını adım adım anlat. Anahtar sunucuda ortam değişkeni olarak durur, istemciye gitmez.
- Mert'e bir kez söyle: site ele geçirilirse biri bu depoları okuyabilir (değiştiremez).

4) GİZLİLİK KURALI
- Gemini'ye yalnızca görev başlıkları ve durumlar gider. Kod, dosya içeriği ve KVKK metni gibi özel metinler modele ASLA gönderilmez.

5) ROUTINIX KAMPÜS İÇİN MAC BETİĞİ (elle çalışır)
- Mac'te tasks.json, PROJECT_STATE.md ve git status --short okuyup yalnızca başlık ve durum özetini veritabanına yazan küçük bir komut yaz.
- Mert çalıştırınca güncellenir, kendiliğinden çalışmaz. Arka planda otomatik çalıştırma ekleme.
- Bu veri ekranda "yerel, tarihi şu" diye ayrı etiketlenir.
- Veritabanı anahtarı Mac'te projeye commit edilmeyen bir yerde durur.
- Bu betiği bulut oturumunda yazabilirsin ama Mac'te Mert çalıştıracak. Çalıştırma adımını Mert'e tek komut olarak ver.

6) EKRAN
- Projeler sekmesi, Faz 3 tasarım diline uygun. Depo seçimi tek dokunuşla. Her projede: bekleyen işler, testte bekleyen dallar, son güncelleme tarihi, veri kaynağı (GitHub / yerel).

7) TEST
- Gerçek GitHub'a, gizli bir depoyla dene. Anahtarın gerçekten yalnızca okuma yetkili olduğunu doğrula.
- Test (CI) durumu bekliyor, geçti ve kaldı için doğru görünüyor mu bak.
- Mac kapalıyken eski yerel veri tarihiyle birlikte görünüyor mu bak.
- GitHub'a ulaşılamazsa uygulama bozulmasın, son kaydedilen durumu göstersin.
- Test edemediğin her şeyi raporda açıkça yaz.

8) SERBESTLİK
- Faz başına en fazla 3 küçük ekleme yapabilirsin. Şartlar: yasakları çiğnemez, Gemini kotasını artırmaz ya da LLM'siz çalışır, tasarım dilini ve gizlilik kuralını bozmaz. Her eklemeyi faz raporunda "Ek olarak yaptım:" başlığıyla tek satır yaz, Mert geri alabilir. Büyük ya da belirsiz fikirlerde önce Mert'e tek soru sor.
