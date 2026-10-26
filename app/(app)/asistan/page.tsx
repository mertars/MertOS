"use client";

import { AssistantPanel, useIsDesktop } from "@/components/fx/assistant-panel";
import { DesktopHome } from "@/components/fx/desktop-home";

// Asistan (Faz 3). Telefonda sohbet ekranı (mikrofon alt yarıda); bilgisayarda
// tek ekranlık 3 sütunlu ana görünüm (sol sağlık, orta mikrofon + sohbet, sağ program).
export default function AsistanPage() {
  return useIsDesktop() ? <DesktopHome /> : <AssistantPanel layout="phone" />;
}
