import SignUpForm from "@/components/sign-up-form";
import React from "react";

const SignUpPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; email?: string }>;
}) => {
  const { email, token } = await searchParams;

  if (!token || !email) return <p>Try booking a demo {email} {token}</p>;
  return <SignUpForm email={email} token={token} />;
};

export default SignUpPage;
