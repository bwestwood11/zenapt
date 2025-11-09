import { create } from "zustand";

export interface Breadcrumb {
  label: string;
  href?: string;
}

interface BreadcrumbStore {
  breadcrumbs: Breadcrumb[];
  setBreadcrumbs: (b: Breadcrumb[]) => void;
}

export const useBreadcrumbStore = create<BreadcrumbStore>((set) => ({
  breadcrumbs: [],
  setBreadcrumbs: (b) => set({ breadcrumbs: b }),
}));



export const BREADCRUMBS: Record<string, Breadcrumb[]> = {
  dashboard: [{ href: "/dashboard", label: "Dashboard" }],
  dashboardLocations: [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/dashboard/location", label: "Locations" },
  ],
  dashboardSettings: [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/dashboard/settings", label: "Settings" },
  ],

};
