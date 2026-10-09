import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { createRegistration } from "@/server/services/registration";
import { createSettings, makeRegistrationInput, resetDb } from "./helpers";

describe("createRegistration", () => {
  beforeEach(async () => {
    await resetDb();
    await createSettings();
  });

  it("persists a valid registration with a unique reference", async () => {
    const result = await createRegistration(makeRegistrationInput());
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.created).toBe(true);
    expect(result.participant.registrationReference).toMatch(/^GTM-YC-\d{4}-\d{5}$/);
    expect(result.participant.registrationStatus).toBe("REGISTERED");

    const stored = await prisma.participant.findUnique({ where: { id: result.participant.id } });
    expect(stored).not.toBeNull();
    expect(stored?.phone).toBe("+2348012345678");
  });

  it("is idempotent for repeated submissions with the same key", async () => {
    const input = makeRegistrationInput({ idempotencyKey: "idem-key-123456" });
    const first = await createRegistration(input);
    const second = await createRegistration(input);
    expect(first.ok && second.ok).toBe(true);
    if (!first.ok || !second.ok) return;
    expect(second.created).toBe(false);
    expect(second.participant.id).toBe(first.participant.id);
    expect(await prisma.participant.count()).toBe(1);
  });

  it("blocks duplicate registrations for the same participant", async () => {
    const first = await createRegistration(makeRegistrationInput({ idempotencyKey: "dup-key-111111" }));
    expect(first.ok).toBe(true);

    const second = await createRegistration(
      makeRegistrationInput({ idempotencyKey: "dup-key-222222" }),
    );
    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.code).toBe("DUPLICATE_REGISTRATION");
  });

  it("rejects registration when closed", async () => {
    await prisma.campSettings.updateMany({ data: { registrationOpen: false } });
    const result = await createRegistration(makeRegistrationInput());
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("REGISTRATION_CLOSED");
  });

  it("rejects registration after the deadline", async () => {
    await prisma.campSettings.updateMany({
      data: { registrationDeadline: new Date(Date.now() - 60_000) },
    });
    const result = await createRegistration(makeRegistrationInput());
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("DEADLINE_PASSED");
  });

  it("rejects an unknown church assembly", async () => {
    const result = await createRegistration(makeRegistrationInput({ churchAssemblyId: "does-not-exist" }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("INVALID_ASSEMBLY");
  });

  it("records guardian consent for minors", async () => {
    const result = await createRegistration(
      makeRegistrationInput({
        dateOfBirth: "2015-03-03",
        guardianName: "Ngozi Okafor",
        guardianPhone: "08011112222",
        guardianConsent: true,
      }),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.participant.isMinor).toBe(true);
    expect(result.participant.guardianConsentAt).not.toBeNull();
  });

  it("generates unique references under concurrent submissions", async () => {
    const results = await Promise.all(
      Array.from({ length: 20 }, (_, i) =>
        createRegistration(
          makeRegistrationInput({
            firstName: `Youth${i}`,
            phone: `0801000${String(1000 + i)}`,
            idempotencyKey: `concurrent-${i}`,
          }),
        ),
      ),
    );
    const references = results.filter((r) => r.ok).map((r) => (r.ok ? r.participant.registrationReference : ""));
    expect(new Set(references).size).toBe(references.length);
    expect(await prisma.participant.count()).toBe(20);
  });

  it("enforces capacity under concurrent submissions", async () => {
    await prisma.campSettings.updateMany({ data: { capacity: 5 } });

    const results = await Promise.all(
      Array.from({ length: 10 }, (_, i) =>
        createRegistration(
          makeRegistrationInput({
            firstName: `Cap${i}`,
            phone: `0802000${String(1000 + i)}`,
            idempotencyKey: `capacity-${i}`,
          }),
        ),
      ),
    );

    const created = results.filter((r) => r.ok).length;
    expect(created).toBe(5);
    expect(await prisma.participant.count()).toBe(5);
  });
});
