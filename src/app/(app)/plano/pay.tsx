"use client";

import { useEffect, useState } from "react";
import { INSTALLMENT_OFFERS, installmentOf } from "@/domain/plans/offers";
import { Payment, initMercadoPago } from "@mercadopago/sdk-react";
import { OFFERS, type OfferKey } from "@/domain/plans/offers";
import { isValidCpf, maskCpf } from "@/domain/payments/mercadopago";

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
  rejected_high_risk: "O pagamento foi recusado pela análise de segurança. Confira o CPF, aguarde alguns minutos e tente de novo, ou pague com cartão.",
  cc_rejected_high_risk: "Pagamento não autorizado por segurança. Tente outro meio de pagamento.",
};

/** Pagamento dentro do app: Payment Brick (PIX e cartão em até 12x). Quem confirma é o servidor. */
export function PayBox({ offer, publicKey, email, onClose, onPaid }: { offer: OfferKey; publicKey: string; email: string | null; onClose: () => void; onPaid: () => void }) {
  const [result, setResult] = useState<PayResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [copied, setCopied] = useState(false);
  const [pixBusy, setPixBusy] = useState(false);
  const [tab, setTab] = useState<"pix" | "cartao">("pix");
  const [cardOpened, setCardOpened] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [cpf, setCpf] = useState(() => {
    try {
      return typeof window === "undefined" ? "" : maskCpf(window.localStorage.getItem("na:cpf-pix") ?? "");
    } catch {
      return "";
    }
  });

  // PIX direto: sem pedir e-mail. O servidor usa o e-mail da conta do aluno.
  const payPix = async () => {
    if (pixBusy) return;
    setError(null);
    if (!isValidCpf(cpf)) return setError("Informe um CPF válido para gerar o PIX.");
    setPixBusy(true);
    try {
      window.localStorage.setItem("na:cpf-pix", cpf.replace(/\D/g, ""));
    } catch {
      /* sem armazenamento: só não lembra o CPF */
    }
    try {
      const r = await fetch("/api/payments/create", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ offer, formData: { payment_method_id: "pix", payer: { identification: { type: "CPF", number: cpf.replace(/\D/g, "") } } }, deviceId: deviceId() }) });
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
  // Temporizador só quando o Mercado Pago informa a validade real da cobrança.
  const expMs = result?.pix?.expiresAt ? Date.parse(result.pix.expiresAt) : NaN;
  useEffect(() => {
    if (!Number.isFinite(expMs) || result?.status !== "pendente") return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [expMs, result?.status]);
  useEffect(() => {
    if (result?.status === "aprovado") onPaid();
  }, [result?.status, onPaid]);

  const o = OFFERS[offer];
  ensureSdk(publicKey);
  const parcelado = INSTALLMENT_OFFERS.includes(offer);
  const parc = installmentOf(offer);
  const faltaMs = Number.isFinite(expMs) ? Math.max(0, expMs - now) : null;
  const mmss = faltaMs === null ? null : `${String(Math.floor(faltaMs / 60000)).padStart(2, "0")}:${String(Math.floor((faltaMs % 60000) / 1000)).padStart(2, "0")}`;

  const head = (
    <header className="ck-topo">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="ck-logo" src="/icons/aprovum-wordmark.png" alt="APROVUM" width={150} height={32} />
      <p className="ck-pill"><Crown />PLANO {o.label.toUpperCase()}</p>
      {result === null && (
        <>
          <p className="ck-preco"><small>APENAS</small> {o.price}</p>
          <p className="ck-acesso">{offer === "vitalicio" ? <><span>ACESSO PARA SEMPRE</span><Infinito /></> : <span>{o.per.toUpperCase()}</span>}</p>
          <p className="ck-faixa"><Raio />{parcelado ? "PIX OU CARTÃO EM ATÉ 12X" : "PIX OU CARTÃO"}</p>
        </>
      )}
    </header>
  );

  const trust = (
    <ul className="ck-trust" aria-label="Garantias">
      <li><Escudo /><b>COMPRA 100% SEGURA</b></li>
      <li><Cadeado /><b>SEUS DADOS PROTEGIDOS</b></li>
      <li><Raio /><b>ACESSO IMEDIATO</b></li>
    </ul>
  );

  if (result) {
    const approved = result.status === "aprovado";
    const failed = result.status === "recusado" || result.status === "cancelado";
    return (
      <div className="ck">
        {head}
        <p className="ck-k" role="status">{approved ? "PAGAMENTO CONFIRMADO" : failed ? "PAGAMENTO NÃO CONCLUÍDO" : result.pix ? "PAGUE COM PIX" : "PAGAMENTO EM ANÁLISE"}</p>
        {approved && <p className="ck-ok" data-testid="plano-liberado"><Check />Seu plano foi liberado. Bons estudos!</p>}
        {failed && <p role="alert" className="ck-erro">{REASON[result.statusDetail ?? ""] ?? "O pagamento não foi aprovado. Você pode tentar novamente."}</p>}
        {result.status === "pendente" && result.pix && (
          <div className="ck-pix" data-testid="plano-pix">
            {result.pix.qrBase64 && (
              // eslint-disable-next-line @next/next/no-img-element
              <img className="ck-qr" src={`data:image/png;base64,${result.pix.qrBase64}`} alt="QR Code do PIX" width={200} height={200} />
            )}
            <p className="ck-pix-t">PAGUE COM PIX</p>
            <p className="ck-s">Aponte a câmera do seu celular ou use o PIX Copia e Cola. A liberação é automática.</p>
            <p className="ck-valor">Valor: <b>{money(result.amountCents)}</b></p>
            <textarea readOnly className="ck-cola" value={result.pix.qrCode} aria-label="PIX Copia e Cola" onFocus={(e) => e.currentTarget.select()} />
            <button
              type="button"
              className={`ck-copiar ${copied ? "ok" : ""}`}
              onClick={() => navigator.clipboard?.writeText(result.pix!.qrCode).then(() => (setCopied(true), setTimeout(() => setCopied(false), 2500)))}
              data-testid="plano-copiar"
            >
              {copied ? <><Check />CÓDIGO COPIADO!</> : <><Copia />COPIAR CÓDIGO PIX</>}
            </button>
            {mmss && (
              <p className="ck-timer">QR CODE VÁLIDO POR: <b>{faltaMs === 0 ? "expirado" : mmss}</b></p>
            )}
            <p className="ck-status"><i className="ck-pulso" />Aguardando confirmação do pagamento…</p>
          </div>
        )}
        {result.status === "pendente" && !result.pix && <p className="ck-s">Estamos aguardando a confirmação do pagamento. O plano é liberado automaticamente.</p>}
        {result.method !== "pix" && result.installments && result.installments > 0 && result.status !== "recusado" && (
          <p className="ck-s">
            {result.installments}x de {money(Math.round((result.totalPaidCents ?? result.amountCents) / result.installments))} · total {money(result.totalPaidCents ?? result.amountCents)}
          </p>
        )}
        {failed ? (
          <button type="button" className="ck-final" onClick={() => setResult(null)}><span>TENTAR NOVAMENTE</span></button>
        ) : (
          <button type="button" className="ck-voltar" onClick={onClose}>Fechar</button>
        )}
        {trust}
      </div>
    );
  }

  const escolher = (t: "pix" | "cartao") => {
    setTab(t);
    setError(null);
    if (t === "cartao") setCardOpened(true);
  };

  return (
    <div className="ck">
      {head}
      <div className="ck-abas" role="tablist" aria-label="Forma de pagamento">
        <button type="button" role="tab" id="ck-tab-pix" aria-selected={tab === "pix"} aria-controls="ck-pn-pix" className={`ck-aba ${tab === "pix" ? "on" : ""}`} onClick={() => escolher("pix")} data-testid="plano-aba-pix">
          <IconePix />
          <span><b>PIX</b><small>Pagamento instantâneo</small></span>
          <i className="ck-mark" aria-hidden>{tab === "pix" && <Check />}</i>
        </button>
        <button type="button" role="tab" id="ck-tab-cartao" aria-selected={tab === "cartao"} aria-controls="ck-pn-cartao" className={`ck-aba ${tab === "cartao" ? "on" : ""}`} onClick={() => escolher("cartao")} data-testid="plano-aba-cartao">
          <IconeCartao />
          <span><b>CARTÃO DE CRÉDITO</b><small>{parcelado ? "Parcelamento em até 12x" : "À vista"}</small></span>
          <i className="ck-mark" aria-hidden>{tab === "cartao" && <Check />}</i>
        </button>
      </div>
      {error && <p role="alert" className="ck-erro">{error}</p>}

      <section id="ck-pn-pix" role="tabpanel" aria-labelledby="ck-tab-pix" hidden={tab !== "pix"} className="ck-painel">
        <p className="ck-valor">Valor da transação: <b>{o.price}</b></p>
        <label className="ck-campo">
          <span>CPF do pagador</span>
          <input inputMode="numeric" autoComplete="off" placeholder="000.000.000-00" value={cpf} onChange={(e) => setCpf(maskCpf(e.target.value))} data-testid="plano-cpf" maxLength={14} aria-invalid={!!cpf && !isValidCpf(cpf)} />
        </label>
        <p className="ck-s">O QR Code e o código Copia e Cola são gerados com o valor real do plano assim que você finalizar.</p>
        <button type="button" className="ck-final" disabled={pixBusy} aria-busy={pixBusy} onClick={payPix} data-testid="plano-pix-pagar">
          <span>{pixBusy ? <><i className="ck-spin" />GERANDO QR CODE…</> : <><Cadeado />FINALIZAR PAGAMENTO<em aria-hidden>»</em></>}</span>
        </button>
      </section>

      <section id="ck-pn-cartao" role="tabpanel" aria-labelledby="ck-tab-cartao" hidden={tab !== "cartao"} className="ck-painel">
        {parc && <p className="ck-valor">Em até <b>12x de {parc.value}</b> · total {o.price}</p>}
        {!parc && <p className="ck-valor">Valor: <b>{o.price}</b></p>}
        <p className="ck-bandeiras" aria-label="Bandeiras aceitas">VISA · MASTERCARD · ELO · AMEX · HIPERCARD</p>
        {cardOpened && !ready && <p className="ck-s">Carregando pagamento seguro…</p>}
        <div className="ck-brick" data-testid="plano-brick">
          {cardOpened && (
            <Payment
              initialization={{ amount: o.cents / 100, ...(email ? { payer: { email } } : {}) }}
              customization={{
                paymentMethods: { creditCard: "all", maxInstallments: 12 },
                visual: {
                  style: { theme: "dark", customVariables: { baseColor: "#FF101A", baseColorFirstVariant: "#B8000A", baseColorSecondVariant: "#FF101A", errorColor: "#ff6b61", textPrimaryColor: "#F5F5F5", textSecondaryColor: "#9aa0a6", inputBackgroundColor: "#0b0b0c", formBackgroundColor: "#050505", borderRadiusMedium: "10px", borderRadiusLarge: "12px" } },
                },
              }}
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
          )}
        </div>
      </section>

      <button type="button" className="ck-voltar" onClick={onClose}>Voltar</button>
      {trust}
    </div>
  );
}

