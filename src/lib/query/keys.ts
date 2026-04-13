export const queryKeys = {
  auth: {
    session: ["auth", "session"] as const,
  },
  products: {
    all: ["products"] as const,
    detail: (productId: string) => ["products", productId] as const,
  },
  cart: {
    all: ["cart"] as const,
  },
};
