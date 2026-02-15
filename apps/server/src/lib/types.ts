export type AdminJWTPayload = {
  id: string;
  name: string;
  email: string;
  admin: boolean;
};

export type CustomerJWTPayload = {
  sub: string;
  customerId: string;
  userId: string;
  orgId: string;
  email: string;
  name: string | null;
  type: "customer";
};
