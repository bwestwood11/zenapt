import { useParams } from "next/navigation";

export const useOrgId = () => useParams<{orgId:string}>().orgId