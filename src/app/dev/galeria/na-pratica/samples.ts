/** Exemplos visuais de teste (os mesmos blocos que vão para o catálogo). */
export const SAMPLE_BLOCKS = [
  `:::exemplo
Situação: O primeiro policial a chegar ao local de um homicídio recolhe a arma caída no chão "para guardar", antes da chegada da perícia.
Pergunta: O que há de errado e qual a consequência?
Resposta: Ele violou o dever de **preservação**: é proibido remover vestígios **antes da liberação pelo perito** (art. 158-C, § 2º). Há **quebra da cadeia de custódia**. Pelo entendimento que prevalece no STJ, isso **não anula automaticamente** a prova: o juiz avalia se ela continua **confiável**.
Tirinha: [{"cenario":"local_crime","legenda":"Local de um homicídio, minutos depois do crime.","personagens":[{"p":"pm","lado":"centro","pose":"pega","humor":"neutro","objeto":"arma"}],"fala":{"quem":0,"texto":"Vou guardar essa arma antes que suma."}},{"cenario":"local_crime","legenda":"Meia hora depois, chega a perícia.","personagens":[{"p":"perito","lado":"esq","pose":"fala","humor":"surpreso"},{"p":"pm","lado":"dir","pose":"bracos_cruzados","humor":"neutro"}],"fala":{"quem":0,"texto":"Cadê a arma? Ela tinha que estar aqui!"}}]
Carimbo: Cadeia de custódia quebrada | erro
Esquema: {"tipo":"fluxo","titulo":"O caminho certo do vestígio","passos":[{"rotulo":"Isolar e preservar o local","detalhe":"Ninguém mexe nos vestígios até a perícia","estado":"ok"},{"rotulo":"O PM retirou a arma antes da perícia","detalhe":"Proibido: art. 158-C, § 2º","estado":"erro"},{"rotulo":"Perito coleta, acondiciona e lacra","estado":"neutro"}],"conclusao":{"rotulo":"Juiz avalia se a prova ainda é confiável","detalhe":"Pelo STJ, a quebra não anula a prova automaticamente","estado":"alerta"}}
:::`,
  `:::exemplo
Situação: Durante uma revista na cela, um preso mata o policial penal que fiscalizava o procedimento, por raiva da fiscalização.
Pergunta: O homicídio é qualificado?
Resposta: **Sim — homicídio funcional (§ 2º, VII).** A vítima integra o **sistema prisional**, e o crime foi praticado **em razão da função**. Se o mesmo policial fosse morto de folga, numa briga pessoal sem relação com o trabalho, essa qualificadora **não** incidiria.
Tirinha: [{"cenario":"cela","legenda":"Revista de rotina numa cela.","personagens":[{"p":"policial_penal","lado":"esq","pose":"fala","humor":"serio"},{"p":"preso","lado":"dir","pose":"bracos_cruzados","humor":"bravo"}],"fala":{"quem":0,"texto":"Revista! Todos para o fundo da cela."}},{"cenario":"cela","legenda":"Com raiva da fiscalização, o preso ataca o policial, que morre.","personagens":[{"p":"preso","lado":"esq","pose":"ataca","humor":"bravo"},{"p":"policial_penal","lado":"dir","pose":"neutro","humor":"surpreso"}],"efeito":"PÁ!"}]
Carimbo: Qualificado: § 2º, VII | erro
Esquema: {"tipo":"comparacao","titulo":"Quando a qualificadora funcional incide","lados":[{"titulo":"Morto em razão da função","itens":["Vítima do sistema prisional","Crime ligado à revista"],"resultado":"Qualifica (§ 2º, VII)","estado":"ok"},{"titulo":"Morto de folga, numa briga pessoal","itens":["Sem relação com o trabalho"],"resultado":"Não qualifica pelo VII","estado":"erro"}]}
:::`,
  `:::exemplo
Situação: Um suspeito de tráfico de drogas é preso em flagrante. O delegado se pergunta qual é o prazo para concluir o inquérito.
Pergunta: Qual é o prazo?
Resposta: **30 dias**, pela **Lei de Drogas** (Lei 11.343/2006, art. 51), que prevalece sobre o CPP por ser lei especial. O prazo pode ser **duplicado** pelo juiz, ouvido o MP. Se o investigado estivesse solto, seriam **90 dias**.
Tirinha: [{"cenario":"delegacia","legenda":"Preso em flagrante por tráfico de drogas.","personagens":[{"p":"delegado","lado":"esq","pose":"fala","humor":"serio","objeto":"documento"},{"p":"investigado","lado":"dir","pose":"bracos_cruzados","humor":"triste"}],"fala":{"quem":0,"texto":"Qual é o meu prazo para concluir este inquérito?"}}]
Carimbo: 30 dias | ok
Esquema: {"tipo":"linha_tempo","titulo":"Prazos do inquérito na Lei de Drogas","unidade":"dias","marcos":[{"em":10,"rotulo":"Regra do CPP para preso: não se aplica aqui","estado":"erro"},{"em":30,"rotulo":"Investigado preso (art. 51)","estado":"ok"},{"em":60,"rotulo":"Preso, se o juiz duplicar o prazo","estado":"alerta"},{"em":90,"rotulo":"Investigado solto","estado":"neutro"}]}
:::`,
];
