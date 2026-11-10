import { beforeAll, describe, expect, it } from "vitest";
import { lockScroll, releaseStaleScrollLock } from "./scroll-lock";

const html = { style: { overflow: "" } };
const body = { style: { overflow: "" } };
beforeAll(() => {
  (globalThis as unknown as { document: unknown }).document = { documentElement: html, body };
});

const hidden = () => html.style.overflow === "hidden" && body.style.overflow === "hidden";

describe("lockScroll", () => {
  it("só libera quando o último a travar solta (sobreposição não prende a página)", () => {
    const a = lockScroll();
    const b = lockScroll();
    expect(hidden()).toBe(true);
    a();
    expect(hidden()).toBe(true);
    b();
    expect(html.style.overflow).toBe("");
    expect(body.style.overflow).toBe("");
  });
  it("liberar duas vezes a mesma trava não afeta as outras", () => {
    const a = lockScroll();
    const b = lockScroll();
    a();
    a();
    expect(hidden()).toBe(true);
    b();
    expect(hidden()).toBe(false);
  });
  it("rede de segurança destrava página presa sem trava ativa", () => {
    body.style.overflow = "hidden";
    releaseStaleScrollLock();
    expect(body.style.overflow).toBe("");
    const a = lockScroll();
    releaseStaleScrollLock();
    expect(hidden()).toBe(true);
    a();
  });
});
