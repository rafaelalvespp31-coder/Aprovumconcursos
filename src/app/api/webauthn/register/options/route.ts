import type { NextRequest } from "next/server";
import { withUser } from "@/server/http";
import { registrationOptions, rpFromRequest } from "@/server/services/webauthn";

export const dynamic = "force-dynamic";

export function POST(req: NextRequest) {
  return withUser(req, (user) => registrationOptions(rpFromRequest(req), user));
}
