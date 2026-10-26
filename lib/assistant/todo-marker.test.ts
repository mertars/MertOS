import { describe, expect, it } from "vitest";
import { extractTodoMarker, userAcceptedTodo } from "./todo-marker";

const MON = "2026-10-26";

describe("extractTodoMarker", () => {
  it("işaret satırını siler ve öneriyi okur", () => {
    const r = extractTodoMarker("Süper Mert Bey, listeye ekledim.\n[[YAPILACAK gün=bugün saat=20:00 başlık=20 dk hafif yürüyüş]]", MON);
    expect(r.text).toBe("Süper Mert Bey, listeye ekledim.");
    expect(r.proposal).toEqual({ title: "20 dk hafif yürüyüş", date: MON, time: "20:00" });
  });
  it("yarın, haftanın günü, saatsiz ve 8.30 biçimi", () => {
    expect(extractTodoMarker("[[YAPILACAK gün=yarın saat=8.30 başlık=Market]]", MON).proposal).toEqual({ title: "Market", date: "2026-10-27", time: "08:30" });
    expect(extractTodoMarker("[[YAPILACAK gun=cuma saat=- baslik=Ayakkabı bak]]", MON).proposal).toEqual({ title: "Ayakkabı bak", date: "2026-10-30", time: null });
    expect(extractTodoMarker("[[YAPILACAK gün=2026-10-28 başlık=Fatura öde]]", MON).proposal?.date).toBe("2026-10-28");
  });
  it("geçersiz öneri eklenmez ama satır yine silinir", () => {
    for (const bad of [
      "[[YAPILACAK gün=dün saat=20:00 başlık=X yap]]",
      "[[YAPILACAK gün=2026-10-20 başlık=Geçmiş]]",
      "[[YAPILACAK gün=bugün saat=25:00 başlık=Saat bozuk]]",
      "[[YAPILACAK gün=bugün saat=20:00]]",
    ]) {
      const r = extractTodoMarker(`Tamam.\n${bad}`, MON);
      expect(r.proposal).toBeNull();
      expect(r.text).toBe("Tamam.");
    }
  });
  it("token sınırında yarım kalan işaret de silinir", () => {
    expect(extractTodoMarker("Ekledim.\n[[YAPILACAK gün=bugün sa", MON).text).toBe("Ekledim.");
  });
});

describe("userAcceptedTodo", () => {
  it.each(["Olur", "Tamam, akşam 8'de", "Evet ekle", "Yarın sabah", "20:00 olsun", "Saat 7'de yaparım"])("kabul: %s", (m) => {
    expect(userAcceptedTodo(m)).toBe(true);
  });
  it.each(["Hayır, gerek yok", "İstemem", "Selam nasılsın", "Boş ver"])("kabul değil: %s", (m) => {
    expect(userAcceptedTodo(m)).toBe(false);
  });
});
