-- Converte notação LaTeX que ficou gravada no conteúdo das aulas (\(…\), \[…\], \begin{array}, \frac, \times…) em texto legível.
-- Reversível: guarda cópia das linhas alteradas em _bak_latex_*. As funções auxiliares são removidas no final.

create or replace function public._rx(s text) returns text language sql immutable as $f$
  select replace(replace(s, '\', '\\'), '&', '\&')
$f$;

create or replace function public._tex_inline(s text, strip boolean default true) returns text language plpgsql immutable as $f$
declare t text := s; m text[]; rep text; n int; pat text; simple text := '^[[:alnum:]_.,()]+$';
begin
  pat := '\\[dt]?frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}';
  n := 0;
  loop
    m := regexp_match(t, pat);
    exit when m is null or n > 300;
    n := n + 1;
    rep := (case when m[1] ~ simple then m[1] else '(' || m[1] || ')' end) || '/' || (case when m[2] ~ simple then m[2] else '(' || m[2] || ')' end);
    t := regexp_replace(t, pat, public._rx(rep), '');
  end loop;
  t := regexp_replace(t, '\\sqrt\s*\{([^{}]*)\}', '√(\1)', 'g');
  t := regexp_replace(t, '\\(text|mathrm|mathbf|operatorname|textbf)\s*\{([^{}]*)\}', '\2', 'g');
  t := regexp_replace(t, '\\times', '×', 'g');
  t := regexp_replace(t, '\\cdot', '·', 'g');
  t := regexp_replace(t, '\\div', '÷', 'g');
  t := regexp_replace(t, '\\pm', '±', 'g');
  t := regexp_replace(t, '\\(leq|le)(?![a-zA-Z])', '≤', 'g');
  t := regexp_replace(t, '\\(geq|ge)(?![a-zA-Z])', '≥', 'g');
  t := regexp_replace(t, '\\neq?(?![a-zA-Z])', '≠', 'g');
  t := regexp_replace(t, '\\approx', '≈', 'g');
  t := regexp_replace(t, '\\(Rightarrow|implies)', '⇒', 'g');
  t := regexp_replace(t, '\\(rightarrow|to)(?![a-zA-Z])', '→', 'g');
  t := regexp_replace(t, '\\(ldots|cdots|dots)', '…', 'g');
  t := regexp_replace(t, '\\Delta', 'Δ', 'g');
  t := regexp_replace(t, '\\sum', 'Σ', 'g');
  t := regexp_replace(t, '\\mid(?![a-zA-Z])', '|', 'g');
  t := regexp_replace(t, '\\in(?![a-zA-Z])', '∈', 'g');
  t := regexp_replace(t, '\\%', '%', 'g');
  t := regexp_replace(t, '\\(quad|qquad)', ' ', 'g');
  t := regexp_replace(t, '\\[,;!:]', ' ', 'g');
  t := regexp_replace(t, '\\(left|right)', '', 'g');
  t := regexp_replace(t, '\\ ', ' ', 'g');
  n := 0;
  loop
    m := regexp_match(t, '\^\{([^{}]*)\}');
    exit when m is null or n > 300;
    n := n + 1;
    rep := case when m[1] ~ '^[0-9n+-]+$' then translate(m[1], '0123456789n+-', '⁰¹²³⁴⁵⁶⁷⁸⁹ⁿ⁺⁻') else '^(' || m[1] || ')' end;
    t := regexp_replace(t, '\^\{([^{}]*)\}', public._rx(rep), '');
  end loop;
  n := 0;
  loop
    m := regexp_match(t, '\^([0-9n])');
    exit when m is null or n > 300;
    n := n + 1;
    t := regexp_replace(t, '\^([0-9n])', public._rx(translate(m[1], '0123456789n', '⁰¹²³⁴⁵⁶⁷⁸⁹ⁿ')), '');
  end loop;
  t := regexp_replace(t, '_\{([^{}]*)\}', '_\1', 'g');
  if strip then
    t := regexp_replace(t, '[{}]', '', 'g');
    t := btrim(regexp_replace(t, '[ \t]+', ' ', 'g'));
  end if;
  return t;
end $f$;

create or replace function public._tex_array(body text) returns text language plpgsql immutable as $f$
declare r text; cs text[]; cell text; arr jsonb := '[]'::jsonb; rw jsonb; ncols int := 0; w int[] := '{}'; j int; line text; outl text[] := '{}'; row jsonb; v text;
begin
  body := regexp_replace(body, '^\s*\{[^{}]*\}', '');
  for r in select btrim(x) from regexp_split_to_table(body, '(\\\\)+|\n') x loop
    continue when r = '';
    cs := string_to_array(r, '&');
    rw := '[]'::jsonb;
    foreach cell in array cs loop rw := rw || to_jsonb(public._tex_inline(cell)); end loop;
    arr := arr || jsonb_build_array(rw);
    ncols := greatest(ncols, array_length(cs, 1));
  end loop;
  if ncols = 0 then return ''; end if;
  for j in 1..greatest(ncols - 1, 1) loop
    w[j] := 1;
    for row in select * from jsonb_array_elements(arr) loop
      w[j] := greatest(w[j], length(coalesce(row ->> (j - 1), '')));
    end loop;
  end loop;
  for row in select * from jsonb_array_elements(arr) loop
    line := '';
    for j in 1..(ncols - 1) loop
      line := line || case when j > 1 then '  ' else '' end || lpad(coalesce(row ->> (j - 1), ''), w[j]);
    end loop;
    v := coalesce(row ->> (ncols - 1), '');
    outl := outl || rtrim(line || ' | ' || v);
  end loop;
  return array_to_string(outl, E'\n');
end $f$;

create or replace function public._tex_display(body text) returns text language plpgsql immutable as $f$
declare m text[];
begin
  m := regexp_match(body, '\\begin\{array\}([\s\S]*?)\\end\{array\}');
  if m is not null then return E'\n```text\n' || public._tex_array(m[1]) || E'\n```\n'; end if;
  return public._tex_inline(body);
end $f$;

create or replace function public._tex_text(s text) returns text language plpgsql immutable as $f$
declare t text := s; m text[]; n int; pat text; hint text := '\\(\(|\[|begin|times|frac|dfrac|cdot|div|quad|neq|leq|geq|ldots|Delta|sum|text|mathbf|left|right|approx|Rightarrow|sqrt|pm)';
begin
  if t is null or t !~ hint then return t; end if;
  foreach pat in array array['\\\[([\s\S]*?)\\\]', '\$\$([\s\S]*?)\$\$', '\\\(([\s\S]*?)\\\)'] loop
    n := 0;
    loop
      m := regexp_match(t, pat);
      exit when m is null or n > 500;
      n := n + 1;
      t := regexp_replace(t, pat, public._rx(public._tex_display(m[1])), '');
    end loop;
  end loop;
  n := 0;
  loop
    m := regexp_match(t, '\\begin\{array\}([\s\S]*?)\\end\{array\}');
    exit when m is null or n > 50;
    n := n + 1;
    t := regexp_replace(t, '\\begin\{array\}([\s\S]*?)\\end\{array\}', public._rx(public._tex_display(m[0])), '');
  end loop;
  if t ~ '\\(times|frac|dfrac|cdot|div|quad|neq|leq|geq|ldots|Delta|sum|mathbf|approx|Rightarrow|sqrt|pm)' then t := public._tex_inline(t, false); end if;
  return t;
end $f$;

create or replace function public._tex_json(j jsonb) returns jsonb language plpgsql immutable as $f$
begin
  case jsonb_typeof(j)
    when 'string' then return to_jsonb(public._tex_text(j #>> '{}'));
    when 'array' then return coalesce((select jsonb_agg(public._tex_json(e) order by ord) from jsonb_array_elements(j) with ordinality t(e, ord)), '[]'::jsonb);
    when 'object' then return coalesce((select jsonb_object_agg(k, public._tex_json(v)) from jsonb_each(j) t(k, v)), '{}'::jsonb);
    else return j;
  end case;
end $f$;
