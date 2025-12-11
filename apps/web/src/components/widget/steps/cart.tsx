"use client";

import React, { useMemo } from "react";
import { useCheckoutStore, type Cart } from "../hooks/useStore";
import { useQuery } from "@tanstack/react-query";
import { useCartActions, useCartCalculations } from "../hooks/useCart";
import { trpc } from "@/utils/trpc";
import { Clock, Sparkles, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { add } from "date-fns";

const CartPage = () => {
  const { cart, addCartItemAndMoveToCart } = useCheckoutStore();

  const totalPrice = useMemo(() => {
    return cart.reduce((total, item) => {
      const addonsTotal = item.addons?.reduce((s, a) => s + a.price, 0) ?? 0;
      return total + addonsTotal + (item.servicePrice ?? 0);
    }, 0);
  }, [cart]);

  return (
    <>
      <div className="mb-6">
        <h2 className="text-sidebar-foreground text-2xl font-semibold mb-2 tracking-tight">
          Review Your Booking
        </h2>
        <p className="text-sidebar-foreground/60 text-sm">
          Please review your selections before continuing.
        </p>
      </div>

      {/* Cart Items - Supports multiple items */}
      <div className="space-y-4 mb-6">
        {cart.map((cartItem) => (
          <CartItem key={cartItem.id} cart={cartItem} />
        ))}
      </div>

      {/* Total Price Card */}
      <div className="p-5 rounded-xl bg-accent/10 border-2 border-accent">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-accent-foreground/70 text-sm mb-1">
              Total Price
            </p>
            <p className="text-accent-foreground text-3xl font-bold">
              ${totalPrice && (totalPrice / 100).toFixed(2)}
            </p>
          </div>
          <Sparkles className="w-8 h-8 text-accent" />
        </div>
      </div>
      <Button onClick={addCartItemAndMoveToCart} className="mt-4 w-full">
        Add More Services
      </Button>
    </>
  );
};

const CartItem = ({ cart }: { cart: Cart }) => {
  const { data: service } = useQuery(
    trpc.public.getServiceDetails.queryOptions(
      { serviceId: cart?.serviceId! },
      { enabled: !!cart?.serviceId, staleTime: Infinity }
    )
  );
  const { addonPrice, addonDuration, getEmployee, totalPrice, totalDuration } =
    useCartCalculations(service, cart);
  const { removeCart, editCart } = useCheckoutStore();
  const employee = getEmployee(cart.employeeServiceId || "");

  if (!cart.employeeServiceId || !service) return null;

  return (
    <div className="p-5 rounded-xl bg-sidebar-accent/20 border-2 border-sidebar-border">
      {/* Service & Professional Row */}
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex-1">
          <h4 className="text-sidebar-foreground font-semibold text-base mb-1">
            {service.name}
          </h4>
          <div className="flex items-center gap-2 text-sidebar-foreground/60 text-sm">
            <User className="w-4 h-4" />
            <span>{employee?.userName}</span>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sidebar-foreground font-semibold text-lg">
            ${employee && (employee.price / 100).toFixed(2)}
          </p>
          <p className="text-sidebar-foreground/50 text-xs flex items-center justify-end gap-1 mt-1">
            <Clock className="w-3 h-3" />
            {totalDuration}
          </p>
        </div>
      </div>

      {/* Add-ons (if any) */}
      {!!cart.addons?.length && (
        <div className="pt-3 border-t border-sidebar-border">
          <p className="text-sidebar-foreground/60 text-xs font-medium mb-2">
            Enhancements:
          </p>
          <div className="space-y-1.5">
            {cart.addons?.map((addOn) => (
              <div
                key={addOn.id}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-sidebar-foreground/70">
                  + {addOn.title || "Addon"}
                </span>
                <span className="text-sidebar-foreground/70">
                  ${(addOn.price / 100).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="text-right border-top padding-top mt-4 pt-3 border-t border-sidebar-border">
        <p className="text-sidebar-foreground font-semibold text-lg">
          ${totalPrice && (totalPrice / 100).toFixed(2)}
        </p>
      </div>
      {/* Action Buttons */}
      <div className="flex gap-2 mt-4 pt-3 border-t border-sidebar-border">
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={() => {
            editCart(cart.id);
          }}
        >
          Edit
        </Button>
        <Button
          variant="destructive"
          size="sm"
          className="flex-1"
          onClick={() => {
            removeCart(cart.id);
          }}
        >
          Remove
        </Button>
      </div>
    </div>
  );
};

export default CartPage;
