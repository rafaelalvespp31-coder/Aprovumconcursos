import type { NextConfig } from "next";

/**
 * Cabeçalhos de segurança aplicados a todas as rotas.
 * A CSP permite o próprio domínio, o Supabase configurado e o Mercado Pago (pagamento).
 */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseOrigin = supabaseUrl ? new URL(supabaseUrl).origin : "";
const supabaseWs = supabaseOrigin.replace(/^http/, "ws");

// Mercado Pago (Payment Brick): script do SDK, formulário em iframe, API, antifraude e estilos/fontes.
const MP = "https://*.mercadopago.com https://*.mercadopago.com.br https://*.mercadolibre.com https://*.mercadolivre.com.br https://*.mlstatic.com";

const isDev = process.env.NODE_ENV !== "production";

const csp = [
  "default-src 'self'",
  // Next.js injeta scripts inline de hidratação; 'unsafe-eval' só em dev (React Refresh).
  `script-src 'self' 'unsafe-inline' ${MP}${isDev ? " 'unsafe-eval'" : ""}`,
  `style-src 'self' 'unsafe-inline' ${MP}`,
  // Imagens do Storage do Supabase (concursos, aprovados, fotos e avatares com link temporário).
  `img-src 'self' data: blob: ${supabaseOrigin} ${MP}`.trim(),
  `font-src 'self' data: ${MP}`,
  `connect-src 'self' ${supabaseOrigin} ${supabaseWs} ${MP} https://generativelanguage.googleapis.com wss://generativelanguage.googleapis.com`.trim(),
  `frame-src ${MP} https://www.youtube-nocookie.com https://player.vimeo.com`,
  `media-src 'self' blob: https:`,
  "worker-src 'self'",
  "manifest-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(self), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // As artes dos PDFs (fundo, faixas, logo) são lidas do disco na hora de gerar: garante que entram no pacote da função.
  outputFileTracingIncludes: { "/api/pdf/**": ["./public/pdf/**"], "/api/**": ["./public/pdf/**"] },
  // Upload de aulas e questões (PDF/.txt) no painel da equipe; a Vercel aceita até ~4,5 MB por requisição.
  experimental: { serverActions: { bodySizeLimit: "13mb" } },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // Arquivos estáticos pesados (imagens, avatares, fontes, áudio): ficam no aparelho e abrem na hora nas visitas seguintes.
      {
        source: "/:dir(images|avatar|home|plano|concursos|depoimentos|banner-estudo|estudo|mentor|postit|fonts|audio|modelos|visao-geral|cadastro|meus-editais|card-edital|redacao)/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=604800, stale-while-revalidate=2592000" }],
      },
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
