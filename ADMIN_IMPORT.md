# Importação administrativa do catálogo

A rota `/admin/importar` adiciona uma importação em lote sem alterar o modelo de dados do catálogo existente.

## Arquivos aceitos

Selecione os arquivos do MESMO diretório `conteudo-catalogo-*`:

- `topic.json` (obrigatório): metadados do tema e estrutura `nodes`;
- `lesson.json` (obrigatório): aula e seções;
- `questoes.json` (obrigatório): questões com nível, tipo, alternativas, gabarito e justificativa;
- `nodes.json` (opcional): se informado, substitui a lista de nós de `topic.json`.

O importador cria um novo tema como `rascunho`. Não substitui temas com o mesmo slug e não publica automaticamente. Se a inserção de questões falhar, tenta remover o rascunho recém-criado para não deixar o conteúdo pela metade.

## Segurança e limites

- A página e a ação exigem a verificação `requireAdmin()` já usada pela área administrativa.
- As gravações são feitas no servidor por meio do cliente Supabase administrativo existente.
- Os arquivos são validados antes de gravar; chaves de questão precisam existir na estrutura, e questões de múltipla escolha precisam ter exatamente uma alternativa correta.
- Limite de 1 MB por arquivo e 3,5 MB somados.
- O conteúdo importado permanece em rascunho até a revisão e publicação pelo fluxo já existente.
- Nenhuma tabela ou migration nova é necessária.

## Publicação

1. Faça deploy das alterações da aplicação.
2. Entre com uma conta que já seja administradora.
3. Abra `/admin/importar`.
4. Selecione os três arquivos obrigatórios da mesma pasta de conteúdo.
5. Clique em **Validar e importar como rascunho**.
6. Abra o tema em `/admin/catalogo`, revise a aula e as questões e publique pelo fluxo existente quando os requisitos de publicação forem atendidos.

Não envie `.env`, tokens ou chaves privadas ao repositório ou a serviços de terceiros.
