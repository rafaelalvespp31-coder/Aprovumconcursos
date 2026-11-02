"use client";

import { useState, useTransition } from "react";
import { Button, inputClass, Tag } from "@/components/ui";
import {
  PERMISSION_GROUPS,
  type PartnerPermission,
} from "@/domain/partner/permissions";
import type { PartnerActionResult } from "./actions";

export interface PartnerItem {
  userId: string;
  name: string | null;
  email: string | null;
  active: boolean;
  permissions: PartnerPermission[];
  createdAt: string;
  lastSignInAt: string | null;
}
export interface PartnerAuditItem {
  at: string;
  action: string;
  actorEmail: string | null;
  meta: Record<string, unknown>;
}
export interface PartnerActions {
  create: (d: {
    name: string;
    email: string;
    password?: string;
  }) => Promise<PartnerActionResult>;
  setActive: (userId: string, active: boolean) => Promise<PartnerActionResult>;
  setPermissions: (
    userId: string,
    permissions: string[],
  ) => Promise<PartnerActionResult>;
}

const when = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString("pt-BR", {
        timeZone: "America/Sao_Paulo",
        dateStyle: "short",
        timeStyle: "short",
      })
    : "nunca";
const LABEL = new Map(
  PERMISSION_GROUPS.flatMap((g) =>
    g.items.map((i) => [i.key as string, i.label]),
  ),
);
const ACTION: Record<string, string> = {
  "admin.partner_created": "Conta do sócio criada/vinculada",
  "admin.partner_activated": "Acesso ativado",
  "admin.partner_deactivated": "Acesso desativado",
  "admin.partner_permissions": "Permissões alteradas",
  "partner.acesso_negado": "Tentativa de acesso não autorizado",
};

function Feedback({ r }: { r: PartnerActionResult | null }) {
  if (!r) return null;
  return (
    <p
      role="status"
      data-testid="socio-aviso"
      className={`t-small font-semibold ${r.ok ? "text-tinta" : "text-erro"}`}
    >
      {r.ok ? r.message : r.error}
    </p>
  );
}

function CreateForm({ onCreate }: { onCreate: PartnerActions["create"] }) {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<PartnerActionResult | null>(null);
  return (
    <form
      className="mt-3 grid gap-3 rounded-lg border border-linha bg-superficie p-4 sm:grid-cols-3"
      data-testid="socio-criar"
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const form = e.currentTarget;
        start(async () => {
          const r = await onCreate({
            name: String(f.get("name") ?? ""),
            email: String(f.get("email") ?? ""),
            password: String(f.get("password") ?? ""),
          });
          setResult(r);
          if (r.ok) form.reset();
        });
      }}
    >
      <label className="flex flex-col gap-1 t-small font-semibold">
        Nome do sócio
        <input
          name="name"
          required
          minLength={2}
          maxLength={80}
          className={inputClass}
          autoComplete="off"
        />
      </label>
      <label className="flex flex-col gap-1 t-small font-semibold">
        E-mail de login
        <input
          name="email"
          type="email"
          required
          className={inputClass}
          autoComplete="off"
        />
      </label>
      <label className="flex flex-col gap-1 t-small font-semibold">
        Senha (opcional)
        <input
          name="password"
          type="text"
          minLength={8}
          className={inputClass}
          autoComplete="new-password"
          placeholder="Em branco = gerar uma"
        />
      </label>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-3">
        <Button
          type="submit"
          disabled={pending}
          data-testid="socio-criar-botao"
        >
          {pending ? "Salvando…" : "Criar ou vincular sócio"}
        </Button>
        <Feedback r={result} />
        {result?.ok && result.password && (
          <p className="t-small">
            Senha de acesso:{" "}
            <code
              className="rounded bg-tinta px-2 py-1 font-mono text-white"
              data-testid="socio-senha"
            >
              {result.password}
            </code>{" "}
            — anote agora, ela não aparece de novo.
          </p>
        )}
      </div>
      <p className="t-tiny text-tinta-fraca sm:col-span-3">
        Se o e-mail já tiver conta no APROVUM, ela é vinculada (sem duplicar
        cadastro). O sócio começa sem nenhuma permissão e entra pelo mesmo
        “Entrar” do site, indo direto para o APROVUM BUSINESS.
      </p>
    </form>
  );
}

