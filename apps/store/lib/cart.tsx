"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { Product } from "@/lib/products";

export interface CartItem {
  product: Product;
  variantIndex: number;
  quantity: number;
  grindSize?: string;
}

interface CartContextValue {
  items: CartItem[];
  addToCart: (product: Product, variantIndex?: number, qty?: number, grindSize?: string) => void;
  removeFromCart: (productId: string, variantIndex: number) => void;
  updateQty: (productId: string, variantIndex: number, qty: number) => void;
  clearCart: () => void;
  totalItems: number;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("gc_cart");
      if (stored) setItems(JSON.parse(stored));
    } catch {}
  }, []);

  const persist = (next: CartItem[]) => {
    setItems(next);
    localStorage.setItem("gc_cart", JSON.stringify(next));
  };

  const addToCart = (product: Product, variantIndex = 0, qty = 1, grindSize?: string) => {
    setItems((prev) => {
      const total = prev.reduce((s, i) => s + i.quantity, 0);
      if (total >= 20) return prev;
      const allowed = Math.min(qty, 20 - total);
      const idx = prev.findIndex(
        (i) => i.product.id === product.id && i.variantIndex === variantIndex && i.grindSize === grindSize
      );
      const next =
        idx >= 0
          ? prev.map((i, n) =>
              n === idx ? { ...i, quantity: i.quantity + allowed } : i
            )
          : [...prev, { product, variantIndex, quantity: allowed, grindSize }];
      localStorage.setItem("gc_cart", JSON.stringify(next));
      return next;
    });
  };

  const removeFromCart = (productId: string, variantIndex: number) =>
    persist(
      items.filter(
        (i) => !(i.product.id === productId && i.variantIndex === variantIndex)
      )
    );

  const updateQty = (productId: string, variantIndex: number, qty: number) => {
    if (qty <= 0) return removeFromCart(productId, variantIndex);
    const otherTotal = items
      .filter((i) => !(i.product.id === productId && i.variantIndex === variantIndex))
      .reduce((s, i) => s + i.quantity, 0);
    const capped = Math.min(qty, 20 - otherTotal);
    persist(
      items.map((i) =>
        i.product.id === productId && i.variantIndex === variantIndex
          ? { ...i, quantity: capped }
          : i
      )
    );
  };

  const clearCart = () => persist([]);

  const totalItems = items.reduce((s, i) => s + i.quantity, 0);

  return (
    <CartContext.Provider
      value={{ items, addToCart, removeFromCart, updateQty, clearCart, totalItems }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
