"use client";

import { SetBreadcrumbs } from "@/components/breadcrumbs";
import type { Breadcrumb } from "@/hooks/breadcrumbs";
import { usePathname } from "next/navigation";

type BreadcrumbRoute = {
  path: string;
  label: string;
};

const normalizePath = (value: string) =>
  value
    .replaceAll(/\/+/g, "/")
    .replaceAll(/^\/+|\/+$/g, "")
    .trim();

const escapeRegexSegment = (value: string) =>
  value.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);

const isDynamicSegment = (segment: string) =>
  segment.startsWith("[") && segment.endsWith("]") && segment.length > 2;

const getRouteRegex = (routePath: string) => {
  const normalized = normalizePath(routePath);
  if (!normalized) {
    return null;
  }

  const pattern = normalized
    .split("/")
    .map((segment) =>
      isDynamicSegment(segment) ? "[^/]+" : escapeRegexSegment(segment),
    )
    .join("/");

  return new RegExp(`^${pattern}(?:/|$)`);
};

const resolveRouteHref = (routePath: string, currentSubPath: string) => {
  const routeSegments = normalizePath(routePath).split("/").filter(Boolean);
  const currentSegments = normalizePath(currentSubPath).split("/").filter(Boolean);
  const resolvedSegments: string[] = [];

  for (const [index, segment] of routeSegments.entries()) {
    if (isDynamicSegment(segment)) {
      const currentSegment = currentSegments[index];
      if (!currentSegment) {
        return null;
      }

      resolvedSegments.push(currentSegment);
      continue;
    }

    resolvedSegments.push(segment);
  }

  return resolvedSegments.join("/");
};

const formatSlugLabel = (slug: string) =>
  slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const LOCATION_BREADCRUMB_ROUTES: BreadcrumbRoute[] = [
  { path: "appointments", label: "Appointments" },
  { path: "master-calendar", label: "Master Calendar" },
  { path: "customers", label: "Customers" },
  { path: "customers/[customerId]", label: "Customer Details" },
  { path: "my-services", label: "My Services" },
  { path: "employees", label: "Employees" },
  { path: "employees/invite", label: "Invite Employee" },
  { path: "location-settings", label: "Location Settings" },
  { path: "settings", label: "Settings" },
];

export default function LocationBreadcrumbs({ slug }: Readonly<{ slug: string }>) {
  const pathName = usePathname();
  const basePath = `/dashboard/l/${slug}`;
  const normalizedPathName = normalizePath(pathName);
  const normalizedBasePath = normalizePath(basePath);

  if (
    normalizedPathName !== normalizedBasePath &&
    !normalizedPathName.startsWith(`${normalizedBasePath}/`)
  ) {
    return <SetBreadcrumbs items={[]} />;
  }

  const subPath =
    normalizedPathName === normalizedBasePath
      ? ""
      : normalizePath(normalizedPathName.slice(normalizedBasePath.length + 1));

  const items: Breadcrumb[] = [
    { href: basePath, label: formatSlugLabel(slug) },
  ];
  const usedHrefs = new Set(items.map((item) => item.href ?? ""));

  for (const route of LOCATION_BREADCRUMB_ROUTES) {
    const routeRegex = getRouteRegex(route.path);
    if (!routeRegex) {
      continue;
    }

    if (routeRegex.test(subPath)) {
      const resolvedPath = resolveRouteHref(route.path, subPath);
      if (!resolvedPath) {
        continue;
      }

      const href = `${basePath}/${resolvedPath}`;
      if (!usedHrefs.has(href)) {
        items.push({ href, label: route.label });
        usedHrefs.add(href);
      }
    }
  }

  return <SetBreadcrumbs items={items} />;
}
