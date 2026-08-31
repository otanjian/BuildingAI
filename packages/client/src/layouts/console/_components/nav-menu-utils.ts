import type { MenuItem } from "@buildingai/web-types";

/** Return menu items that are allowed to appear in the console navigation. */
export function filterVisibleMenus(menus: MenuItem[]): MenuItem[] {
  return menus
    .filter((menu) => menu.type !== 3 && Number(menu.isHidden) !== 1)
    .map((menu) => ({
      ...menu,
      children: menu.children ? filterVisibleMenus(menu.children) : [],
    }));
}
