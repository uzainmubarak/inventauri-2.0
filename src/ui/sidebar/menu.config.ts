export type MenuItem = {
  name: string;
  link: string;
  icon: string;
  badge?: number;
};

export type MenuSection = {
  label: string;
  items: MenuItem[];
};

export const MENU_CONFIG: MenuSection[] = [
  {
    label: "Dashboard",
    items: [
      { name: "Dashboard", link: "/", icon: "📊" },
    ],
  },
  {
    label: "Production",
    items: [
      { name: "Orders", link: "/orders", icon: "🛒", badge: 3 },
      { name: "Karigar Dashboard", link: "/karigar-dashboard", icon: "🙍‍♂️" },
      { name: "Design Library", link: "/design-library", icon: "🧑‍🎨" },
    ],
  },
  {
    label: "People",
    items: [
      { name: "Contacts", link: "/contacts", icon: "📒" },
      { name: "Agent Ledger", link: "/agent-ledger", icon: "🧾" },
    ],
  },
  {
    label: "Stock",
    items: [
      { name: "Inventory", link: "/inventory", icon: "📦" },
    ],
  },
  {
    label: "System",
    items: [
      { name: "Settings", link: "/settings", icon: "⚙️" },
    ],
  },
];

