"use client";

import { useEffect, useState } from "react";
import { Payment, initMercadoPago } from "@mercadopago/sdk-react";
import { OFFERS, type OfferKey } from "@/domain/plans/offers";

interface PayResult {
  id: string;
  status: "pendente" | "aprovado" | "recusado" | "cancelado" | "reembolsado";
  method: string | null;
  installments: number | null;
  amountCents: number;
  totalPaidCents: number | null;
  statusDetail: string | null;
  pix: { qrCode: string; qrBase64: string | null; expiresAt: string | null } | null;
}

let sdkKey: string | null = null;
/** Inicia o SDK uma vez por chave, antes de o Brick montar (idempotente). */
function ensureSdk(key: string) {
  if (typeof window === "undefined" || sdkKey === key) return;
  initMercadoPago(key, { locale: "pt-BR" });
  sdkKey = key;
}

/** Identificador do dispositivo que o SDK do Mercado Pago cria: o antifraude usa para aprovar o pagamento. */
const deviceId = () => (typeof window === "undefined" ? undefined : (window as unknown as { MP_DEVICE_SESSION_ID?: string }).MP_DEVICE_SESSION_ID);

const money = (c: number) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const REASON: Record<string, string> = {
  cc_rejected_insufficient_amount: "Saldo insuficiente no cartão.",
  cc_rejected_bad_filled_security_code: "Código de segurança inválido.",
  cc_rejected_bad_filled_date: "Data de validade inválida.",
  cc_rejected_bad_filled_other: "Confira os dados do cartão.",
  cc_rejected_call_for_authorize: "Autorize o pagamento com o seu banco e tente de novo.",
  cc_rejected_high_risk: "Pagamento não autorizado por segurança. Tente outro meio de pagamento.",
};

