import { Button, buttonVariants } from "@/components/ui/button"
import { ShieldX, ArrowLeft, Mail } from "lucide-react"
import Link from "next/link"

export default function Forbidden() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 md:p-8">
      <div className="w-full max-w-2xl mx-auto text-center space-y-8 md:space-y-12">
        {/* Icon */}
        <div className="flex justify-center">
          <div className="rounded-full bg-muted p-6 md:p-8">
            <ShieldX className="h-16 w-16 md:h-20 md:w-20 text-primary" />
          </div>
        </div>

        {/* Main heading */}
        <div className="space-y-4 md:space-y-6">
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-foreground tracking-tight">Access Denied</h1>
          <p className="text-muted-foreground text-xl md:text-2xl lg:text-3xl font-medium">
            You do not have permission to view this page
          </p>
        </div>

        {/* Description */}
        <div className="space-y-4 md:space-y-6 max-w-xl mx-auto">
          <p className="text-foreground text-lg md:text-xl text-balance leading-relaxed">
            This section of the med spa booking management system requires owner-level permissions.
          </p>
          <p className="text-muted-foreground text-base md:text-lg">
            Please contact your administrator to request access to this feature.
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center max-w-md mx-auto">
    

      
            <Link href="/dashboard" className={buttonVariants({size:"lg", variant:"outline"})}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Link>
        </div>

        {/* Footer note */}
        <div className="pt-8 md:pt-12">
          <p className="text-sm md:text-base text-muted-foreground font-medium">Med Spa Booking Management System</p>
        </div>
      </div>
    </div>
  )
}
