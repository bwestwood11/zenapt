import type { JSX } from "react";
import Locations from "./locations";
import ServiceCategory from "./service-category";
import Services from "./services";
import ServiceDetails from "./service-details";
import CartPage from "./cart";
import { CartSchema, WidgetSchema } from "../schema";
import type { ZodObject } from "zod";
import ReviewPage from "./review";
import CalendarPage from "./calendar";

export enum StepIds {
  LOCATION,
  SERVICE_GROUP,
  SERVICE,
  SERVICE_DETAILS,
  CART,
  REVIEW,
  CALENDAR,
}

export enum StepType {
  BEFORE_CART,
  CART_ITEM,
  AFTER_CART,
}

export type MainStep = {
  component: JSX.Element;
  title: string;
  id: StepIds;
  description: string;
  backButtonTitle?: string;
  type: StepType;
  schema: ZodObject;
};

export const BEFORE_CART_STEPS: MainStep[] = [
  {
    component: <Locations />,
    title: "Select Your Location",
    id: StepIds.LOCATION,
    description:
      " Please select the location where you would like to book your service.",
    type: StepType.BEFORE_CART,
    schema: WidgetSchema.pick({ locationId: true }),
  },
];

export const AFTER_CART_STEPS: MainStep[] = [
  {
    component: <CartPage />,
    title: "Cart",
    id: StepIds.CART,
    description:
      " Please select the location where you would like to book your service.",
    type: StepType.AFTER_CART,
    schema: WidgetSchema.pick({ cart: true }),
  },
  {
    component: <CalendarPage />,
    title: "Calendar",
    id: StepIds.CALENDAR,
    description: " Please select the date and time for your appointment.",
    type: StepType.AFTER_CART,
    schema: WidgetSchema.pick({ cart: true }),
  },
  {
    component: <ReviewPage />,
    title: "Review",
    id: StepIds.REVIEW,
    description: " Review your appointment details before confirming.",
    type: StepType.AFTER_CART,
    schema: WidgetSchema.pick({ cart: true }),
  },
];

export const CART_STEPS: MainStep[] = [
  {
    component: <ServiceCategory />,
    title: "Service Category",
    id: StepIds.SERVICE_GROUP,
    description:
      " Please select the category of service you would like to book.",
    backButtonTitle: "Back To Location",
    type: StepType.CART_ITEM,
    schema: CartSchema.pick({ groupId: true }),
  },
  {
    component: <Services />,
    title: "Services",
    id: StepIds.SERVICE,
    description: " Please select the service you would like to book.",
    backButtonTitle: "Back To Service Category",
    type: StepType.CART_ITEM,
    schema: CartSchema.pick({ serviceId: true }),
  },
  {
    component: <ServiceDetails />,
    title: "Services Details",
    id: StepIds.SERVICE_DETAILS,
    description:
      "Please provide additional details about the service you selected.",
    backButtonTitle: "Back To Service Selection",
    type: StepType.CART_ITEM,
    schema: CartSchema.pick({ employeeServiceId: true, addons: true }),
  },
];

export const STEPS: MainStep[] = [
  ...BEFORE_CART_STEPS,
  ...CART_STEPS,
  ...AFTER_CART_STEPS,
];
