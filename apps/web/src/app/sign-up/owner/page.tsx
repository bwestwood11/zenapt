import SignUpForm from "@/components/sign-up-form";
import React from "react";

const SignUpPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; email?: string }>;
}) => {
  const { email, token } = await searchParams;

  console.log("Received token:", token);

  if (!token || !email) return <p>Try booking a demo</p>;
  return <SignUpForm email={email} token={token} />;
};

export default SignUpPage;