/** Pagamento dentro do app: Payment Brick (PIX e cartão em até 12x). Quem confirma é o servidor. */
export function PayBox({ offer, publicKey, email, onClose, onPaid }: { offer: OfferKey; publicKey: string; email: string | null; onClose: () => void; onPaid: () => void }) {
  const [result, setResult] = useState<PayResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [copied, setCopied] = useState(false);
  const [pixBusy, setPixBusy] = useState(false);

  // PIX direto: sem pedir e-mail. O servidor usa o e-mail da conta do aluno.
  const payPix = async () => {
    setError(null);
    setPixBusy(true);
    try {
      const r = await fetch("/api/payments/create", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ offer, formData: { payment_method_id: "pix" }, deviceId: deviceId() }) });
      const j = (await r.json().catch(() => ({}))) as { payment?: PayResult; error?: string };
      if (!r.ok || !j.payment) setError(j.error ?? "Não foi possível gerar o PIX agora. Tente novamente.");
      else setResult(j.payment);
    } catch {
      setError("Sem conexão. Tente novamente.");
    } finally {
      setPixBusy(false);
    }
  };

  // Enquanto pendente (PIX), pergunta ao servidor — que confirma no Mercado Pago — até aprovar.
  useEffect(() => {
    if (!result || result.status !== "pendente") return;
    const t = setInterval(async () => {
      try {
        const r = await fetch(`/api/payments/status/${result.id}`, { cache: "no-store" });
        if (!r.ok) return;
        const { payment } = (await r.json()) as { payment: PayResult };
        if (payment.status !== "pendente") setResult(payment);
      } catch {
        /* tenta no próximo ciclo */
      }
    }, 4000);
    return () => clearInterval(t);
  }, [result]);
  useEffect(() => {
    if (result?.status === "aprovado") onPaid();
  }, [result?.status, onPaid]);

  const o = OFFERS[offer];
  ensureSdk(publicKey);

  if (result) {
    const approved = result.status === "aprovado";
    const failed = result.status === "recusado" || result.status === "cancelado";
    return (
      <>
        <p className="plano-k">{approved ? "PAGAMENTO CONFIRMADO" : failed ? "PAGAMENTO NÃO CONCLUÍDO" : result.pix ? "PAGUE COM PIX" : "PAGAMENTO EM ANÁLISE"}</p>
        <p className="plano-t">{o.label}</p>
        {approved && <p className="plano-s" data-testid="plano-liberado">Seu plano foi liberado. Bons estudos!</p>}
        {failed && <p role="alert" className="plano-e">{REASON[result.statusDetail ?? ""] ?? "O pagamento não foi aprovado. Você pode tentar novamente."}</p>}
        {result.status === "pendente" && result.pix && (
          <div data-testid="plano-pix">
            {result.pix.qrBase64 && (
              // eslint-disable-next-line @next/next/no-img-element
              <img className="plano-qr" src={`data:image/png;base64,${result.pix.qrBase64}`} alt="QR Code do PIX" width={220} height={220} />
            )}
            <p className="plano-s">Escaneie o QR Code ou use o PIX Copia e Cola. A liberação é automática quando o pagamento for confirmado.</p>
            <textarea readOnly className="plano-cola" value={result.pix.qrCode} aria-label="PIX Copia e Cola" onFocus={(e) => e.currentTarget.select()} />
            <button
              type="button"
              className="plano-b"
              onClick={() => navigator.clipboard?.writeText(result.pix!.qrCode).then(() => (setCopied(true), setTimeout(() => setCopied(false), 2500)))}
              data-testid="plano-copiar"
            >
              {copied ? "Código copiado!" : "Copiar código PIX"}
            </button>
            <p className="plano-s">Aguardando confirmação do pagamento…</p>
          </div>
        )}
        {result.status === "pendente" && !result.pix && <p className="plano-s">Estamos aguardando a confirmação do pagamento. O plano é liberado automaticamente.</p>}
        {result.method !== "pix" && result.installments && result.installments > 0 && result.status !== "recusado" && (
          <p className="plano-s">
            {result.installments}x de {money(Math.round((result.totalPaidCents ?? result.amountCents) / result.installments))} · total {money(result.totalPaidCents ?? result.amountCents)}
          </p>
        )}
        {failed ? (
          <button type="button" className="plano-b" onClick={() => setResult(null)}>Tentar novamente</button>
        ) : (
          <button type="button" className="plano-c" onClick={onClose}>Fechar</button>
        )}
      </>
    );
  }

  return (
    <>
      <p className="plano-k">VOCÊ ESCOLHEU</p>
      <p className="plano-t">{o.label}</p>
      <p className="plano-p">{o.price}</p>
      <p className="plano-s">{o.per} · PIX ou cartão em até 12x</p>
      {error && <p role="alert" className="plano-e">{error}</p>}
      <button type="button" className="plano-b" disabled={pixBusy} onClick={payPix} data-testid="plano-pix-pagar">
        {pixBusy ? "Gerando PIX…" : "Pagar com PIX"}
      </button>
      <p className="plano-s">ou pague com cartão de crédito em até 12x</p>
      {!ready && <p className="plano-s">Carregando pagamento seguro…</p>}
      <div className="plano-brick" data-testid="plano-brick">
        <Payment
          initialization={{ amount: o.cents / 100, ...(email ? { payer: { email } } : {}) }}
          customization={{ paymentMethods: { creditCard: "all", maxInstallments: 12 }, visual: { style: { theme: "dark" } } }}
          locale="pt-BR"
          onReady={() => setReady(true)}
          onError={() => setError("Não foi possível carregar o pagamento. Atualize a página e tente de novo.")}
          onSubmit={async ({ formData }) => {
            setError(null);
            const r = await fetch("/api/payments/create", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ offer, formData, deviceId: deviceId() }) });
            const j = (await r.json().catch(() => ({}))) as { payment?: PayResult; error?: string };
            if (!r.ok || !j.payment) {
              setError(j.error ?? "Não foi possível processar o pagamento.");
              throw new Error(j.error ?? "falha");
            }
            setResult(j.payment);
          }}
        />
      </div>
      <button type="button" className="plano-c" onClick={onClose}>Voltar</button>
    </>
  );
}
