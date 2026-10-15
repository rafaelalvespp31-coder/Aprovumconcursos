/** Rodapé técnico da tela de login. */
export function LoginFooter() {
  return (
    <footer className="login-rodape">
      <p>
        <span className="login-barras" aria-hidden>{"///"}</span>
        <span className="text-white/90">APROVUM</span>
        <span aria-hidden className="text-white/40">•</span>
        <span className="text-[#8FA6C8]">Preparação de alto desempenho</span>
      </p>
      <span className="login-rodape-linha" aria-hidden />
      <span className="login-barras" aria-hidden>{"///"}</span>
    </footer>
  );
}
