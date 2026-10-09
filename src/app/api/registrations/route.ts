import { NextResponse, type NextRequest } from "next/server";
import { buildRegistrationSchema, fieldErrors } from "@/lib/validation/registration";
import { requirementsFromSettings, getSettings } from "@/server/services/settings";
import { createRegistration } from "@/server/services/registration";
import { checkRateLimit } from "@/server/services/rate-limit";
import { createConfirmationToken } from "@/server/services/confirmation";
import { getEnv } from "@/lib/env";

export const runtime = "nodejs";

const MAX_BODY_BYTES = 64 * 1024;
const RATE_LIMIT = 8;
const RATE_WINDOW_MS = 10 * 60 * 1000;

function clientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return request.headers.get("x-real-ip") ?? "local";
}

function sameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    const originHost = new URL(origin).host;
    const targetHost = request.headers.get("host");
    if (targetHost && originHost === targetHost) return true;
    const appHost = new URL(getEnv().APP_URL).host;
    return originHost === appHost;
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) {
    return NextResponse.json({ message: "Request rejected." }, { status: 403 });
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_BODY_BYTES) {
    return NextResponse.json({ message: "Request body is too large." }, { status: 413 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid request body." }, { status: 400 });
  }

  try {
    const ip = clientIp(request);
    const rate = await checkRateLimit(undefined, `register:${ip}`, RATE_LIMIT, RATE_WINDOW_MS);
    if (!rate.allowed) {
      const minutes = Math.ceil(rate.retryAfterMs / 60000);
      return NextResponse.json(
        { message: `Too many registration attempts. Please try again in ${minutes} minute(s).` },
        { status: 429, headers: { "Retry-After": String(Math.ceil(rate.retryAfterMs / 1000)) } },
      );
    }

    const settings = await getSettings();
    const schema = buildRegistrationSchema(requirementsFromSettings(settings));
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          message: "Please correct the highlighted fields and try again.",
          fieldErrors: fieldErrors(parsed.error),
        },
        { status: 422 },
      );
    }

    const result = await createRegistration(parsed.data);
    if (!result.ok) {
      const status =
        result.code === "DATABASE_UNAVAILABLE"
          ? 503
          : result.code === "INVALID_ASSEMBLY"
            ? 400
            : 409;
      return NextResponse.json(
        { message: result.message, code: result.code, fieldErrors: result.fieldErrors },
        { status },
      );
    }

    const token = await createConfirmationToken(result.participant.id);
    const response = NextResponse.json(
      {
        reference: result.participant.registrationReference,
        firstName: result.participant.firstName,
        token,
      },
      { status: result.created ? 201 : 200 },
    );
    response.cookies.set("gtm_last_reference", result.participant.registrationReference, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60,
    });
    return response;
  } catch (error) {
    console.error("POST /api/registrations failed", error);
    return NextResponse.json(
      { message: "We could not process your registration right now. Please try again shortly." },
      { status: 503 },
    );
  }
}

export function GET() {
  return NextResponse.json({ message: "Method not allowed." }, { status: 405 });
}
