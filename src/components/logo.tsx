import Link from "next/link";

export function LogoMark({ className = "size-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 512 512" className={className} aria-hidden>
      <rect width="512" height="512" rx="112" fill="#1f4fd8" />
      <path d="M112 384h96v-80h96v-80h96v160z" fill="#fff" opacity=".35" />
      <path d="M112 384h96v-80h96v-80h96v-80" fill="none" stroke="#fff" strokeWidth="36" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-2 font-bold tracking-[-0.01em] text-tinta">
      <LogoMark />
      <span>Nível Aprovado</span>
    </Link>
  );
}
