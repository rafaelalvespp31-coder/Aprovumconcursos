import Link from "next/link";
import { DISCIPLINE_LABELS, DISCIPLINE_MODES } from "@/ai/pedagogy";
import { requireAdmin } from "@/server/services/catalog";
import { bannerVersions } from "@/server/services/banners";
import { removeBannerAction, saveBannerAction } from "../actions";
import { BannerSlot } from "./banner-slot";

export const metadata = { title: "Banners das matérias" };

export default async function BannersPage() {
  await requireAdmin();
  const versions = await bannerVersions();
  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/admin/catalogo" className="t-small text-destaque underline underline-offset-2">Catálogo</Link>
        <h1 className="mt-1 t-h1">Banners das matérias</h1>
        <p className="mt-1 max-w-3xl t-small text-tinta-suave">Cada matéria tem um banner que aparece no topo de todas as aulas dela. Troque quando quiser: as aulas passam a usar o novo na hora.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {DISCIPLINE_MODES.map((m) => (
          <BannerSlot
            key={m}
            mode={m}
            label={DISCIPLINE_LABELS[m]}
            url={versions[m] ? `/banner/${m}?v=${new Date(versions[m]!).getTime().toString(36)}` : null}
            actions={{ save: saveBannerAction, remove: removeBannerAction }}
          />
        ))}
      </div>
    </div>
  );
}
