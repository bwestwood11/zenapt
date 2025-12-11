import z from "zod";

export const CartSchema = z.object({
    groupId:z.string({ error: "You must select a service category." }).min(1),
    serviceId: z.string({ error: "You must select a service." }).min(1),
    employeeServiceId: z.string({ error: "You must select an employee to perform the service." }).min(1, { error: "You must select an employee to perform the service." }),
    addons:z.array(z.object({
        id: z.string({error: "Invalid addon selected."}).min(1),
        price: z.number(),
        duration:z.number(),
        title: z.string().optional()
    })).optional(),
    servicePrice: z.number().optional(),
    serviceDuration:z.number()
})


export const WidgetSchema = z.object({
    locationId: z.string({ error: "You must select a location." }).min(1),
    cart: z.array(CartSchema).min(1)
})

export type WidgetDataType = z.infer<typeof WidgetSchema>
export type CartType = z.infer<typeof CartSchema>