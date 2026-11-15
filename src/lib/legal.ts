/** Dados usados nas páginas legais. O e-mail de contato vem do ambiente (NEXT_PUBLIC_CONTATO_EMAIL). */
export const LEGAL_ATUALIZADO = "15 de novembro de 2026";
export const CONTATO_EMAIL: string | null = process.env.NEXT_PUBLIC_CONTATO_EMAIL?.trim() || null;
export const CONTROLADOR = "APROVUM (Rafael Alves e William Abreu)";
