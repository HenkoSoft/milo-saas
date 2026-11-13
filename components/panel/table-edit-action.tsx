import Link from "next/link";
import { EditIcon } from "@/components/icons";

export function TableEditAction({ href, label, recordId, readOnly = false }: { href: string; label: string; recordId?: string; readOnly?: boolean }) {
  const action = readOnly ? "Consultar" : "Editar";
  return <Link className="milo-secondary-button milo-table-edit-action" href={href} data-record-editor={recordId} title={action} aria-label={`${action} ${label}`}><EditIcon readOnly={readOnly} /></Link>;
}
