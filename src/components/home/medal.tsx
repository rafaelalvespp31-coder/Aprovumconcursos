/** Medalhas das conquistas (SVG próprio). Bloqueada = cinza com cadeado. */
export function Medal({ icon, locked }: { icon: string; locked: boolean }) {
  const gold = icon === "estrela_prata" ? ["#e9edf2", "#8d96a3"] : ["#ffe08a", "#b07a12"];
  const red = icon === "caveira" || icon === "chama";
  return (
    <svg viewBox="0 0 64 64" className={`hm-medal${locked ? " is-locked" : ""}`} aria-hidden>
      <defs>
        <linearGradient id={`m-${icon}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={red ? "#ff4d42" : gold[0]} />
          <stop offset="1" stopColor={red ? "#7d0700" : gold[1]} />
        </linearGradient>
      </defs>
      {icon === "louro30" ? (
        <>
          <circle cx="32" cy="32" r="22" fill="#141416" stroke={`url(#m-${icon})`} strokeWidth="3" />
          {[...Array(7)].map((_, i) => (
            <g key={i}>
              <ellipse cx={12 + i * 1.2} cy={44 - i * 5} rx="3" ry="6" fill={`url(#m-${icon})`} transform={`rotate(${-40 + i * 8} ${12 + i * 1.2} ${44 - i * 5})`} />
              <ellipse cx={52 - i * 1.2} cy={44 - i * 5} rx="3" ry="6" fill={`url(#m-${icon})`} transform={`rotate(${40 - i * 8} ${52 - i * 1.2} ${44 - i * 5})`} />
            </g>
          ))}
          <text x="32" y="39" textAnchor="middle" fontSize="19" fontWeight="800" fill={`url(#m-${icon})`} fontFamily="Barlow Condensed, sans-serif">30</text>
        </>
      ) : (
        <>
          <path d="M32 3 56 15v20c0 13-10 22-24 26C18 57 8 48 8 35V15z" fill="#141416" stroke={`url(#m-${icon})`} strokeWidth="3" />
          {(icon === "estrela" || icon === "estrela_prata") && (
            <>
              <circle cx="32" cy="31" r="15" fill="none" stroke={`url(#m-${icon})`} strokeWidth="2" />
              <path d="m32 19 3.6 7.6 8.3 1-6.1 5.7 1.6 8.2L32 37.4l-7.4 4.1 1.6-8.2-6.1-5.7 8.3-1z" fill={`url(#m-${icon})`} />
            </>
          )}
          {(icon === "caveira" || icon === "caveira_coroa") && (
            <>
              {icon === "caveira_coroa" && <path d="M20 17l5 5 7-8 7 8 5-5-2 9H22z" fill="#ffd34d" />}
              <path d="M32 22c-8 0-13 5-13 12 0 4 2 7 5 8v5h16v-5c3-1 5-4 5-8 0-7-5-12-13-12z" fill="#f2f2f2" />
              <circle cx="27" cy="34" r="3.4" fill="#141416" />
              <circle cx="37" cy="34" r="3.4" fill="#141416" />
              <path d="M32 38l-2 4h4z" fill="#141416" />
              <path d="M27 47v-3M30.5 47v-3M34 47v-3M37 47v-3" stroke="#141416" strokeWidth="1.3" />
              {icon === "caveira" && <path d="M32 22c-8 0-13 5-13 12 0 4 2 7 5 8v5h8z" fill="#e10600" opacity="0.85" />}
            </>
          )}
          {icon === "chama" && <path d="M32 14c2 8 11 11 11 22a11 11 0 0 1-22 0c0-6 3-9 5-12 0 5 2 7 4 7-2-6 0-12 2-17z" fill={`url(#m-${icon})`} />}
        </>
      )}
      {locked && (
        <g>
          <circle cx="50" cy="50" r="10" fill="#0b0b0d" stroke="#555" />
          <rect x="45.5" y="49" width="9" height="7" rx="1.5" fill="#9a9aa2" />
          <path d="M47.5 49v-2.5a2.5 2.5 0 0 1 5 0V49" fill="none" stroke="#9a9aa2" strokeWidth="1.6" />
        </g>
      )}
    </svg>
  );
}
