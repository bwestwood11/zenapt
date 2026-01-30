import { EmployeeDayCalendar } from "@/components/calendar/calendar";

const LocationPage = async ({
  params,
}: {
  params: Promise<{ slug: string }>;
}) => {
  const slug = await params;
  return (
    <div>
      {/* <EmployeeDayCalendar employees={employees} /> */}
    Location Dashboard
    </div>
  );
};

export default LocationPage;
