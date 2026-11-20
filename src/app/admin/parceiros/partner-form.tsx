import { OFFERS, OFFER_KEYS } from "@/domain/plans/offers";
import type { PartnerRow } from "@/server/services/parceiros-admin";

const input = "mt-1 w-full rounded-md border border-linha bg-nevoa px-3 py-2 t-small";
const toLocal = (iso: string | null) => (iso ? new Date(iso).toISOString().slice(0, 16) : "");

/** Formulário de parceiro + cupom. Sem JavaScript no navegador: envia direto para o servidor, que valida tudo. */
export function PartnerForm({ action, p, submit }: { action: (fd: FormData) => Promise<void>; p?: PartnerRow; submit: string }) {
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-2" data-testid="parceiro-form">
      {p ? (<><input type="hidden" name="partnerId" value={p.id} /><input type="hidden" name="couponId" value={p.couponId ?? ""} /></>) : null}
      <label className="t-small">Nome de divulgação<input name="name" required minLength={2} maxLength={120} defaultValue={p?.name ?? ""} className={input} /></label>
      <label className="t-small">Código do cupom<input name="code" required minLength={3} maxLength={40} defaultValue={p?.code ?? ""} className={`${input} uppercase`} autoCapitalize="characters" /></label>
      <label className="t-small">Desconto ao aluno (%)<input name="discountPct" required type="number" step="0.01" min="0.01" max="100" defaultValue={p ? p.discountPct : 10} className={input} /></label>
      <label className="t-small">Comissão do parceiro (%)<input name="commissionPct" required type="number" step="0.01" min="0" max="100" defaultValue={p ? p.commissionPct : 0} className={input} /></label>
      <label className="t-small">Limite de utilizações (vazio = ilimitado)<input name="maxUses" type="number" min="1" step="1" defaultValue={p?.maxUses ?? ""} className={input} /></label>
      <label className="t-small">Expira em (vazio = sem expiração)<input name="expiresAt" type="datetime-local" defaultValue={toLocal(p?.expiresAt ?? null)} className={input} /></label>
      <label className="t-small">Situação
        <select name="status" defaultValue={p?.status ?? "ativo"} className={input}><option value="ativo">Ativo</option><option value="inativo">Inativo</option></select>
      </label>
      <fieldset className="t-small"><legend>Planos elegíveis</legend>
        <div className="mt-1 flex flex-wrap gap-3">
          {OFFER_KEYS.map((k) => (
            <label key={k} className="flex items-center gap-1"><input type="checkbox" name="offers" value={k} defaultChecked={p ? p.offers.includes(k) : true} />{OFFERS[k].label}</label>
          ))}
        </div>
      </fieldset>
      <p className="t-tiny text-tinta-fraca sm:col-span-2">Cupom nunca acumula com outro cupom. O preço dos planos não muda; o desconto é calculado no servidor.</p>
      <div className="sm:col-span-2"><button type="submit" className="rounded-md bg-tinta px-4 py-2 t-small font-semibold text-white hover:bg-tinta-suave">{submit}</button></div>
    </form>
  );
}
