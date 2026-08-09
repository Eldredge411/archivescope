import type { ResourceVersionStatus } from "@/types";
import {
  resourceVersionStatusBadge,
  resourceVersionStatusZh,
} from "@/lib/display";

type VersionStatusBadgeProps = {
  status: ResourceVersionStatus;
};

export function VersionStatusBadge({ status }: VersionStatusBadgeProps) {
  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-medium ${resourceVersionStatusBadge[status]}`}
    >
      {resourceVersionStatusZh[status]}
    </span>
  );
}
