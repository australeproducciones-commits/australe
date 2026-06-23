import {
  EventInfoBadge,
  EventInfoBadgeIcon,
} from "@/components/events/EventInfoBadge";
import type { EventInfoBadgeItem } from "@/lib/events/eventInfoBadges";
import { cn } from "@/lib/utils/cn";

type EventInfoBadgesProps = {
  badges: EventInfoBadgeItem[];
  className?: string;
  size?: "default" | "compact";
};

function renderIcon(name: EventInfoBadgeItem["icon"]) {
  switch (name) {
    case "calendar":
      return (
        <EventInfoBadgeIcon>
          <rect x="2.5" y="3.5" width="11" height="10" rx="1.5" />
          <path d="M5 2.5v2M11 2.5v2M2.5 6.5h11" />
        </EventInfoBadgeIcon>
      );
    case "clock":
      return (
        <EventInfoBadgeIcon>
          <circle cx="8" cy="8" r="5.5" />
          <path d="M8 5v3.5l2.25 1.25" />
        </EventInfoBadgeIcon>
      );
    case "duration":
      return (
        <EventInfoBadgeIcon>
          <path d="M8 3.5v4.5l3 1.75" />
          <circle cx="8" cy="8" r="5.5" />
        </EventInfoBadgeIcon>
      );
    case "location":
      return (
        <EventInfoBadgeIcon>
          <path d="M8 2.75c-2 0-3.5 1.55-3.5 3.5 0 2.75 3.5 6.25 3.5 6.25s3.5-3.5 3.5-6.25c0-1.95-1.5-3.5-3.5-3.5z" />
          <circle cx="8" cy="6.25" r="1.25" />
        </EventInfoBadgeIcon>
      );
    case "price":
      return (
        <EventInfoBadgeIcon>
          <path d="M4 4.5h8M4 8h5.5M4 11.5h8" />
        </EventInfoBadgeIcon>
      );
    case "star":
      return (
        <EventInfoBadgeIcon>
          <path d="M8 2.5l1.45 3.05 3.35.5-2.4 2.35.55 3.35L8 10.2l-2.95 1.55.55-3.35-2.4-2.35 3.35-.5L8 2.5z" />
        </EventInfoBadgeIcon>
      );
    default:
      return null;
  }
}

export function EventInfoBadges({
  badges,
  className,
  size = "default",
}: EventInfoBadgesProps) {
  if (badges.length === 0) {
    return null;
  }

  return (
    <ul
      className={cn("flex flex-wrap gap-2", className)}
      aria-label="Información del evento"
    >
      {badges.map((badge) => (
        <li key={badge.key}>
          <EventInfoBadge
            tone={badge.tone}
            icon={badge.icon ? renderIcon(badge.icon) : undefined}
            className={size === "compact" ? "text-xs px-2.5 py-1" : undefined}
          >
            {badge.label}
          </EventInfoBadge>
        </li>
      ))}
    </ul>
  );
}
