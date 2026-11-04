import { videoSource, type Testimonial } from "@/domain/testimonials";

const TUTORES = [
  { nome: "William Abreu", src: "/images/aprovados/william-abreu.webp", alt: "William Abreu, tutor e idealizador do APROVUM" },
  { nome: "Rafael Alves", src: "/images/aprovados/rafael-alves.webp", alt: "Rafael Alves, tutor e idealizador do APROVUM" },
];

/** Página Depoimentos: tutores/idealizadores no topo e os vídeos dos alunos aprovados. */
export function DepoimentosView({ items }: { items: Testimonial[] }) {
  return (
    <div className="dep" data-testid="depoimentos">
      <section aria-labelledby="dep-tutores" className="dep-tutores">
        <p className="dep-k">Tutores e idealizadores</p>
        <h2 id="dep-tutores" className="dep-h">Quem criou o caminho para a sua aprovação</h2>
        <div className="dep-fotos">
          {TUTORES.map((t) => (
            <figure key={t.nome} className="dep-foto" data-testid={`tutor-${t.nome.split(" ")[0]!.toLowerCase()}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={t.src} alt={t.alt} width={2000} height={711} decoding="async" />
              <figcaption><b>{t.nome}</b><span>Tutor e idealizador</span></figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section aria-labelledby="dep-videos">
        <h2 id="dep-videos" className="dep-h">Depoimentos de alunos aprovados</h2>
        <p className="dep-s">Veja como foi a trajetória deles até a aprovação.</p>
        {items.length === 0 ? (
          <p className="dep-vazio" data-testid="depoimentos-vazio">Os primeiros depoimentos em vídeo chegam em breve.</p>
        ) : (
          <ul className="dep-grade">
            {items.map((d) => {
              const v = d.videoUrl ? videoSource(d.videoUrl) : null;
              return (
                <li key={d.id} className="dep-card" data-testid="depoimento">
                  <div className="dep-video">
                    {v?.kind === "iframe" ? (
                      <iframe src={v.src} title={`Depoimento de ${d.name}`} loading="lazy" allow="accelerometer; encrypted-media; picture-in-picture; fullscreen" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
                    ) : v?.kind === "file" ? (
                      <video src={v.src} controls preload="metadata" playsInline poster={d.photoUrl ?? undefined} aria-label={`Depoimento de ${d.name}`} />
                    ) : d.photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={d.photoUrl} alt={`Foto de ${d.name}`} loading="lazy" />
                    ) : (
                      <p>Vídeo indisponível</p>
                    )}
                  </div>
                  <p className="dep-nome">{d.name}</p>
                  {d.headline && <p className="dep-frase">{d.headline}</p>}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
