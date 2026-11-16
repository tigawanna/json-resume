/** Shared labels and row shape for credit ledger tables. */

export type LedgerRow = {
  id: string;
  bucket: string;
  type: string;
  amount: number;
  periodKey: string | null;
  resumeId?: string | null;
  reason: string | null;
  createdAt: string;
};

const TYPE_LABELS: Record<string, string> = {
  monthly_grant: "Monthly grant",
  monthly_expiry: "Monthly expiry",
  admin_grant: "Bonus grant",
  admin_adjustment: "Adjustment",
  resume_spend: "Résumé created",
  resume_overdraft: "Résumé overdraft",
};

export function ledgerTypeLabel(type: string): string {
  return TYPE_LABELS[type] ?? type;
}

export function ledgerAmountLabel(amount: number): string {
  if (amount === 0) return "0";
  return amount > 0 ? `+${amount}` : `${amount}`;
}
