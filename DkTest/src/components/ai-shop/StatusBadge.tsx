import React from "react";
import type { AiBillingStatus } from "../../types/aiShop";
import { BILLING_STATUS_META } from "../../services/aiShop/billingEngine";

interface StatusBadgeProps {
  status: AiBillingStatus;
  compact?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, compact = false }) => {
  const meta = BILLING_STATUS_META[status] || BILLING_STATUS_META.upcoming;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-semibold whitespace-nowrap ${
        compact ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs"
      } ${meta.badgeClass}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${meta.dotClass}`} />
      <span>{meta.label}</span>
    </span>
  );
};
