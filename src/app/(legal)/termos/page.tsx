import { Contato, LegalPage } from "@/components/legal/legal-page";

export const metadata = { title: "Termos de Uso" };

export default function Termos() {
  return (
    <LegalPage title="Termos de Uso">
      <p>Ao criar uma conta no APROVUM, você concorda com estes termos e com a <a href="/privacidade">Política de Privacidade</a>.</p>

      <h2>1. O serviço</h2>
      <p>O APROVUM é uma plataforma de estudo para concursos públicos: aulas, questões, revisões, anotações, plano de estudo e um Mentor. Há um plano gratuito e planos pagos, com os preços e o que cada um inclui exibidos na página &quot;Meu Plano&quot; antes da compra.</p>

      <h2>2. Sem promessa de aprovação</h2>
      <p>O APROVUM é uma ferramenta de apoio. <b>Não garantimos aprovação em concurso, nota ou classificação</b>: o resultado depende da sua dedicação, do edital e da concorrência.</p>

      <h2>3. Conteúdo gerado com IA</h2>
      <p>Parte do conteúdo (aulas, questões, explicações e respostas do Mentor) é gerada com apoio de inteligência artificial e passa por verificações, mas pode conter erros ou ficar desatualizada. Confira sempre a lei, a doutrina e o edital na fonte oficial antes de provas. O conteúdo não é aconselhamento jurídico.</p>

      <h2>4. Sua conta</h2>
      <ul>
        <li>A conta é pessoal e intransferível; a senha é sua responsabilidade.</li>
        <li>Por segurança, a conta fica conectada em um aparelho por vez.</li>
        <li>É necessário ter 18 anos ou mais. Informe dados verdadeiros.</li>
      </ul>

      <h2>5. Uso permitido</h2>
      <p>É proibido compartilhar a conta, copiar, revender ou distribuir o conteúdo, usar robôs para extrair dados, tentar burlar limites ou segurança, ou usar a plataforma para fins ilegais. Podemos suspender contas que violem estes termos, avisando o motivo.</p>

      <h2>6. Propriedade intelectual</h2>
      <p>A marca, o design, o software e o conteúdo do APROVUM pertencem aos seus titulares. Você recebe uma licença pessoal, limitada e revogável de uso. Suas anotações continuam sendo suas.</p>

      <h2>7. Pagamentos e reembolso</h2>
      <p>Pagamentos são processados pelo Mercado Pago. Regras de cancelamento e devolução estão na <a href="/reembolso">Política de Reembolso</a>.</p>

      <h2>8. Disponibilidade e responsabilidade</h2>
      <p>Trabalhamos para manter o serviço no ar, mas pode haver instabilidades e manutenções. Na máxima extensão permitida em lei, não respondemos por danos indiretos nem por decisões tomadas apenas com base no conteúdo. Nada aqui limita direitos que a lei garante ao consumidor.</p>

      <h2>9. Encerramento</h2>
      <p>Você pode excluir sua conta a qualquer momento em Perfil → Seus dados.</p>

      <h2>10. Alterações e foro</h2>
      <p>Podemos atualizar estes termos; mudanças relevantes serão avisadas na plataforma. Fica eleito o foro do domicílio do consumidor. Dúvidas: <Contato />.</p>
    </LegalPage>
  );
}
