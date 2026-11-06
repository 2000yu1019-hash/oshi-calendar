import { STATUS_LABEL } from "@/lib/constants";

export function StatusChip({ status }: { status: string }) {
  if (!status) return null;
  const cls = { got: "st-got", apply: "st-apply", go: "st-go" }[status] ?? "";
  return <span className={`chip ${cls}`}>{STATUS_LABEL[status]}</span>;
}
