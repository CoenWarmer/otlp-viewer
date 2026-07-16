import { RiCloseLine } from "@remixicon/react";
import { Badge } from "../ui/badge";

export function SelectedServicesBadges({
  availableServices,
  isServiceFiltered,
  visibleServices,
  onRemoveBadge,
}: {
  availableServices: string[];
  isServiceFiltered: boolean;
  visibleServices: string[];
  onRemoveBadge: (service: string) => void;
}) {
  return (
    <>
      {isServiceFiltered ? (
        visibleServices.map((service) => (
          <Badge key={service} variant="secondary" className="gap-1 pr-1">
            {service}
            <button
              aria-label={`Remove ${service} filter`}
              className="rounded hover:text-foreground"
              onClick={() => onRemoveBadge(service)}
            >
              <RiCloseLine className="size-3" />
            </button>
          </Badge>
        ))
      ) : (
        <Badge variant="outline">All services ({availableServices.length})</Badge>
      )}
    </>
  );
}
