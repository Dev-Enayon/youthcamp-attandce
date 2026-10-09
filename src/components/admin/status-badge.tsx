import type { RegistrationStatus } from "@prisma/client";
import { Badge } from "@/components/ui/badge";

export const STATUS_LABELS: Record<RegistrationStatus, string> = {
  REGISTERED: "Registered",
  CONFIRMED: "Confirmed",
  CANCELLED: "Cancelled",
};

export function StatusBadge({ status }: { status: RegistrationStatus }) {
  const tone =
    status === "CONFIRMED" ? "confirmed" : status === "CANCELLED" ? "cancelled" : "registered";
  return <Badge tone={tone}>{STATUS_LABELS[status]}</Badge>;
}
