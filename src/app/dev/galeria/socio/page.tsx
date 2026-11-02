"use client";

import { useState } from "react";
import {
  PartnerManager,
  type PartnerAuditItem,
  type PartnerItem,
} from "@/app/admin/socio/partner-manager";
import { normalizePermissions } from "@/domain/partner/permissions";

/** Galeria: GESTÃO DO SÓCIO ADMIN com dados fictícios em memória (nada é gravado). */
const START: PartnerItem[] = [
  {
    userId: "00000000-0000-4000-8000-0000000000b1",
    name: "Marina Couto",
    email: "marina@exemplo.com",
    active: true,
    permissions: ["visualizar_total_cadastrados", "visualizar_crescimento"],
    createdAt: "2026-10-20T13:00:00Z",
    lastSignInAt: "2026-11-01T22:10:00Z",
  },
];
const AT = "2026-11-02T12:00:00Z";

export default function Page() {
  const [partners, setPartners] = useState(START);
  const [audit, setAudit] = useState<PartnerAuditItem[]>([]);
  const log = (action: string, meta: Record<string, unknown>) =>
    setAudit((a) => [
      { at: AT, action, actorEmail: "admin@exemplo.com", meta },
      ...a,
    ]);
  return (
    <div>
      <h1 className="t-h1">Gestão do sócio admin (prévia)</h1>
      <div className="mt-6">
        <PartnerManager
          partners={partners}
          audit={audit}
          actions={{
            create: async (d) => {
              if (!d.email.includes("@"))
                return { ok: false, error: "E-mail inválido." };
              if (partners.some((p) => p.email === d.email))
                return { ok: false, error: "Esse e-mail já é de um sócio." };
              setPartners((p) => [
                ...p,
                {
                  userId: `00000000-0000-4000-8000-0000000000b${p.length + 2}`,
                  name: d.name,
                  email: d.email,
                  active: true,
                  permissions: [],
                  createdAt: AT,
                  lastSignInAt: null,
                },
              ]);
              log("admin.partner_created", { email: d.email, linked: false });
              return {
                ok: true,
                message: "Conta do sócio criada.",
                password: d.password || "Pq7rTm2Xka9w",
              };
            },
            setActive: async (id, active) => {
              setPartners((p) =>
                p.map((x) => (x.userId === id ? { ...x, active } : x)),
              );
              log(
                active
                  ? "admin.partner_activated"
                  : "admin.partner_deactivated",
                {},
              );
              return {
                ok: true,
                message: active
                  ? "Acesso ativado."
                  : "Acesso desativado (sessões abertas encerradas).",
              };
            },
            setPermissions: async (id, list) => {
              const next = normalizePermissions(list);
              const before =
                partners.find((x) => x.userId === id)?.permissions ?? [];
              setPartners((p) =>
                p.map((x) =>
                  x.userId === id ? { ...x, permissions: next } : x,
                ),
              );
              log("admin.partner_permissions", {
                liberadas: next.filter((k) => !before.includes(k)),
                bloqueadas: before.filter((k) => !next.includes(k)),
              });
              return {
                ok: true,
                message: "Permissões salvas. Já valem no painel do sócio.",
              };
            },
          }}
        />
      </div>
    </div>
  );
}