const ic = { width: 20, height: 20, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true, focusable: false } as const;
const Crown = () => <svg {...ic} className="ck-ic"><path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5z" /></svg>;
const Infinito = () => <svg {...ic} width={26} className="ck-ic"><path d="M7 8a4 4 0 100 8c4 0 6-8 10-8a4 4 0 110 8c-4 0-6-8-10-8z" /></svg>;
const Raio = () => <svg {...ic} className="ck-ic"><path d="M13 2L4 14h7l-1 8 9-12h-7z" /></svg>;
const Escudo = () => <svg {...ic} className="ck-ic"><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" /><path d="M9 12l2 2 4-4" /></svg>;
const Cadeado = () => <svg {...ic} className="ck-ic"><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 018 0v3" /></svg>;
const Check = () => <svg {...ic} width={16} height={16} strokeWidth={3} className="ck-ic"><path d="M5 12l5 5 9-10" /></svg>;
const Copia = () => <svg {...ic} className="ck-ic"><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V6a2 2 0 012-2h9" /></svg>;
const IconeCartao = () => <svg {...ic} width={26} height={26} className="ck-ic"><rect x="2.5" y="5" width="19" height="14" rx="2.5" /><path d="M2.5 10h19M6 15h4" /></svg>;
/** Marca do PIX (losango com as quatro pontas). */
const IconePix = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden focusable="false" className="ck-ic" fill="currentColor">
    <path d="M12 2.6l3.6 3.6c.5.5 1.2.8 1.9.8h1.2L16 9.7a2.7 2.7 0 000 3.8l2.7 2.7h-1.2c-.7 0-1.4.3-1.9.8L12 21.4l-3.600-3.600a2.700 2.700 0 00-1.900-.800H5.300L8 14.300a2.700 2.700 0 000-3.800L5.300 7.800h1.200c.7 0 1.400-.3 1.900-.8z" opacity=".95" />
  </svg>
);
