import { Contato, LegalPage } from "@/components/legal/legal-page";
import { CONTROLADOR } from "@/lib/legal";

export const metadata = { title: "Política de Privacidade" };

export default function Privacidade() {
  return (
    <LegalPage title="Política de Privacidade">
      <p>Esta política explica como o APROVUM trata dados pessoais, conforme a Lei Geral de Proteção de Dados (Lei 13.709/2018 — LGPD).</p>

      <h2>1. Quem é o controlador</h2>
      <p>{CONTROLADOR}. Contato do encarregado/canal de privacidade: <Contato />.</p>

      <h2>2. Quais dados coletamos e por quê</h2>
      <table>
        <thead><tr><th>Dado</th><th>Finalidade</th><th>Base legal (art. 7º)</th></tr></thead>
        <tbody>
          <tr><td>Nome, e-mail e senha (guardada de forma criptografada)</td><td>Criar e acessar sua conta, recuperar a senha</td><td>Execução de contrato</td></tr>
          <tr><td>Gênero</td><td>Definir o avatar do aluno</td><td>Execução de contrato</td></tr>
          <tr><td>WhatsApp (opcional)</td><td>Te adicionar ao grupo de alunos</td><td>Consentimento</td></tr>
          <tr><td>Data de nascimento (opcional)</td><td>Personalizar o plano de estudo do Mentor</td><td>Consentimento</td></tr>
          <tr><td>Concurso-alvo, aulas, questões, respostas, revisões, anotações, tempo de estudo</td><td>Prestar o serviço, acompanhar seu progresso e montar seu plano de estudo</td><td>Execução de contrato</td></tr>
          <tr><td>Pagamentos (plano, valor, status, forma de pagamento)</td><td>Liberar o plano e cumprir obrigações fiscais. Não guardamos número de cartão: o pagamento é processado pelo Mercado Pago</td><td>Execução de contrato e obrigação legal</td></tr>
          <tr><td>Voz e texto enviados ao Mentor / IA</td><td>Responder suas dúvidas em tempo real</td><td>Execução de contrato</td></tr>
          <tr><td>Registros técnicos (erros, segurança, limites de uso)</td><td>Proteger a conta e a plataforma contra abuso</td><td>Legítimo interesse</td></tr>
        </tbody>
      </table>
      <p>Não vendemos seus dados e não usamos cookies de publicidade nem ferramentas de análise de comportamento de terceiros.</p>

      <h2>3. Com quem compartilhamos</h2>
      <ul>
        <li><b>Supabase</b> — banco de dados, login e armazenamento de arquivos.</li>
        <li><b>Vercel</b> — hospedagem do site.</li>
        <li><b>Mercado Pago</b> — processamento de pagamentos (e antifraude na tela de pagamento).</li>
        <li><b>Provedores de IA (Anthropic e Google)</b> — geram aulas, correções e respostas do Mentor. Enviamos apenas o conteúdo necessário para a tarefa (por exemplo, seu texto ou sua pergunta), sem seu e-mail ou WhatsApp.</li>
      </ul>
      <p>Alguns desses provedores ficam fora do Brasil; a transferência internacional ocorre com base no art. 33 da LGPD, com cláusulas contratuais e medidas de segurança dos provedores.</p>

      <h2>4. Por quanto tempo guardamos</h2>
      <p>Enquanto sua conta existir. Ao excluir a conta, apagamos seus dados de estudo e de perfil. Registros de pagamento são mantidos pelo prazo exigido por lei fiscal e contábil (em regra, 5 anos), sem vínculo com seu perfil de estudo.</p>

      <h2>5. Seus direitos (art. 18)</h2>
      <p>Você pode confirmar a existência de tratamento, acessar, corrigir, anonimizar, portar (exportar), eliminar dados tratados com consentimento, revogar consentimento e pedir informação sobre compartilhamentos. Na página <b>Perfil → Seus dados</b> você baixa uma cópia dos seus dados e exclui a conta por conta própria. Para outros pedidos, fale com <Contato />. Respondemos em até 15 dias úteis. Você também pode reclamar à Autoridade Nacional de Proteção de Dados (ANPD).</p>

      <h2>6. Segurança</h2>
      <p>Usamos conexão criptografada (HTTPS), controle de acesso por conta no banco de dados (RLS), senhas com hash, verificação de assinatura nos pagamentos e limites contra abuso. Nenhum sistema é totalmente invulnerável; se houver incidente que traga risco relevante, avisaremos você e a ANPD, como manda a lei.</p>

      <h2>7. Crianças e adolescentes</h2>
      <p>O APROVUM é voltado a maiores de 18 anos (concursos públicos). Não coletamos dados de menores de forma intencional; se identificarmos, excluiremos a conta.</p>

      <h2>8. Cookies</h2>
      <p>Veja a <a href="/cookies">Política de Cookies</a>.</p>

      <h2>9. Mudanças</h2>
      <p>Se esta política mudar de forma relevante, avisaremos na plataforma. A data de atualização fica no topo da página.</p>
    </LegalPage>
  );
}
