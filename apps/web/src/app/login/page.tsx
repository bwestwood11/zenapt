import SignInForm from "@/components/sign-in-form";
import { redirectIfAuthenticated } from "@/lib/permissions/permission";

export default async function LoginPage() {
  await redirectIfAuthenticated("/dashboard")

  return <SignInForm />;
}
