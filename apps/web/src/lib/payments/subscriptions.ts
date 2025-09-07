import { serverTRPC } from "@/utils/server-trpc";
import "server-only";

export async function getSubscription() {
    const OrgWithSubscription = await serverTRPC.payments.getSubscriptionDetails.fetch();
    return OrgWithSubscription;
}

export async function getSubscriptionDetails() {

}