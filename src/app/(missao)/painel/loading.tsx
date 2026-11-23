/** Enquanto a página carrega: tela preta (a Central de Missão aparece com a entrada progressiva dos elementos). */
export default function Loading() {
  return <div style={{ position: "fixed", inset: 0, background: "#030303" }} aria-hidden />;
}
