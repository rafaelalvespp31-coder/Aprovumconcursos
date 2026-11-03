# Avatar APROVUM — especificação dos modelos 3D

O sistema (editor, banco, desbloqueios, respiração, piscadas e micromovimentos) já está pronto
no painel. Falta só a arte 3D. Este é o pedido para o artista ou o pacote a comprar.

## Formato
- **glTF binário (.glb)**, com texturas embutidas (PBR: base color, normal, roughness/metal).
- Escala real em metros, personagem em pé na origem, olhando para +Z.
- Peso sugerido: corpo até ~6 MB; cada peça até ~1,5 MB (comprimir texturas em 2K/1K, KTX2 opcional).
- Estilo: humano hiper-realista de videogame (nada cartoon), paleta preto/vermelho/branco APROVUM.

## Modelos-base (2)
1. `base_masculino.glb` e 2. `base_feminino.glb` — anatomias, rostos e proporções diferentes.
- **Esqueleto humanoide padrão Mixamo** (nomes `mixamorig:Hips`, `Spine`, `Spine1`, `Spine2`, `Neck`, `Head`,
  `LeftShoulder`, `RightShoulder`, braços, mãos e pernas). Usado pela respiração e pelos micromovimentos.
- **Blend shapes (morph targets)** no rosto, com estes nomes:
  - piscada: `eyeBlinkLeft`, `eyeBlinkRight` (padrão ARKit) — obrigatório;
  - rosto: `face_formato_quadrado`, `face_formato_redondo`, `face_formato_alongado`,
    `face_sobrancelhas_finas`, `face_sobrancelhas_grossas`, `face_olhos_redondos`, `face_olhos_puxados`
    (o padrão "oval/médias/amendoados" é a forma neutra);
  - corpo (opcional): `body_estrutura`, `body_ombros`, `body_constituicao` (0 = neutro, 1 = máximo realista).
- Materiais: a pele num material com "Skin" no nome e textura em tom neutro (o sistema tinge os 7 tons);
  sobrancelhas num material com "Brow" no nome.
- Malhas do corpo separadas por região, para esconder o que a roupa cobre: `torso`, `bracos`, `pernas`, `pes`.
- Opcional: uma animação `Idle` sutil (a respiração e as piscadas são somadas por cima).

## Peças (uma .glb por item do catálogo)
- Cada peça ligada ao **mesmo esqueleto** do modelo-base (mesmos nomes de ossos), com pesos de skin.
- Uma versão por gênero quando a modelagem muda (ex.: `camiseta_oficial_m.glb` e `camiseta_oficial_f.glb`).
- Cabelos e barbas num material com "Hair" no nome, textura em tom neutro (o sistema tinge as 7 cores).
- Miniatura de cada peça: PNG 512×512, fundo escuro, mesmo enquadramento.
- Itens do catálogo inicial (ids na tabela `avatar_items`): cabelos (5 masculinos, 6 femininos),
  4 barbas/bigode, 4 camisetas (oficial preta com o logo APROVUM centralizado no peito, básica,
  camuflada, tática com detalhe vermelho), 8 uniformes (tático APROVUM e os inspirados em Polícia Penal,
  Guarda Municipal, PM, Polícia Civil, PRF, Bombeiros, e traje social), 3 jaquetas/moletons, 4 calças/shorts,
  3 calçados, boné, 2 óculos e 3 acessórios.

## Publicação
1. Enviar os arquivos ao Storage do Supabase, bucket público `avatar-assets` (ex.: `modelos/base_masculino.glb`).
2. Preencher `model_path` e `preview_path` do item na tabela `avatar_items`.
3. Para uma peça cobrir partes do corpo, preencher `meta` com `{"hides": ["torso", "bracos"]}`.
Nível e XP de cada item ficam nas colunas `min_level` e `min_xp` da mesma tabela.
