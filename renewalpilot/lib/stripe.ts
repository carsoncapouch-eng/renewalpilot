import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY is missing from .env.local");
}

// Server-side Stripe client. Only import this in server code
// (API routes, server actions, server components), never in "use client" files.
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Your plans, in one place. Change names/prices here later if pricing changes.
// Employee limits are also enforced in the database (see lib/access.ts).
export const PLANS = {
  starter: {
    name: "Starter",
    price: 49,
    yearlyPrice: 490,
    employees: 10,
    priceId: process.env.STRIPE_PRICE_STARTER!,
    yearlyPriceId: process.env.STRIPE_PRICE_STARTER_YEARLY,
    description: "For small teams — up to 10 active employees",
  },
  business: {
    name: "Business",
    price: 99,
    yearlyPrice: 990,
    employees: 50,
    priceId: process.env.STRIPE_PRICE_BUSINESS!,
    yearlyPriceId: process.env.STRIPE_PRICE_BUSINESS_YEARLY,
    description: "For growing teams — up to 50 active employees",
  },
  pro: {
    name: "Pro",
    price: 199,
    yearlyPrice: 1990,
    employees: null,
    priceId: process.env.STRIPE_PRICE_PRO!,
    yearlyPriceId: process.env.STRIPE_PRICE_PRO_YEARLY,
    description: "For larger companies — unlimited employees",
  },
} as const;

export type PlanKey = keyof typeof PLANS;

// Turns a Stripe price ID (monthly or yearly) back into "starter" | "business" | "pro".
// The webhook uses this to update the organization's plan.
export function planFromPriceId(priceId: string): PlanKey | null {
  const match = Object.entries(PLANS).find(
    ([, p]) => p.priceId === priceId || (!!p.yearlyPriceId && p.yearlyPriceId === priceId)
  );
  return match ? (match[0] as PlanKey) : null;
}