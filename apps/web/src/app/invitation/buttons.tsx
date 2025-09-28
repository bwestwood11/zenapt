"use client"

import { Button } from "@/components/ui/button"
import { trpc } from "@/utils/trpc"
import { useMutation } from "@tanstack/react-query"
import { CheckCircle, XCircle, Users, Mail } from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

const ActionButtons = ({token}: {token: string}) => {
  const router = useRouter()
     const {mutate: accept, isPending: Accepting} = useMutation(trpc.invitation.acceptInvitation.mutationOptions({
      onError(err){
        toast.error(err.message)
      },
      onSuccess() {
         router.replace("/change-password")
      },
     }))
     const {mutate: decline, isPending: Declining} = useMutation(trpc.invitation.declineInvitation.mutationOptions())

  const handleAccept = () => {
      accept({token})  
  }

  const handleDecline = () => {
    decline({token})
  }

  return (
   <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
          <Button onClick={handleAccept} isLoading={Accepting} size="lg" className="w-full sm:w-auto min-w-[160px] text-base font-medium">
            <CheckCircle className="w-5 h-5 mr-2" />
            Accept Invitation
          </Button>

          <Button
            onClick={handleDecline}
            isLoading={Declining}
            variant="outline"
            size="lg"
            className="w-full sm:w-auto min-w-[160px] text-base font-medium bg-transparent"
          >
            <XCircle className="w-5 h-5 mr-2" />
            Decline
          </Button>
        </div>
  )
}

export default ActionButtons