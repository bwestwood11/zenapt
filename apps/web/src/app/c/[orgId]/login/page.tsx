import { CustomerPortalLoginShell } from "@/components/customer-portal/login-shell";

type PageProps = Readonly<{
  params: Promise<{
    orgId: string;
  }>;
  searchParams: Promise<{
    return?: string;
  }>;
}>;

export default async function CustomerPortalLoginPage({
  params,
  searchParams,
}: PageProps) {
  const { orgId } = await params;
  const { return: returnUrl } = await searchParams;

  return (
    <CustomerPortalLoginShell orgId={orgId} returnUrl={returnUrl} />
  );
}
