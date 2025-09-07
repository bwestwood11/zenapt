"use client";

import React from "react";



import { useQuery } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";

import { SubscriptionModal } from "./checkout-form";



const CheckoutModal = () => {

  return (
    <div>
      <SubscriptionModal open={true} />
    </div>
  );
};

export default CheckoutModal;
