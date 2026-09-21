import { ACCOUNT_STATUS_LABELS, ACCOUNT_STATUS_STYLES } from "@/lib/accountStatus";
import type { AccountStatusValue } from "@/types/commercial";

/** The ONE badge for a business's derived commercial status everywhere in
 * the sales UI -- backend/app/billing/account_status.py::compute_account_status
 * is the single source of truth this mirrors (see lib/accountStatus.ts). */
export function AccountStatusBadge({ status }: { status: AccountStatusValue }) {
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${ACCOUNT_STATUS_STYLES[status]}`}>
      {ACCOUNT_STATUS_LABELS[status]}
    </span>
  );
}
