import { redirect } from "next/navigation";

type PageProps = Readonly<{
  params: Promise<{
    orgId: string;
  }>;
}>;

export default async function CustomerPortalIndexPage({ params }: PageProps) {
  const { orgId } = await params;
  
  redirect(`/c/${orgId}/dashboard`);
}
