import Widget from "@/components/widget/widget";
import React from "react";

export const metadata = {
  title: "Booking Widget",
};

type PageProps = {
  params: Promise<{
    orgId: string;
  }>;
};

const page = async ({ params }: PageProps) => {
  const { orgId } = await params;

  return <Widget orgId={orgId} />;
};

export default page;
