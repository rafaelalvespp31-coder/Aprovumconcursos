import Link from "next/link";

/** Emblema APROVUM (caveira no alvo), recortado da logo oficial. */
export function LogoMark({ className = "size-8" }: { className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/icons/aprovum-mark.png" alt="" aria-hidden className={`${className} rounded-[22%] bg-black object-cover`} />;
}

/** Logotipo: emblema + nome. `tagline` mostra o slogan da marca. */
export function Logo({ href = "/", tagline = false }: { href?: string; tagline?: boolean }) {
  return (
    <Link href={href} className="inline-flex items-center gap-2.5 text-tinta" aria-label="APROVUM — início">
      <LogoMark />
      <span className="leading-none">
        <span className="block font-[Space_Grotesk] text-[1.15rem] font-bold tracking-[0.04em]">
          APRO<span className="text-[#F80000]">V</span>UM
        </span>
        {tagline && <span className="mt-1 block text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-tinta-fraca">Sua preparação. Seu próximo cargo.</span>}
      </span>
    </Link>
  );
}
