import LoginForm from "@/components/login/login-form";

import { redirectIfAuthenticated } from "@/lib/permissions/permission";

export default async function LoginPage() {
  await redirectIfAuthenticated("/dashboard")

  return <LoginForm  />;
}
