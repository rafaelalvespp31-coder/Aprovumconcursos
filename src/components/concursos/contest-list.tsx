import { CalendarDays, ExternalLink, GraduationCap, Landmark, MapPin, Star, Users, Wallet } from "lucide-react";
import { CONTEST_STATUS, daysUntil } from "@/domain/gamification/home";
import { UF_NAME, bucketOf, type Bucket } from "@/domain/concursos";
import type { Contest } from "@/server/services/gamification";

const dateBR = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
export const DOT: Record<Bucket, string> = { abertos: "#16a34a", andamento: "#2563eb", concluidos: "#6b7280", embreve: "#e50914" };

export function ContestList({ list, today, favs, onFav, empty, showForecast }: { list: Contest[]; today: string; favs: Set<string>; onFav: (id: string) => void; empty: string; showForecast?: boolean }) {
  if (!list.length) return empty ? <p className="cn-vazio">{empty}</p> : null;
  return (
    <ul className="cn-lista" data-testid="concursos-lista">
      {list.map((c) => {
        const days = daysUntil(c.examDate, c.examDateConfirmed, today);
        return (
          <li key={c.id} className="cn-item" data-testid="concurso">
            {c.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={c.imageUrl} alt="" loading="lazy" className="cn-item-img" />
            )}
            <div className="cn-item-corpo">
              <div className="cn-item-topo">
                <span className="cn-status"><i style={{ background: DOT[bucketOf(c.status)] }} />{CONTEST_STATUS[c.status] ?? c.status}</span>
                {(showForecast || c.forecast) && <span className="cn-prev">Previsão</span>}
                <button type="button" className={`cn-fav ${favs.has(c.id) ? "on" : ""}`} onClick={() => onFav(c.id)} aria-pressed={favs.has(c.id)} aria-label={favs.has(c.id) ? `Remover ${c.name} dos favoritos` : `Favoritar ${c.name}`}>
                  <Star className="size-4" aria-hidden />
                </button>
              </div>
              <h3 className="cn-item-nome">{c.name}</h3>
              <p className="cn-item-inst">{[c.orgao, c.institution, c.roleName].filter(Boolean).join(" · ")}</p>
              <dl className="cn-dados">
                {c.uf && <div><dt><MapPin className="size-4" aria-hidden /> Local</dt><dd>{[c.city, UF_NAME[c.uf]].filter(Boolean).join(" / ")}{c.location ? ` — ${c.location}` : ""}</dd></div>}
                {c.vacancies != null && <div><dt><Users className="size-4" aria-hidden /> Vagas</dt><dd>{c.vacancies.toLocaleString("pt-BR")}</dd></div>}
                {c.salary && <div><dt><Wallet className="size-4" aria-hidden /> Remuneração</dt><dd>{c.salary}</dd></div>}
                {c.education && <div><dt><GraduationCap className="size-4" aria-hidden /> Escolaridade</dt><dd>{c.education}</dd></div>}
                {c.banca && <div><dt><Landmark className="size-4" aria-hidden /> Banca</dt><dd>{c.banca}</dd></div>}
                {(c.registrationStart || c.registrationEnd) && (
                  <div><dt><CalendarDays className="size-4" aria-hidden /> Inscrições</dt><dd>{[c.registrationStart && dateBR(c.registrationStart), c.registrationEnd && dateBR(c.registrationEnd)].filter(Boolean).join(" a ")}</dd></div>
                )}
                <div><dt><CalendarDays className="size-4" aria-hidden /> Prova</dt><dd>{c.examDate ? `${dateBR(c.examDate)}${c.examDateConfirmed ? "" : " (a confirmar)"}` : "Data a definir"}</dd></div>
              </dl>
              {c.description && <p className="cn-item-desc">{c.description}</p>}
              {days != null && <p className="cn-dias"><b>{days}</b> {days === 1 ? "dia" : "dias"} para a prova</p>}
              <p className="cn-fonte">
                {c.infoConfirmed ? "Informações confirmadas" : "Informações não confirmadas"} · Fonte:{" "}
                {c.sourceUrl ? <a href={c.sourceUrl} target="_blank" rel="noopener noreferrer">{c.sourceName}</a> : c.sourceName}
              </p>
              {c.detailUrl && (
                <a className="cn-detalhes" href={c.detailUrl} target="_blank" rel="noopener noreferrer">Ver detalhes <ExternalLink className="size-3.5" aria-hidden /></a>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
