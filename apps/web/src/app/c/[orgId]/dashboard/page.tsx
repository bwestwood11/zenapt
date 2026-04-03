import { CustomerPortalDashboard } from "../../../../components/customer-portal/dashboard";

type PageProps = Readonly<{
  params: Promise<{
    orgId: string;
  }>;
}>;

export default async function CustomerPortalDashboardPage({ params }: PageProps) {
  const { orgId } = await params;

  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-background px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <CustomerPortalDashboard organizationId={orgId} />
      </div>
    </main>
  );
}
