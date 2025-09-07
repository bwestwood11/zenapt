import { stripe } from "./server-stripe";

export async function getPriceDetails() {
     const price = await stripe.prices.retrieve(process.env.STRIPE_PRICE_ID!);
    
     return price;
}