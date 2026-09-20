import type { LucideIcon } from "lucide-react";
import {
  Activity,
  AlertTriangle,
  BadgeCheck,
  CalendarDays,
  CircleAlert,
  ClipboardCheck,
  Eye,
  Heart,
  HeartHandshake,
  Image,
  Info,
  MessageCircle,
  Rocket,
  Search,
  Shield,
  UserPlus,
  Users,
} from "lucide-react";
import type { ReactNode } from "react";

export type FounderIconName =
  | "users"
  | "user-plus"
  | "activity"
  | "heart"
  | "shield"
  | "message-circle"
  | "alert-triangle"
  | "badge-check"
  | "calendar-days"
  | "circle-alert"
  | "clipboard-check"
  | "eye"
  | "heart-handshake"
  | "image"
  | "search"
  | "rocket"
  | "info";

const ICONS: Record<FounderIconName, LucideIcon> = {
  users: Users,
  "user-plus": UserPlus,
  activity: Activity,
  heart: Heart,
  shield: Shield,
  "message-circle": MessageCircle,
  "alert-triangle": AlertTriangle,
  "badge-check": BadgeCheck,
  "calendar-days": CalendarDays,
  "circle-alert": CircleAlert,
  "clipboard-check": ClipboardCheck,
  eye: Eye,
  "heart-handshake": HeartHandshake,
  image: Image,
  search: Search,
  rocket: Rocket,
  info: Info,
};

export function FounderIcon({
  name,
  size = 17,
  className,
  title,
}: {
  name: FounderIconName;
  size?: number;
  className?: string;
  title?: string;
}) {
  const Icon = ICONS[name];
  return <Icon size={size} className={className} aria-hidden={title ? undefined : true} />;
}

export function FounderIconBadge({
  name,
  tone = "neutral",
  children,
}: {
  name: FounderIconName;
  tone?: "blue" | "green" | "rose" | "amber" | "neutral";
  children?: ReactNode;
}) {
  return (
    <span className={`founder-icon-badge founder-icon-badge--${tone}`}>
      <FounderIcon name={name} size={16} />
      {children}
    </span>
  );
}
