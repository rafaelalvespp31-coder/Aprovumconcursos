/**
 * Amostras de entrada usadas nos testes do motor de decomposição.
 * Textos legais brasileiros são de domínio público (Lei 9.610/1998, art. 8º, IV).
 */

/** Edital colado em linha única, padrão comum em editais CEBRASPE. */
export const EDITAL_INLINE = `CONHECIMENTOS BÁSICOS
LÍNGUA PORTUGUESA: 1 Compreensão e interpretação de textos de gêneros variados. 2 Reconhecimento de tipos e gêneros textuais. 3 Domínio da ortografia oficial. 4 Domínio dos mecanismos de coesão textual. 4.1 Emprego de elementos de referenciação, substituição e repetição, de conectores e de outros elementos de sequenciação textual. 4.2 Emprego de tempos e modos verbais.
NOÇÕES DE DIREITO CONSTITUCIONAL: 1 Constituição Federal de 1988. 2 Direitos e garantias fundamentais. 2.1 Direitos e deveres individuais e coletivos; direitos sociais; nacionalidade; direitos políticos.`;

/** Edital em lista, um item por linha, com marcadores. */
export const EDITAL_LISTA = `RACIOCÍNIO LÓGICO
1. Estruturas lógicas.
2. Lógica de argumentação:
• analogias;
• inferências;
• deduções e conclusões.
3. Diagramas lógicos.
INFORMÁTICA
1 Conceitos básicos de sistemas operacionais Windows e Linux.
2 Edição de textos, planilhas e apresentações.`;

/** Trecho da Constituição Federal (art. 5º, parcial). */
export const LEI_CF_ART5 = `TÍTULO II
DOS DIREITOS E GARANTIAS FUNDAMENTAIS
CAPÍTULO I
DOS DIREITOS E DEVERES INDIVIDUAIS E COLETIVOS
Art. 5º Todos são iguais perante a lei, sem distinção de qualquer natureza, garantindo-se aos brasileiros e aos estrangeiros residentes no País a inviolabilidade do direito à vida, à liberdade, à igualdade, à segurança e à propriedade, nos termos seguintes:
I - homens e mulheres são iguais em direitos e obrigações, nos termos desta Constituição;
II - ninguém será obrigado a fazer ou deixar de fazer alguma coisa senão em virtude de lei;
III - ninguém será submetido a tortura nem a tratamento desumano ou degradante;
IV - é livre a manifestação do pensamento, sendo vedado o anonimato;
§ 1º As normas definidoras dos direitos e garantias fundamentais têm aplicação imediata.
§ 2º Os direitos e garantias expressos nesta Constituição não excluem outros decorrentes do regime e dos princípios por ela adotados, ou dos tratados internacionais em que a República Federativa do Brasil seja parte.`;

/** Mesmo trecho com o inciso III removido — deve gerar alerta de lacuna. */
export const LEI_COM_LACUNA = LEI_CF_ART5.replace(/III - .*\n/, "");

/** Texto copiado de PDF com quebras no meio das frases e hifenização. */
export const PDF_QUEBRADO = `1 Atos administrativos: conceito, requisitos, atributos, classificação e espé-
cies. 2 Poderes administrativos: poder hierárquico, poder disciplinar, poder
regulamentar e poder de polícia.`;
