import { beforeEach, describe, expect, it } from "vitest";
import { getDashboardStats } from "@/server/services/stats";
import { createAssembly, createParticipant, resetDb } from "./helpers";

describe("dashboard statistics (Africa/Lagos)", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("counts today, this week and active totals in Lagos time", async () => {
    const now = new Date("2026-05-13T12:00:00.000Z"); // Wed 13:00 Lagos

    await createParticipant({ registeredAt: new Date("2026-05-13T09:00:00.000Z") }); // today
    await createParticipant({ registeredAt: new Date("2026-05-12T09:00:00.000Z") }); // earlier this week
    await createParticipant({ registeredAt: new Date("2026-05-05T09:00:00.000Z") }); // last week
    await createParticipant({
      registeredAt: new Date("2026-05-13T10:00:00.000Z"),
      registrationStatus: "CANCELLED",
    });

    const stats = await getDashboardStats(undefined, now);
    expect(stats.totalActive).toBe(3);
    expect(stats.today).toBe(1);
    expect(stats.thisWeek).toBe(2);
    expect(stats.byStatus.CANCELLED).toBe(1);
  });

  it("attributes registrations to the correct Lagos day at the boundary", async () => {
    const now = new Date("2026-05-13T12:00:00.000Z");
    // 23:30 UTC on 12 May is 00:30 Lagos on 13 May, so it counts as "today".
    await createParticipant({ registeredAt: new Date("2026-05-12T23:30:00.000Z") });

    const stats = await getDashboardStats(undefined, now);
    expect(stats.today).toBe(1);
  });

  it("groups by category, gender and assembly", async () => {
    const assembly = await createAssembly("Central");
    await createParticipant({ gender: "MALE", participantCategory: "Youth", churchAssemblyId: assembly.id });
    await createParticipant({ gender: "FEMALE", participantCategory: "Youth", churchAssemblyId: assembly.id });
    await createParticipant({ gender: "PREFER_NOT_TO_SAY", participantCategory: "Teenager" });

    const stats = await getDashboardStats();
    expect(stats.byGender.male).toBe(1);
    expect(stats.byGender.female).toBe(1);
    expect(stats.byGender.undisclosed).toBe(1);
    expect(stats.byCategory.find((c) => c.category === "Youth")?.count).toBe(2);
    expect(stats.byAssembly.find((a) => a.name === "Central")?.count).toBe(2);
  });
});
