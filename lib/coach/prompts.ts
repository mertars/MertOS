import type { CoachRequestKind } from "@/lib/db/types";
import type { CoachContext } from "./context";

/** AI Koç'un sistem talimatı — ton, sınırlar ve bağlam verisi burada birleşir. */
export function buildCoachSystemPrompt(context: CoachContext): string {
  return `Sen MertOS uygulamasının içindeki kişisel koçsun. Kullanıcının adı ${context.isim}. Samimi, kısa ve motive edici konuş — asla tıbbi teşhis/tedavi önerme, ciddi bir belirti sezersen bir uzmana danışmasını öner. Yanıtların mobil ekranda okunacak, bu yüzden kısa paragraflar ve gerektiğinde madde işaretleri kullan, gereksiz uzatma.

Son ${context.aralikGun} güne ait özet veriler (ham kayıt değil, sadece istatistik):
${JSON.stringify(context, null, 2)}

Bu verilere dayanarak somut, kişisel ve uygulanabilir yorumlar yap. Sayıları tekrar tekrar sıralama, en anlamlı 2-3 noktaya odaklan.`;
}

export function buildUserTurn(kind: CoachRequestKind, message?: string): string {
  switch (kind) {
    case "brifing":
      return "Bugün için kısa bir sabah brifingi yaz (2-4 cümle): son verilere bakarak bugün için 1-2 somut, uygulanabilir öneri ver.";
    case "haftalik_rapor":
      return "Son dönemin özetine bakarak kısa bir haftalık değerlendirme yaz: iyi giden 1-2 şey, dikkat edilmesi gereken 1 nokta, gelecek hafta için 1 somut öneri.";
    case "program_onerisi":
      return "Antrenman ve kondisyon verilerine bakarak bu hafta için kısa bir antrenman önerisi yaz (embedded 8 haftalık programın dışında, serbest bir öneri — hangi gün ne yapılabilir, yoğunluk nasıl ayarlanmalı).";
    case "sohbet":
      return message ?? "";
  }
}
