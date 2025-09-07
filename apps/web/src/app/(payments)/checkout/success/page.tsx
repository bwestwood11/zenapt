import SessionDetails from "@/components/checkout/success-page-fetch";

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id: string }>;
}) {
  const { session_id } = await searchParams;

  return <SessionDetails sessionId={session_id} />;
}
