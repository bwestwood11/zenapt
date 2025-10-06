import "server-only"
import prisma from "../../../prisma"

export const getServices = async ({organizationId}: {organizationId:string}) => {
    const servicesWithGroup = await prisma.serviceGroup.findMany({
        where: {
            organizationId,

        },
        include: {
            serviceTerms: {
                select: {
                    name: true,
                    minimumPrice:true,
                    id:true,
                    excerpt:true
                }
            }
        }
    })

    return servicesWithGroup
}