"use client";

import { useQuery } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";

export const useCustomerSession = () =>
  useQuery(trpc.customerAuth.session.queryOptions());
