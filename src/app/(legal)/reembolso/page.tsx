import { Contato, LegalPage } from "@/components/legal/legal-page";

export const metadata = { title: "Política de Reembolso" };

export default function Reembolso() {
  return (
    <LegalPage title="Política de Reembolso e Cancelamento">
      <h2>1. Direito de arrependimento (7 dias)</h2>
      <p>Como a compra é feita pela internet, você pode desistir em até <b>7 dias corridos</b> a partir da contratação (art. 49 do Código de Defesa do Consumidor). Nesse caso devolvemos <b>100% do valor pago</b>, pelo mesmo meio de pagamento, sem perguntar o motivo.</p>

      <h2>2. Depois dos 7 dias</h2>
      <ul>
        <li><b>Plano mensal:</b> cada compra vale por um mês e não há renovação automática; não há cobrança futura a cancelar. Após os 7 dias, não há reembolso proporcional do período em curso.</li>
        <li><b>Planos de 6 e 12 meses e acesso vitalício:</b> sem reembolso após 7 dias, salvo falha do serviço que impeça o uso e que não seja corrigida, ou outra hipótese prevista em lei.</li>
      </ul>

      <h2>3. Como pedir</h2>
      <p>Envie o pedido por <Contato />, informando o e-mail da conta. Analisamos em até 5 dias úteis. Aprovado o reembolso, o estorno é solicitado ao Mercado Pago; o prazo para aparecer na fatura ou conta depende da operadora (cartão: até duas faturas; Pix: em geral em poucos dias úteis).</p>

      <h2>4. Efeito do reembolso</h2>
      <p>Com o reembolso, o plano pago é encerrado e a conta volta ao plano gratuito. Seus dados de estudo continuam, a menos que você peça a exclusão da conta.</p>

      <h2>5. Cobrança indevida</h2>
      <p>Se identificar uma cobrança que não reconhece, fale conosco primeiro para resolvermos rápido; você também pode procurar o Procon ou o Mercado Pago.</p>
    </LegalPage>
  );
}
