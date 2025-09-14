import { revalidateTag } from "next/cache";

export const CACHE_KEYS = {
    ORG_WITH_SUBSCRIPTION: "org_with_subscription",
} as const;

export function revalidateCache(key: keyof typeof CACHE_KEYS) {
       revalidateTag(CACHE_KEYS[key]);
}