import { describe, expect, it } from "vitest";
import { isEndedElsewhere } from "./session";

describe("sessão única por conta", () => {
  it("reconhece a sessão encerrada por login em outro aparelho", () => {
    expect(isEndedElsewhere({ code: "session_not_found" })).toBe(true);
    expect(isEndedElsewhere({ code: "refresh_token_not_found" })).toBe(true);
    expect(isEndedElsewhere({ message: "Session from session_id claim in JWT does not exist" })).toBe(true);
    expect(isEndedElsewhere({ message: "Invalid Refresh Token: Refresh Token Not Found" })).toBe(true);
  });
  it("não confunde com quem simplesmente não está logado", () => {
    expect(isEndedElsewhere(null)).toBe(false);
    expect(isEndedElsewhere({ code: "session_missing", message: "Auth session missing!" })).toBe(false);
  });
});
