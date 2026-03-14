import React, { useState, type FormEvent } from "react";
import {
  CheckoutProvider,
  Elements,
  PaymentElement,
  useCheckout,
  useStripe,
} from "@stripe/react-stripe-js";
import getStripe from "../../lib/stripe/config";
import { trpc } from "@/utils/trpc";
import { useMutation } from "@tanstack/react-query";
import { Button } from "../ui/button";
import { useRouter } from "next/navigation";

const stripe = getStripe();

const StripeInit = ({
  numberOfLocations,
  price,
}: {
  numberOfLocations: number;
  price: number;
}) => {
  const [checkoutError, setCheckoutError] = useState("");
  const [loading, setLoading] = useState(false);
  const checkout = useCheckout();

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    try {
      e.preventDefault();
      if (!stripe || !checkout) {
        console.error("Stripe.js has not loaded yet.");
        return;
      }
      setLoading(true);

      const confirmResult = await checkout.confirm();
      console.log(confirmResult);
      if (confirmResult.type === "error") {
        setCheckoutError(confirmResult.error.message);
      }
    } catch (error) {
      console.log(error);
      setCheckoutError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <PaymentElement />
      {checkoutError && (
        <div className="text-sm text-red-500">{checkoutError}</div>
      )}
      <Button isLoading={loading} type="submit" className="w-full">
        Pay ${(price * numberOfLocations) / 100}
      </Button>
      {checkoutError && <p>{checkoutError}</p>}
    </form>
  );
};

const StripeForm = ({
  numberOfLocations,
  price,
}: {
  numberOfLocations: number;
  price: number;
}) => {
  const { data: clientSecret, mutateAsync: initiatePayment } = useMutation(
    trpc.payments.getCheckoutSession.mutationOptions()
  );
  const router = useRouter();
  const getClientSecret = async () => {
    const response = (await initiatePayment({ numberOfLocations })) || "";
    if (typeof response === "object" && "redirect" in response) {
      router.push(response.redirect);
      return "";
    }
    return response;
  };

  return (
    <>
      {!clientSecret && (
        <div className="flex flex-col items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary mb-4"></div>
          <p className="text-lg font-medium text-gray-700">
            Setting up a secure payment...
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Please wait while we prepare your encrypted checkout.
          </p>
        </div>
      )}
      <CheckoutProvider
        stripe={stripe}
        options={{
          fetchClientSecret: getClientSecret,
          elementsOptions: {
            appearance: {
              theme: "stripe",
              variables: {
                colorPrimary: "#8b5e34",
                colorBackground: "#fdf6e3",
                colorText: "#000000",
                colorDanger: "#df1b41",
              },
              rules: {
                ".Input": {
                  backgroundColor: "#ffffff90",
                },
              },
            },
          },
        }}
      >
        <StripeInit numberOfLocations={numberOfLocations} price={price} />
      </CheckoutProvider>
    </>
  );
};

export default StripeForm;
