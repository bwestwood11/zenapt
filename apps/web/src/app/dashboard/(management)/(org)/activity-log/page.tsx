import { ActivityLog } from "@/components/activity-log/activity-log";
import { requirePermission } from "@/lib/permissions/permission";


export default async function ActivityLogPage() {
  await requirePermission(["READ::ORGANIZATION"])
  return (
    <main className="min-h-screen bg-background">
      <ActivityLog />
    </main>
  )
}
