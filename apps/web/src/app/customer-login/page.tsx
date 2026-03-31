import { redirect } from "next/navigation";

type PageProps = Readonly<{
  searchParams: Promise<{
    return?: string;
    orgId?: string;
  }>;
}>;

const inferOrgId = (returnUrl?: string, orgId?: string) => {
  if (orgId) {
    return orgId;
  }

  if (!returnUrl) {
    return null;
  }

  try {
    const parsed = new URL(returnUrl, "http://localhost");
    const pathParts = parsed.pathname.split("/").filter(Boolean);

    if (pathParts[0] === "widget" && pathParts[1]) {
      return pathParts[1];
    }

    if (pathParts[0]) {
      return pathParts[0];
    }
  } catch {
    return null;
  }

  return null;
};

export default async function LegacyCustomerLoginPage({ searchParams }: PageProps) {
  const { return: returnUrl, orgId } = await searchParams;
  const resolvedOrgId = inferOrgId(returnUrl, orgId);

  if (resolvedOrgId) {
    const search = returnUrl
      ? `?return=${encodeURIComponent(returnUrl)}`
      : "";

    redirect(`/c/${resolvedOrgId}/login${search}`);
  }

  redirect("/");
}
