import { LegalPage } from "@/components/legal/legal-page";

export const metadata = { title: "Política de Cookies" };

export default function Cookies() {
  return (
    <LegalPage title="Política de Cookies">
      <p>O APROVUM usa apenas armazenamento <b>essencial</b> ao funcionamento. Não usamos cookies de publicidade, Google Analytics, pixels de redes sociais nem ferramentas de rastreamento de terceiros.</p>
      <table>
        <thead><tr><th>Nome / tipo</th><th>Para que serve</th><th>Duração</th></tr></thead>
        <tbody>
          <tr><td>Cookies de sessão do Supabase (<code>sb-…</code>)</td><td>Manter você conectado com segurança</td><td>Até fechar o navegador, ou por mais tempo se você escolher &quot;Manter conectado&quot;</td></tr>
          <tr><td><code>aprovum_sessao</code></td><td>Lembrar se você escolheu &quot;Manter conectado&quot;</td><td>Sessão</td></tr>
          <tr><td>Armazenamento local (<code>na:…</code>)</td><td>Preferências da interface (dicas já vistas, progresso local, aviso de cookies)</td><td>Até você limpar o navegador</td></tr>
          <tr><td>Mercado Pago (somente na tela de pagamento)</td><td>Processar o pagamento e prevenir fraude</td><td>Definida pelo Mercado Pago</td></tr>
        </tbody>
      </table>
      <p>Como esses itens são estritamente necessários, não dependem de consentimento. Você pode apagá-los nas configurações do navegador, mas será desconectado.</p>
      <p>Se um dia adicionarmos análise de uso ou outro rastreamento, pediremos seu consentimento antes e atualizaremos esta página.</p>
    </LegalPage>
  );
}
