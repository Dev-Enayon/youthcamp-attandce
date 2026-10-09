import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import {
  addParticipantNote,
  changeRegistrationStatus,
  listParticipants,
  updateParticipant,
} from "@/server/services/participants";
import { createAdmin, createAssembly, createParticipant, resetDb } from "./helpers";

describe("participant management", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("searches by name, reference and phone", async () => {
    await createParticipant({ firstName: "Ada", lastName: "Okafor", phone: "+2348012340001" });
    await createParticipant({ firstName: "Bola", lastName: "Adeyemi", phone: "+2348012340002" });

    expect((await listParticipants({ search: "ada" })).total).toBe(1);
    expect((await listParticipants({ search: "Adeyemi" })).total).toBe(1);
    expect((await listParticipants({ search: "2348012340002" })).total).toBe(1);
  });

  it("filters by status, gender, category and assembly", async () => {
    const assembly = await createAssembly("Assembly A");
    await createParticipant({ registrationStatus: "CONFIRMED", gender: "FEMALE", participantCategory: "Youth", churchAssemblyId: assembly.id });
    await createParticipant({ registrationStatus: "CANCELLED", gender: "MALE", participantCategory: "Teenager", churchAssemblyId: assembly.id });
    await createParticipant({ registrationStatus: "REGISTERED", gender: "FEMALE", participantCategory: "Youth" });

    expect((await listParticipants({ status: "CONFIRMED" })).total).toBe(1);
    expect((await listParticipants({ gender: "FEMALE" })).total).toBe(2);
    expect((await listParticipants({ category: "Youth" })).total).toBe(2);
    expect((await listParticipants({ assemblyId: assembly.id })).total).toBe(2);
  });

  it("filters by registration date using Lagos day boundaries", async () => {
    await createParticipant({ registeredAt: new Date("2026-05-10T10:00:00.000Z") });
    await createParticipant({ registeredAt: new Date("2026-05-12T10:00:00.000Z") });

    expect((await listParticipants({ dateFrom: "2026-05-10", dateTo: "2026-05-10" })).total).toBe(1);
    expect((await listParticipants({ dateFrom: "2026-05-11" })).total).toBe(1);
  });

  it("paginates results", async () => {
    for (let i = 0; i < 25; i++) {
      await createParticipant({ firstName: `Page${i}` });
    }

    const page1 = await listParticipants({ page: 1, pageSize: 10 });
    expect(page1.total).toBe(25);
    expect(page1.totalPages).toBe(3);
    expect(page1.items).toHaveLength(10);

    const page3 = await listParticipants({ page: 3, pageSize: 10 });
    expect(page3.items).toHaveLength(5);
  });

  it("edits a registration and records an audit entry", async () => {
    const admin = await createAdmin("ADMIN");
    const participant = await createParticipant({ firstName: "Old" });

    await updateParticipant(
      participant.id,
      {
        firstName: "New",
        lastName: "Name",
        dateOfBirth: "2008-05-01",
        gender: "FEMALE",
        phone: "+2348012345678",
        state: "Lagos",
        town: "Badagry",
        emergencyContactName: "Contact",
        emergencyContactRelationship: "Parent",
        emergencyContactPhone: "+2348011111111",
      },
      admin.id,
    );

    const updated = await prisma.participant.findUnique({ where: { id: participant.id } });
    expect(updated?.firstName).toBe("New");

    const audit = await prisma.adminAuditLog.findFirst({
      where: { entityId: participant.id, action: "PARTICIPANT_UPDATED" },
    });
    expect(audit).not.toBeNull();
    expect(audit?.adminUserId).toBe(admin.id);
  });

  it("changes status with an audit trail", async () => {
    const admin = await createAdmin("ADMIN");
    const participant = await createParticipant();

    await changeRegistrationStatus(participant.id, "CONFIRMED", "Paid fee", admin.id);

    const change = await prisma.statusChange.findFirst({ where: { participantId: participant.id } });
    expect(change?.fromStatus).toBe("REGISTERED");
    expect(change?.toStatus).toBe("CONFIRMED");
    expect(change?.reason).toBe("Paid fee");

    const audit = await prisma.adminAuditLog.findFirst({
      where: { entityId: participant.id, action: "STATUS_CHANGED" },
    });
    expect(audit).not.toBeNull();
  });

  it("adds a note with an audit entry", async () => {
    const admin = await createAdmin("ADMIN");
    const participant = await createParticipant();

    await addParticipantNote(participant.id, "Called parent", admin.id);

    const note = await prisma.participantNote.findFirst({ where: { participantId: participant.id } });
    expect(note?.body).toBe("Called parent");
    expect(
      await prisma.adminAuditLog.count({ where: { entityId: participant.id, action: "NOTE_ADDED" } }),
    ).toBe(1);
  });
});
