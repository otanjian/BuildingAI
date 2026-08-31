import {
  BookmarkCheck,
  Hammer,
  Info,
  ListChecks,
  type LucideIcon,
  Settings,
  TicketPercent,
  UserCircle,
  UserStar,
  Brain,
  Wallet,
} from "lucide-react";

export type SettingsPage =
  | "profile"
  | "general"
  | "personalParams"
  | "wallet"
  | "redeemCDK"
  | "tools"
  | "subscribe"
  | "about"
  | "personalized"
  | "longTermMemory";

export type SettingsNavItem = {
  id: SettingsPage;
  name: string;
  icon: LucideIcon;
};

export type SettingsNavGroup = {
  label: string;
  items: SettingsNavItem[];
};

export const SETTINGS_NAV: SettingsNavGroup[] = [
  {
    label: "settings.nav.account.label",
    items: [
      { id: "profile", name: "settings.nav.account.profile", icon: UserCircle },
      { id: "wallet", name: "settings.nav.account.wallet", icon: Wallet },
      {
        id: "subscribe",
        name: "settings.nav.account.subscribe",
        icon: BookmarkCheck,
      },
      {
        id: "redeemCDK",
        name: "settings.nav.account.redeemCardKey",
        icon: TicketPercent,
      },
    ],
  },
  {
    label: "settings.nav.general.label",
    items: [
      { id: "general", name: "settings.nav.general.general", icon: Settings },
      { id: "personalParams", name: "settings.nav.general.personalParams", icon: ListChecks },
      { id: "about", name: "settings.nav.general.about", icon: Info },
    ],
  },
  {
    label: "settings.nav.ai.label",
    items: [
      { id: "personalized", name: "settings.nav.ai.personalized", icon: UserStar },
      { id: "longTermMemory", name: "settings.nav.ai.longTermMemory", icon: Brain },
      { id: "tools", name: "settings.nav.ai.tools", icon: Hammer },
    ],
  },
];
