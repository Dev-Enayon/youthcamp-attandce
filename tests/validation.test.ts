import { describe, expect, it } from "vitest";
import { buildRegistrationSchema } from "@/lib/validation/registration";
import { normalizeNigerianPhone } from "@/lib/phone";
import { makeRegistrationInput } from "./helpers";

describe("registration validation", () => {
  it("accepts a valid registration", () => {
    const result = buildRegistrationSchema().safeParse(makeRegistrationInput());
    expect(result.success).toBe(true);
  });

  it("rejects an invalid Nigerian phone number", () => {
    const result = buildRegistrationSchema().safeParse(makeRegistrationInput({ phone: "12345" }));
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes("phone"))).toBe(true);
    }
  });

  it("normalises Nigerian phone number formats", () => {
    expect(normalizeNigerianPhone("08012345678")).toBe("+2348012345678");
    expect(normalizeNigerianPhone("+2348012345678")).toBe("+2348012345678");
    expect(normalizeNigerianPhone("234 801 234 5678")).toBe("+2348012345678");
    expect(normalizeNigerianPhone("0703-123-4567")).toBe("+2347031234567");
    expect(normalizeNigerianPhone("123456")).toBeNull();
  });

  it("rejects missing required fields", () => {
    const result = buildRegistrationSchema().safeParse(makeRegistrationInput({ lastName: "" }));
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes("lastName"))).toBe(true);
    }
  });

  it("rejects a future date of birth", () => {
    const future = new Date();
    future.setFullYear(future.getFullYear() + 1);
    const result = buildRegistrationSchema().safeParse(
      makeRegistrationInput({ dateOfBirth: future.toISOString().slice(0, 10) }),
    );
    expect(result.success).toBe(false);
  });

  it("rejects an invalid email when supplied", () => {
    const result = buildRegistrationSchema().safeParse(makeRegistrationInput({ email: "not-an-email" }));
    expect(result.success).toBe(false);
  });

  it("requires guardian details for minors", () => {
    const result = buildRegistrationSchema().safeParse(
      makeRegistrationInput({
        dateOfBirth: "2015-01-01",
        guardianName: "",
        guardianPhone: "",
        guardianConsent: false,
      }),
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join("."));
      expect(paths).toContain("guardianName");
      expect(paths).toContain("guardianPhone");
      expect(paths).toContain("guardianConsent");
    }
  });

  it("accepts a minor with full guardian consent", () => {
    const result = buildRegistrationSchema().safeParse(
      makeRegistrationInput({
        dateOfBirth: "2015-01-01",
        guardianName: "Ngozi Okafor",
        guardianPhone: "08011112222",
        guardianConsent: true,
      }),
    );
    expect(result.success).toBe(true);
  });

  it("requires consent confirmations", () => {
    const result = buildRegistrationSchema().safeParse(makeRegistrationInput({ termsAccepted: false }));
    expect(result.success).toBe(false);
  });

  it("enforces configured mandatory fields", () => {
    const schema = buildRegistrationSchema({ requireEmail: true, requireChurchAssembly: true });
    const result = schema.safeParse(makeRegistrationInput({ email: "", churchAssemblyId: "" }));
    expect(result.success).toBe(false);
  });
});
