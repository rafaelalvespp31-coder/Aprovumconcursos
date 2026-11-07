import Link from "next/link";
import { ShieldCheck, Trophy, Zap } from "lucide-react";

/** Rodapé da tela de cadastro: três garantias, link para quem já tem conta e o lema. */
export function CadastroRodape() {
  return (
    <footer className="cd-rodape">
      <ul className="cd-garantias cd-in" style={{ ["--d" as string]: "0.85s" }}>
        <li><ShieldCheck aria-hidden /><span>Dados<br />Protegidos</span></li>
        <li><Zap aria-hidden /><span>Acesso<br />Imediato</span></li>
        <li><Trophy aria-hidden /><span>Sua aprovação<br />mais perto!</span></li>
      </ul>
      <p className="cd-ja-tem cd-in" style={{ ["--d" as string]: "0.9s" }}>
        Já tem conta? <Link href="/entrar">Entrar</Link>
      </p>
      <p className="cd-lema cd-in" style={{ ["--d" as string]: "0.95s" }}>
        <span aria-hidden className="cd-lema-linha" />
        <span>APROVUM</span><i aria-hidden>•</i><span>ESTUDE</span><i aria-hidden>•</i><span>EVOLUA</span><i aria-hidden>•</i><span className="cd-vermelho">CONQUISTE</span>
        <span aria-hidden className="cd-lema-linha" />
      </p>
    </footer>
  );
}
