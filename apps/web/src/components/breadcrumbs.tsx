"use client";

import { useBreadcrumbStore, type Breadcrumb } from "@/hooks/breadcrumbs";
import { useLayoutEffect } from "react";

interface SetBreadcrumbsProps {
  items: Breadcrumb[];
}

export function SetBreadcrumbs({ items }: SetBreadcrumbsProps) {
  const { setBreadcrumbs } = useBreadcrumbStore();

  useLayoutEffect(() => {
    setBreadcrumbs(items);
    console.log("Setting breadcrumbs:", items);
    return () => setBreadcrumbs([]);
  }, [items]);

  return null;
}
