"use client";

import { create } from "zustand";
// import { StepIds } from "../steps";
import type { CartType } from "../schema";
import { STEPS } from "../steps";
import { errors } from "../error";
import type { ZodError } from "zod";

export enum StepIds {
  LOCATION,
  SERVICE_GROUP,
  SERVICE,
  SERVICE_DETAILS,
  CART,
  REVIEW,
  CALENDAR,
}

interface Store {
  step: StepIds;
  cartItemId: string | null;
  setStep: (s: StepIds, CartIndex?: string | null) => void;

  location: string | null;
  setLocation: (l: string) => void;

  appointmentTime: { start: Date; end: Date } | null;
  setAppointmentTime: (time: { start: Date; end: Date } | null) => void;

  cart: (Partial<CartType> & { id: string })[];
  addCartItem: () => string;

  updateCartItem: (
    id: string,
    updater:
      | Partial<CartType>
      | ((prev: Partial<CartType> & { id: string }) => Partial<CartType>),
  ) => void;
  handleNext: () => void;
  handleBack: () => void;
  hasPreviousStep: () => boolean;
  addCartItemAndMoveToCart: () => void;
  removeCart: (id: string) => void;
  editCart: (id: string) => void;
}

export const useCheckoutStore = create<Store>((set, get) => ({
  step: StepIds.LOCATION,
  cartItemId: null,
  setStep: (s, c) => set({ step: s, cartItemId: c }),

  location: null,
  setLocation: (l) => set({ location: l }),

  appointmentTime: null,
  setAppointmentTime: (time) => set({ appointmentTime: time }),

  cart: [],
  addCartItem: () => {
    const id = crypto.randomUUID();
    set((state) => ({ cart: [...state.cart, { id }] }));
    return id;
  },

  editCart(id) {
    set(({ cartItemId, step, cart }) => {
      if (!cart.some((a) => a.id === id)) {
        console.error("Not existing cart", id);
        return {};
      }

      return { step: StepIds.SERVICE_GROUP, cartItemId: id };
    });
  },

  removeCart: (id) => {
    set(({ cartItemId, cart }) => {
      return {
        cart: cart.filter((a) => a.id !== id),
        cartItemId: cartItemId === id ? null : cartItemId,
      };
    });
  },
  addCartItemAndMoveToCart: () => {
    const { addCartItem } = get();
    const cartId = addCartItem();
    set({ step: StepIds.SERVICE_GROUP, cartItemId: cartId });
  },

  updateCartItem: (id, updater) =>
    set((state) => ({
      cart: state.cart.map((item) => {
        if (item.id !== id) return item;

        const next = typeof updater === "function" ? updater(item) : updater;

        return { ...item, ...next };
      }),
    })),

  handleNext: () => {
    const { step: stepId, cart, cartItemId, location } = get();

    const Step = STEPS.find((s) => s.id === stepId);

    if (!Step?.schema) {
      console.warn("No schema found for step", stepId);
      return;
    }

    let payload: unknown = {};

    switch (stepId) {
      case StepIds.LOCATION:
        payload = { locationId: location };
        break;

      case StepIds.SERVICE_GROUP:
      case StepIds.SERVICE:
      case StepIds.SERVICE_DETAILS:
        payload = cart.find((c) => c.id === cartItemId);
        break;

      case StepIds.CART:
        payload = { cart };
        break;

      case StepIds.CALENDAR:
        payload = { cart };
        break;

      case StepIds.REVIEW:
        payload = { cart };
        break;
    }

    // ---- VALIDATE BEFORE MOVING ----
    const result = Step.schema.safeParse(payload);

    if (!result.success) {
      const message = extractSafeParseError(result.error);
      errors.emit({
        description:
          message?.message || "Something is not right in current data.",
      });
      return;
    }

    switch (stepId) {
      case StepIds.LOCATION:
        if (cart.length !== 0) {
          set({ cart: [] });
        }

        let cartId = get().addCartItem();
        set({ step: StepIds.SERVICE_GROUP, cartItemId: cartId });
        break;

      case StepIds.SERVICE_GROUP:
        set({ step: StepIds.SERVICE });
        break;

      case StepIds.SERVICE:
        set({ step: StepIds.SERVICE_DETAILS });
        break;

      case StepIds.SERVICE_DETAILS:
        set({ step: StepIds.CART, cartItemId: null });
        break;

      case StepIds.CART:
        set({ step: StepIds.CALENDAR, cartItemId: null });
        break;

      case StepIds.CALENDAR:
        set({ step: StepIds.REVIEW, cartItemId: null });
        break;

      case StepIds.REVIEW:
    }
  },

  hasPreviousStep: () => {
    const { step } = get();
    const FIRST_STEPS = [StepIds.LOCATION];
    return !FIRST_STEPS.includes(step);
  },

  // hasNextStep: () => {
  //   const {step} = get()
  //   const LAST_STEPS = []
  //   return !(LAST_STEPS.includes(step))
  // }

  handleBack: () => {
    const { step, cart, cartItemId } = get();

    switch (step) {
      case StepIds.LOCATION:
        console.error("No back");
        break;

      case StepIds.SERVICE_GROUP:
        set({ step: StepIds.LOCATION, cartItemId: null });
        break;

      case StepIds.SERVICE:
        set({ step: StepIds.SERVICE_GROUP });
        break;

      case StepIds.SERVICE_DETAILS:
        set({ step: StepIds.SERVICE });
        break;

      case StepIds.CART:
        break;
      case StepIds.CALENDAR:
        set({ step: StepIds.CART });
        break;
      case StepIds.REVIEW:
        set({ step: StepIds.CALENDAR });
        break;
    }
  },
}));

export type Cart = Partial<CartType> & { id: string };
export const useWatchCart = (): Cart | null => {
  const cartItemId = useCheckoutStore((s) => s.cartItemId);

  // Only select the cart item with the current id
  const currentItem = useCheckoutStore(
    (s) => s.cart.find((c) => c.id === cartItemId) ?? null,
  );

  return currentItem;
};

export type ParsedZodError = {
  message: string;
};

const MAX_MESSAGE_LENGTH = 50; // adjust if needed

export function extractSafeParseError<T>(
  error: ZodError<T>,
): ParsedZodError | null {
  const issue = error.issues[0];

  const field = issue.path.length
    ? formatFieldName(issue.path.join("."))
    : "Validation Error";

  const shortMsg = shortenMessage(issue.message);

  return {
    message: shortMsg,
  };
}

function formatFieldName(str: string) {
  return str
    .replace(/([A-Z])/g, " $1")
    .replace(/[_-]/g, " ")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/^\w/, (c) => c.toUpperCase());
}

function shortenMessage(msg: string) {
  msg = msg.trim().replace(/\.$/, ""); // remove ending dot

  if (msg.length <= MAX_MESSAGE_LENGTH) return msg;

  return msg.slice(0, MAX_MESSAGE_LENGTH).trim() + "...";
}
