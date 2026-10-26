# MertOS Asistan — Görev Dosyası: FAZ 3 (Yeni Tasarım)

> Kaynak: Mert'in "MertOS Asistan — Claude Code Görev Dosyası", Faz 3 bölümü
> (Ekim 2026'da sohbete birebir yapıştırıldı). **Birebir uygula.**

## FAZ 3 — YENİ TASARIM

Hedef: 2050'den gelmiş gibi, gösterişli, hareketli, canlı. Sadelik yok.

- Zemin: parlak, pahalı duran siyah. Mor-siyah gradyan gibi "tek promptta üretilmiş yapay zeka" görüntüsü yok, neon cyber klişesi yok.
- Arka plan: parlak siyah üstünde hareket eden, 3D derinlikli, canlı renkli parçalardan oluşan duvar kağıdı. Parçalar yavaş ve zarif hareket eder.
- Renk: her bölümün kendi canlı ana rengi var (sağlık, program, projeler, hafıza birbirinden ayrı). Soluk renk yok, canlı mor, yeşil, sarı gibi doygun tonlar.
- Cam efektleri: bol, kaliteli (blur, ince kenar ışığı, derinlik).
- Düzen: tek tip ızgara yok. 3x1, 2x2, geniş-dar karışık, dağınık ama dengeli kart düzenleri. Her bölüm farklı kompozisyon.
- Animasyon: giriş, geçiş, kart ve mikrofon animasyonları özenli ve akıcı.
- Yazı: teknik karakterli ana yazı tipi + rakamlar için tek aralıklı (mono) yazı tipi. Aşırı kullanılan varsayılan yazı tiplerinden kaçın.
- Mikrofon: boştayken şık bir ikon, konuşulunca sese göre canlı hareket eden animasyon. Konuşma bitince geri döner.
- Efekt azaltma (ayarlarda, kademeli): Tam / Orta / Düşük / Kapalı. Orta: parçalar az ve yavaş. Düşük: arka plan neredeyse sabit, blur azalır. Kapalı: düz parlak siyah, animasyon yok. Sistemin "hareketi azalt" ayarına da saygı göster.
- Telefon: alt sekmeler (Asistan, Bugün, Sağlık, Projeler, Hafızam). Mikrofon alt yarıda, tek elle kullanım.
- Bilgisayar: tüm ekran, sayfa kaydırması yok. Sol: sağlık. Ortada: büyük mikrofon, altında sohbet. Sağ: günün programı ve projeler. Üstte sekmeler: Asistan, Hafızam, Ayarlar.
- Mevcut mertos görünümüne bağlı kalma. Mevcut verileri ve mantığı koru.

Hafızam ekranı: asistanın Mert hakkında kaydettikleri kartlarda görünür: sevdikleri/sevmedikleri, yediği tarifler (tarih, puan, "tekrar yap"), alışkanlıklar, notlar. Her kartta yalnızca sil ve düzelt.

Günün kararı kartı: ana ekranın üstünde tek cümlelik öneri (gün tipi, öğün, toplu pişirme durumu). Kod üretir, LLM gerekmez.

Çalışma kuralı: Uygulamadan önce ana ekranın ve mikrofonun ekran görüntüsünü bana göster, onay alınca devam et. Telefonda akıcılık öncelikli: animasyonlar efekt seviyesine bağlı olsun.

## Mert'in geri bildirimleri (onay turu)

- **26 Ekim 2026, 1. tur:** Renkli 3D parçalardan oluşan duvar kağıdı reddedildi
  ("tamamen kaldır, çok farklı bir şey bul") — yukarıdaki "Arka plan" maddesinin
  yerini alır. Yerine iki seçenek önizlemede: `dalga` (ince ışık çizgilerinden
  3D dalga yüzeyi) ve `toz` (cilalı siyahta kayan ışık + derinlikte ince toz).
  Mikrofon simgesi ve çevresindeki ışınlar da reddedildi → koyu cilalı cam küre,
  ince çizgili simge, sesle akışkan dalgalanan üç ince çember. Sohbet görünümü
  geliştirildi (balonsuz asistan metni, cam balon, işlem kartları, öneri çipleri).
