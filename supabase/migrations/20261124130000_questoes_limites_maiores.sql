-- Questões grandes (texto-base longo, comentário do professor com uma explicação por alternativa) estouravam 6.000.
-- Enunciado, texto-base e justificativa passam a aceitar até 20.000 caracteres; texto e explicação de cada alternativa, até 10.000.
-- Só afrouxa regras: nenhuma linha existente deixa de valer. Rollback: voltar os valores antigos (6000 / 3000) se não houver linhas maiores.
alter table public.bank_questions
  drop constraint if exists bank_questions_statement_check,
  drop constraint if exists bank_questions_case_context_check,
  drop constraint if exists bank_questions_justification_check;
alter table public.bank_questions
  add constraint bank_questions_statement_check check (char_length(statement) between 10 and 20000),
  add constraint bank_questions_case_context_check check (char_length(case_context) <= 20000),
  add constraint bank_questions_justification_check check (char_length(justification) <= 20000);

alter table public.bank_question_options
  drop constraint if exists bank_question_options_text_check,
  drop constraint if exists bank_question_options_explanation_check;
alter table public.bank_question_options
  add constraint bank_question_options_text_check check (char_length(text) between 1 and 10000),
  add constraint bank_question_options_explanation_check check (char_length(explanation) <= 10000);
