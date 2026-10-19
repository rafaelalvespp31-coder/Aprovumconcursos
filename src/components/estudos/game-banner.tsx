import Link from "next/link";
import { ArrowRight, Crosshair } from "lucide-react";

/** Chamada para o Modo Jogo, com a mesma arte tática da página do jogo. */
export function GameModeBanner({ base = "" }: { base?: string }) {
  return (
    <section className="eg" aria-labelledby="eg-titulo">
      <span className="eg-arte" aria-hidden />
      <span className="eg-sombra" aria-hidden />
      <Crosshair className="eg-alvo" aria-hidden />
      <div className="eg-texto">
        <h2 id="eg-titulo" className="eg-titulo">Modo Jogo</h2>
        <p className="eg-sub">Transforme seu estudo em uma missão.</p>
        <Link href={`${base}/quiz`} className="eg-botao">
          Jogar agora <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>
    </section>
  );
}
