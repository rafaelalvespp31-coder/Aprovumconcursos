import { Flashcards } from "@/components/flashcards";
import { TrueFalseCards } from "@/components/true-false-cards";

/** Prévia dos cartões interativos da aula (dados de EXEMPLO). */
const FLASH = `**O delegado pode arquivar o inquérito policial?**
→ **Não.** O art. 17 do CPP proíbe. Quem decide é o **MP** (art. 28).

**Prazos do IP no CPP (justiça estadual)?**
→ **10 dias** preso; **30 dias** solto (art. 10).

**O que diz a Súmula Vinculante 14?**
→ Acesso amplo da defesa aos elementos **já documentados**.`;

const TF = `**Afirmação 1.** O delegado pode arquivar o inquérito quando não houver provas.
→ ERRADO. O art. 17 do CPP proíbe.

**Afirmação 2.** O indiciamento é ato privativo do delegado e deve ser fundamentado.
→ CERTO. Lei 12.830/2013, art. 2º, § 6º.`;

export default function Page() {
  return (
    <div className="flex max-w-2xl flex-col gap-8">
      <section>
        <h1 className="t-h1 mb-3">Flashcards</h1>
        <Flashcards markdown={FLASH} />
      </section>
      <section>
        <h2 className="t-h2 mb-3">Certo ou errado</h2>
        <TrueFalseCards markdown={TF} />
      </section>
    </div>
  );
}
