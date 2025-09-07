import CheckoutComponent from "@/components/checkout/checkout-modal";
import React from "react";
import { getSession } from "@/lib/auth/session";
import { forbidden } from "next/navigation";

const CheckoutPage = async () => {
  const { data: session } = await getSession();
  if (!session || !session.user.id) {
    return null;
  }
  if (!session.user.role || session.user.role !== "OWNER") {
    return forbidden();
  }

  return (
    <div>
      <img
        src="https://cdn.dribbble.com/userupload/36923056/file/original-e5800727c39cde0f6cb919b2adb4d83c.jpg?resize=1024x768&vertical=center"
        className="w-full h-full bg-background"
      />
      <CheckoutComponent />
    </div>
  );
};

export default CheckoutPage;
