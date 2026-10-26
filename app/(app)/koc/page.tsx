import { redirect } from "next/navigation";

/** Eski Koç ekranı → yeni Asistan sohbeti. */
export default function KocPage() {
  redirect("/asistan");
}
