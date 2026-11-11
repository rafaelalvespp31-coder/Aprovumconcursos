import Link from "next/link";
import { listOutlines, planTopicsOf, topicMasterPromptFor } from "@/server/services/outlines";
import { importBulkUploadAction, previewBulkUploadAction } from "../../actions";
import { BulkForm } from "./bulk-form";

/** Catalogar em massa: um tópico por vez, com todos os subtópicos. Mesma tela para o administrador e para o sócio liberado. */
export async function BulkUploadView({ searchParams, base, admin }: { searchParams: Promise<{ plano?: string; topico?: string }>; base: string; admin: boolean }) {
  const sp = await searchParams;
  const plano = typeof sp.plano === "string" ? sp.plano : null;
  const gi = typeof sp.topico === "string" && /^\d{1,3}$/.test(sp.topico) ? Number(sp.topico) : null;
  const master = plano && gi !== null ? await topicMasterPromptFor(plano, gi) : null;
  const topics = plano && !master ? await planTopicsOf(plano) : null;
  const plans = !plano ? await listOutlines() : [];
  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href={`${base}/enviar`} className="t-small text-destaque underline underline-offset-2">Catalogar aula</Link>
        <h1 className="mt-1 t-h1">Catalogar em massa (um tópico por vez)</h1>
        <p className="mt-1 max-w-3xl t-small text-tinta-suave">
          Copie o comando-mestre do tópico, peça as aulas de todos os subtópicos à IA, junte tudo num arquivo .txt e envie aqui. Você confere cada aula e, ao clicar em <strong>Publicar</strong>, o sistema cataloga tudo no tópico certo: quem tem 10 questões por nível vai ao ar, as demais entram como rascunho, e subtópico que já existe é atualizado, nunca duplicado.
        </p>
      </div>
      {master && (
        <div className="rounded-md border border-azul/25 bg-nevoa px-4 py-3 t-small">
          <p className="font-semibold">Tópico {master.label}</p>
          <p className="mt-1 text-tinta-suave">Do plano “{master.planTitle}” · {master.subtopics} {master.subtopics === 1 ? "subtópico" : "subtópicos"}. <Link href={`${base}/enviar/massa?plano=${plano}`} className="font-semibold text-destaque underline underline-offset-2">Trocar tópico</Link></p>
        </div>
      )}
      {!master && topics && (
        <section className="rounded-lg border border-linha p-4" data-testid="massa-topicos">
          <h2 className="t-h2">Escolha o tópico do plano “{topics.planTitle}”</h2>
          <ul className="mt-2 divide-y divide-linha">
            {topics.topics.map((t) => (
              <li key={t.gi} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span>{t.label} <span className="t-tiny text-tinta-fraca">· {t.subtopics} subtópico(s)</span></span>
                <Link href={`${base}/enviar/massa?plano=${plano}&topico=${t.gi}`} className="font-semibold text-destaque underline underline-offset-2">Gerar comando-mestre</Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      {!plano && plans.length > 0 && (
        <section className="rounded-lg border border-linha p-4" data-testid="massa-planos">
          <h2 className="t-h2">Escolha o plano</h2>
          <ul className="mt-2 divide-y divide-linha">
            {plans.map((o) => (
              <li key={o.id} className="py-2"><Link href={`${base}/enviar/massa?plano=${o.id}`} className="font-semibold text-destaque underline underline-offset-2">{o.title}</Link></li>
            ))}
          </ul>
        </section>
      )}
      <BulkForm prompt={master?.prompt ?? null} topicLabel={master?.label ?? null} base={base} admin={admin} actions={{ preview: previewBulkUploadAction, publish: importBulkUploadAction }} />
    </div>
  );
}
