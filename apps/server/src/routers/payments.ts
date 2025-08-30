import { protectedProcedure, router } from "../lib/trpc";
import prisma from "../../prisma";
import { TRPCError } from "@trpc/server";

const initializePayment = protectedProcedure.mutation(async ({ ctx }) => {
    const { session } = ctx;

    const user = await prisma.user.findUnique({
        where: {
            id: session.user.id
        }
    })

    if (!user || !user.email) {
        throw new TRPCError({
            code: "BAD_REQUEST",
            message: "User not found or email missing"
        })
    }

})


export const paymentRouter = router({
   initializePayment: initializePayment,
});