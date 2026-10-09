import { NextResponse, type NextRequest } from "next/server";
import { getCurrentAdmin } from "@/lib/auth/guards";
import { can } from "@/lib/permissions";
import { toCsv, type CsvColumn } from "@/lib/csv";
import { getParticipantsForExport } from "@/server/services/participants";
import { calculateAge } from "@/lib/utils";
import { parseParticipantFilters } from "@/lib/report-query";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }
  if (!can(admin.role, "export")) {
    return NextResponse.json({ message: "Forbidden." }, { status: 403 });
  }

  const filters = parseParticipantFilters(Object.fromEntries(request.nextUrl.searchParams));

  const participants = await getParticipantsForExport(filters);

  type Row = (typeof participants)[number];
  const columns: CsvColumn<Row>[] = [
    { header: "Registration Reference", value: (r) => r.registrationReference },
    { header: "First Name", value: (r) => r.firstName },
    { header: "Middle Name", value: (r) => r.middleName ?? "" },
    { header: "Last Name", value: (r) => r.lastName },
    { header: "Age", value: (r) => calculateAge(r.dateOfBirth) },
    { header: "Date of Birth", value: (r) => r.dateOfBirth.toISOString().slice(0, 10) },
    {
      header: "Gender",
      value: (r) => (r.gender === "PREFER_NOT_TO_SAY" ? "" : r.gender),
    },
    { header: "Phone", value: (r) => r.phone },
    { header: "Email", value: (r) => r.email ?? "" },
    { header: "State", value: (r) => r.state },
    { header: "Town", value: (r) => r.town },
    { header: "Church Assembly", value: (r) => r.churchAssembly?.name ?? "" },
    { header: "Assembly Branch", value: (r) => r.churchAssembly?.branch ?? "" },
    { header: "Category", value: (r) => r.participantCategory ?? "" },
    { header: "T-Shirt Size", value: (r) => r.tShirtSize ?? "" },
    { header: "Status", value: (r) => r.registrationStatus },
    { header: "Payment Status", value: (r) => r.paymentStatus },
    { header: "Registered At", value: (r) => r.registeredAt.toISOString() },
  ];

  const csv = toCsv(participants, columns);
  const filename = `gtm-youth-camp-registrations-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