function PartnerCard({
  p,
  actions,
}: {
  p: PartnerItem;
  actions: PartnerActions;
}) {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<PartnerActionResult | null>(null);
  const [perms, setPerms] = useState<Set<string>>(() => new Set(p.permissions));
  const dirty =
    perms.size !== p.permissions.length ||
    p.permissions.some((x) => !perms.has(x));
  const toggle = (k: string) =>
    setPerms((s) => {
      const n = new Set(s);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });
  return (
    <article
      className="rounded-lg border border-linha bg-superficie p-4"
      data-testid="socio-card"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-bold">{p.name ?? "Sócio"}</p>
          <p className="t-small text-tinta-suave">{p.email}</p>
          <p className="t-tiny text-tinta-fraca">
            Criado em {when(p.createdAt)} · último acesso:{" "}
            {when(p.lastSignInAt)}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span data-testid="socio-status">
            {p.active ? (
              <Tag tone="verde">Ativo</Tag>
            ) : (
              <Tag tone="vermelho">Desativado</Tag>
            )}
          </span>
          <Button
            type="button"
            variant={p.active ? "perigo" : "secundario"}
            disabled={pending}
            data-testid="socio-alternar"
            onClick={() =>
              start(async () =>
                setResult(await actions.setActive(p.userId, !p.active)),
              )
            }
          >
            {p.active ? "Desativar acesso" : "Ativar acesso"}
          </Button>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        {PERMISSION_GROUPS.map((g) => (
          <fieldset key={g.kind} className="rounded-md border border-linha p-3">
            <legend className="px-1 t-small font-bold">
              {g.title}{" "}
              {g.kind === "financeiro" && <Tag tone="ambar">sensível</Tag>}
            </legend>
            <div className="mt-1 flex flex-col gap-2">
              {g.items.map((i) => (
                <label key={i.key} className="flex items-start gap-2 t-small">
                  <input
                    type="checkbox"
                    className="mt-1 size-4 shrink-0 accent-[#c80500]"
                    checked={perms.has(i.key)}
                    onChange={() => toggle(i.key)}
                    data-testid={`perm-${i.key}`}
                  />
                  <span>
                    <span className="font-semibold">{i.label}</span>
                    {i.note && (
                      <span className="block t-tiny text-tinta-fraca">
                        {i.note}
                      </span>
                    )}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Button
          type="button"
          disabled={pending || !dirty}
          data-testid="socio-salvar"
          onClick={() =>
            start(async () =>
              setResult(await actions.setPermissions(p.userId, [...perms])),
            )
          }
        >
          {pending ? "Salvando…" : "Salvar permissões"}
        </Button>
        <Button
          type="button"
          variant="discreto"
          disabled={pending}
          onClick={() => setPerms(new Set())}
        >
          Desmarcar todas
        </Button>
        <span className="t-tiny text-tinta-fraca">
          {perms.size} de{" "}
          {PERMISSION_GROUPS.reduce((a, g) => a + g.items.length, 0)} liberadas
        </span>
        <Feedback r={result} />
      </div>
    </article>
  );
}

function describe(e: PartnerAuditItem): string {
  const m = e.meta;
  if (e.action === "admin.partner_permissions") {
    const lib = (m.liberadas as string[] | undefined) ?? [];
    const blo = (m.bloqueadas as string[] | undefined) ?? [];
    return (
      [
        lib.length
          ? `liberou: ${lib.map((k) => LABEL.get(k) ?? k).join(", ")}`
          : "",
        blo.length
          ? `bloqueou: ${blo.map((k) => LABEL.get(k) ?? k).join(", ")}`
          : "",
      ]
        .filter(Boolean)
        .join(" · ") || "sem mudanças"
    );
  }
  if (e.action === "partner.acesso_negado")
    return `motivo: ${String(m.motivo ?? "sem permissão")}`;
  if (e.action === "admin.partner_created")
    return `${String(m.email ?? "")}${m.linked ? " (conta existente)" : ""}`;
  return "";
}

/** Gestão do SÓCIO ADMIN dentro do ADMIN MASTER: conta, ativação, permissões e auditoria. */
export function PartnerManager({
  partners,
  audit,
  actions,
}: {
  partners: PartnerItem[];
  audit: PartnerAuditItem[];
  actions: PartnerActions;
}) {
  return (
    <div className="flex flex-col gap-8">
      <section aria-labelledby="socio-novo">
        <h2 id="socio-novo" className="t-h3">
          Cadastrar sócio
        </h2>
        <CreateForm onCreate={actions.create} />
      </section>

      <section aria-labelledby="socio-lista">
        <h2 id="socio-lista" className="t-h3">
          Sócios ({partners.length})
        </h2>
        <p className="mt-1 t-small text-tinta-suave">
          Mudanças valem na hora: o painel do sócio confere as permissões a cada
          consulta e se atualiza sozinho.
        </p>
        <div className="mt-3 flex flex-col gap-4">
          {partners.length ? (
            partners.map((p) => (
              <PartnerCard
                key={`${p.userId}-${p.active}-${p.permissions.join()}`}
                p={p}
                actions={actions}
              />
            ))
          ) : (
            <p className="t-small text-tinta-suave">
              Nenhum sócio cadastrado ainda.
            </p>
          )}
        </div>
      </section>

      <section aria-labelledby="socio-auditoria">
        <h2 id="socio-auditoria" className="t-h3">
          Auditoria
        </h2>
        <p className="mt-1 t-small text-tinta-suave">
          Registro permanente (o sócio não altera nem apaga).
        </p>
        <div className="mt-2 overflow-x-auto rounded-lg border border-linha">
          <table
            className="w-full min-w-[640px] t-small"
            data-testid="socio-auditoria"
          >
            <thead className="bg-nevoa text-left">
              <tr>
                <th className="px-3 py-2">Quando</th>
                <th className="px-3 py-2">Evento</th>
                <th className="px-3 py-2">Por</th>
                <th className="px-3 py-2">Detalhes</th>
              </tr>
            </thead>
            <tbody>
              {audit.length ? (
                audit.map((e, i) => (
                  <tr key={i} className="border-t border-linha">
                    <td className="px-3 py-2 whitespace-nowrap">
                      {when(e.at)}
                    </td>
                    <td className="px-3 py-2 font-semibold">
                      {ACTION[e.action] ?? e.action}
                    </td>
                    <td className="px-3 py-2">{e.actorEmail ?? "—"}</td>
                    <td className="px-3 py-2">{describe(e)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={4}
                    className="px-3 py-6 text-center text-tinta-suave"
                  >
                    Nada registrado ainda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
