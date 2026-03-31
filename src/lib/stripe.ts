// Stripe product/price mapping
export const STRIPE_TIERS = {
  mirror: {
    price_id: "price_1TH5zNCqqf8VlckxdA7rzTH8",
    product_id: "prod_UFbBUJGbugwqq0",
    name: "Mirror",
    price: "£11/month",
    features: [
      "Unlimited readings",
      "Full decision journal",
      "Weekly check-in",
    ],
  },
  mirror_pro: {
    price_id: "price_1TH5zjCqqf8VlckxUzOXW3pn",
    product_id: "prod_UFbCYrbFvm1RKJ",
    name: "Mirror Pro",
    price: "£22/month",
    features: [
      "Everything in Mirror",
      "Shareable Third Way cards",
      "Pattern insights unlocked",
    ],
  },
  practitioner: {
    price_id: "price_1TH6rgCqqf8VlckxNET9wkVH",
    product_id: "prod_UFc5n43D1PnJ3Z",
    name: "Practitioner",
    price: "£49/month",
    features: [
      "Up to 20 clients",
      "Unlimited client readings",
      "PDF export",
      "Session prep view",
    ],
  },
} as const;

export type SubscriptionTier = "free" | "mirror" | "mirror_pro" | "practitioner";
