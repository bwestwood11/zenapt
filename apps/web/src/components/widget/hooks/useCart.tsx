import { useCallback, useMemo } from "react";
import { useCheckoutStore, type Cart } from "./useStore";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "../../../../../server/src/routers";

type Service = inferRouterOutputs<AppRouter>["public"]["getServiceDetails"]
type Employee = Pick<NonNullable<Service>["employees"][number], "duration" | "price">

export function useCartCalculations(service: Pick<NonNullable<Service>, "addOns" | "employees"> | undefined, cart: Cart | null) {
  const selectedAddons = cart?.addons ?? [];


  const addonPrice = useMemo(
    () => selectedAddons.reduce((sum, a) => sum + a.price, 0),
    [selectedAddons]
  );

  const addonDuration = useMemo(
    () => selectedAddons.reduce((sum, a) => sum + a.duration, 0),
    [selectedAddons]
  );

  const getEmployee = useCallback(
    (employeeId: string) => {
      if (!service) return undefined;
      const employee = service.employees.find((e) => e.id === employeeId);
      if (!employee) return undefined;

      return employee
    },
    [service, addonPrice, addonDuration]
  );



  return {
    selectedAddons,
    addonPrice,
    addonDuration,
    getEmployee,
    totalPrice: (cart?.servicePrice ?? 0) + addonPrice,
    totalDuration: (cart?.serviceDuration ?? 0) + addonDuration,
  };
}


export function useCartActions(cart: Cart | null) {
const { updateCartItem } = useCheckoutStore();

  const toggleAddOn = (addon: { id: string; price: number; duration: number, title: string }) => {
  if (!cart) return;

  updateCartItem(cart.id, ({ addons = [], ...rest }) => {
    const exists = addons.some(a => a.id === addon.id);

    return {
      ...rest,
      addons: exists ? addons.filter(a => a.id !== addon.id) : [...addons, addon],
      employeeServiceId: "",
    };
  });
};


  const selectEmployee = (employeeId: string, servicePrice: number, serviceDuration: number) => {
    if(!cart) return
    updateCartItem(cart.id, { employeeServiceId: employeeId, servicePrice, serviceDuration });
  };

  return { toggleAddOn, selectEmployee };
}
