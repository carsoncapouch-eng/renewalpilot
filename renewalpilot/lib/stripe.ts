import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY is missing from .env.local");
}

// Server-side Stripe client. Only import this in server code
// (API routes, server actions, server components), never in "use client" files.
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Your plans, in one place. Change names/prices here later if pricing changes.
export const PLANS = {
  starter: {
    name: "Starter",
    price: 49,
    priceId: process.env.STRIPE_PRICE_STARTER!,
    description: "Small team / limited tracked requirements",
  },
  business: {
    name: "Business",
    price: 99,
    priceId: process.env.STRIPE_PRICE_BUSINESS!,
    description: "More employees, workflows, assignments and reporting",
  },
  pro: {
    name: "Pro",
    price: 199,
    priceId: process.env.STRIPE_PRICE_PRO!,
    description: "Larger teams, advanced automation and integrations",
  },
} as const;

export type PlanKey = keyof typeof PLANS;

// Turns a Stripe price ID back into "starter" | "business" | "pro".
// The webhook uses this later to update the organization's plan.
export function planFromPriceId(priceId: string): PlanKey | null {
  const match = Object.entries(PLANS).find(([, p]) => p.priceId === priceId);
  return match ? (match[0] as PlanKey) : null;
}