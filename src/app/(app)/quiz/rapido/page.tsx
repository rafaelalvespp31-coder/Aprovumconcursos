import { getRapidoHome } from "@/server/services/quiz-rapido";
import { RapidoView } from "./rapido-view";

export const metadata = { title: "Desafio rápido" };

export default async function RapidoPage() {
  const home = await getRapidoHome();
  return <RapidoView home={home} />;
}
