# BÖLÜM 18 — DERS VE SINAV TAKİBİ (ÖNCELİKLİ, Faz 4'ten önce yap)

> Mert'in görev dosyasından birebir (Ekim 2026). Faz 4 kodu bu metin gelmeden
> bitmişti; bölüm Faz 5'ten önce uygulandı. Uygulama notları: CLAUDE.md § 15.9.

Ara sınavlar 3–6 Kasım 2026. Bu modülü sese bağlamadan, basit haliyle ilk yapılacak iş olarak kur. Ses kaydı sonra eklenir.

Ders programı (haftalık, yalnızca bu 3 derse gidiliyor):
- Pazartesi 09:00–12:15: BSM3017 Bilgisayar Ağları
- Salı 13:15–16:15: BSM3003 Yazılım Mühendisliği
- Cuma 09:30–12:15: BSM3007 Veri Madenciliği
- Varsayım: 3–6 Kasım sınav haftasında ders hatırlatması kapalı (ayarlanabilir). "Derse gittim" kaydı ekrandan tek dokunuşla (devam takibi).

Sınavlar (8 ders, hepsi Ara Sınav):
- 03.11.2026 11:30 — BSM3017 Bilgisayar Ağları, %30, Derslik 11 (Bilgisayar Lab. I) ve 13 (Bilgisayar Lab. III)
- 03.11.2026 16:00 — BSM2037 Ayrık Matematik, %40, Derslik 1, 7, 8
- 04.11.2026 12:00 — BSM3007 Veri Madenciliği, %40, Derslik 11, 13
- 04.11.2026 16:00 — BSM2033 Devre Teorisi, %40, Derslik 1
- 05.11.2026 15:00 — BSM3003 Yazılım Mühendisliği, %40, Derslik 11, 13
- 05.11.2026 16:00 — BSM2011 İstatistik ve Olasılık Hesapları, %40, Derslik 1, 7, 8
- 06.11.2026 11:00 — BSM2035 Nesne Yönelimli Programlama, %40, Derslik 1
- 06.11.2026 16:00 — BSM2031 Veri Yapıları ve Algoritmalar, %50, Derslik 1
Yazım hatası ihtimaline karşı bu tabloyu Mert'e onaylat.

Çakışma uyarısı: 5 Kasım'da 15:00 ve 16:00 sınavları arası 1 saat. Sınav süresi bilinmiyor. Ekranda uyarı göster, süre uydurma, Mert'e okuldan teyit etmesini hatırlat.

Tablolar: courses, class_sessions, exams, study_blocks (tarih, ders, blok sayısı, not), readiness (ders, puan 1–5, tarih).

Çalışma takibi yöntemi:
- Birim: 1 blok = 50 dk odaklı çalışma (ayarlanabilir). Mert blok kaydeder (önce ekrandan, Faz 4'te sesle: "Ayrık matematik 2 blok çalıştım"). Geri al olsun.
- Mert her derse 1–5 hazırlık puanı verir ve günceller.
- Planı KOD hesaplar, LLM değil: bugünden her sınava kadar. Hedef blok, kalan gün azaldıkça, hazırlık puanı düştükçe ve sınav ağırlığı arttıkça büyür. Günlük toplam blok üst sınırı Mert'in ayarıdır (varsayılan 8). Koşu/yürüyüş ve öğün saatlerine dokunmaz. Yapılmayan bloklar sonraki günlere kayar. Yetişmeyecekse dürüstçe söyle ("bu hızla X dersi hedefin altında kalır").
- Konu listesi isteğe bağlı: Mert bir dersin müfredatını yapıştırırsa o ders için konu kontrol listesi çıkar, yapıştırmazsa yok.

Ekran, "Ders ve Sınav" sekmesi: sınav geri sayımı, bugünün blok hedefi, ders bazında ilerleme (yapılan/hedef blok), hazırlık puanı, bugünkü ders, 5 Kasım uyarısı. Faz 3 tasarım diline uy.

Asistan: sabah özetinde bugünkü ders ve blok hedefi. Sınav günü sabahı saat ve derslik. Sınavdan önceki akşam ertesi günün sınavı. Hepsi uygulama açıkken, bildirim yok. Uygulama hazır olana kadar yapılan blokları Mert'in Notlar'da tuttuğu listeden geriye dönük girebil.

Gizlilik: modele yalnızca ders adı, sınav tarihi ve blok sayıları gider. Öğrenci numarası ve kimlik bilgisi sisteme yazılmaz.

Test: plan hesaplayıcıyı bugünün gerçek tarihiyle çalıştır. 5 Kasım uyarısı görünüyor mu, blok kaydı ve geri al çalışıyor mu bak. Test edemediğini raporla.
