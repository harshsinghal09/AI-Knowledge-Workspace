import { DocumentStatus } from "../api/documents";

const STYLES: Record<DocumentStatus, string> = {
  processing: "bg-amber-50 text-amber-700 border-amber-200",
  ready: "bg-accentSoft text-accent border-accent/30",
  failed: "bg-red-50 text-rust border-rust/30"
};

const LABELS: Record<DocumentStatus, string> = {
  processing: "Processing",
  ready: "Ready",
  failed: "Failed"
};

export function StatusBadge({ status }: { status: DocumentStatus }) {
  return (
    <span className={`font-mono text-[11px] uppercase tracking-wide px-2 py-1 rounded border ${STYLES[status]}`}>
      {LABELS[status]}
    </span>
  );
}
