"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { StoreCartItem } from "@/lib/store/types";
import { STORE_CART_STORAGE_KEY } from "@/lib/store/utils";

type StoreCartContextValue = {
  items: StoreCartItem[];
  itemCount: number;
  eventSlug: string | null;
  eventId: string | null;
  addItem: (item: StoreCartItem) => void;
  updateQuantity: (
    productId: string,
    variantId: string | null,
    quantity: number,
  ) => void;
  removeItem: (productId: string, variantId: string | null) => void;
  clearCart: () => void;
  setEventContext: (eventId: string | null, eventSlug: string | null) => void;
};

const StoreCartContext = createContext<StoreCartContextValue | null>(null);

function readStoredCart(): StoreCartItem[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = localStorage.getItem(STORE_CART_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as { items?: StoreCartItem[] };
    return parsed.items ?? [];
  } catch {
    return [];
  }
}

function persistCart(items: StoreCartItem[]) {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem(STORE_CART_STORAGE_KEY, JSON.stringify({ items }));
}

function itemKey(productId: string, variantId: string | null) {
  return `${productId}:${variantId ?? "base"}`;
}

function withPersistedUpdate(
  updater: (prev: StoreCartItem[]) => StoreCartItem[],
): (prev: StoreCartItem[]) => StoreCartItem[] {
  return (prev) => {
    const initial = prev.length === 0 ? readStoredCart() : prev;
    const next = updater(initial);
    persistCart(next);
    return next;
  };
}

export function StoreCartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<StoreCartItem[]>([]);
  const [eventId, setEventId] = useState<string | null>(null);
  const [eventSlug, setEventSlug] = useState<string | null>(null);

  const addItem = useCallback((item: StoreCartItem) => {
    setItems(
      withPersistedUpdate((prev) => {
        const key = itemKey(item.productId, item.variantId);
        const existing = prev.find(
          (i) => itemKey(i.productId, i.variantId) === key,
        );

        if (existing) {
          return prev.map((i) =>
            itemKey(i.productId, i.variantId) === key
              ? { ...i, quantity: i.quantity + item.quantity }
              : i,
          );
        }

        return [...prev, item];
      }),
    );
  }, []);

  const updateQuantity = useCallback(
    (productId: string, variantId: string | null, quantity: number) => {
      setItems(
        withPersistedUpdate((prev) => {
          if (quantity <= 0) {
            return prev.filter(
              (i) =>
                itemKey(i.productId, i.variantId) !== itemKey(productId, variantId),
            );
          }

          return prev.map((i) =>
            itemKey(i.productId, i.variantId) === itemKey(productId, variantId)
              ? { ...i, quantity }
              : i,
          );
        }),
      );
    },
    [],
  );

  const removeItem = useCallback((productId: string, variantId: string | null) => {
    setItems(
      withPersistedUpdate((prev) =>
        prev.filter(
          (i) => itemKey(i.productId, i.variantId) !== itemKey(productId, variantId),
        ),
      ),
    );
  }, []);

  const clearCart = useCallback(() => {
    persistCart([]);
    setItems([]);
  }, []);

  const setEventContext = useCallback(
    (nextEventId: string | null, nextEventSlug: string | null) => {
      setEventId(nextEventId);
      setEventSlug(nextEventSlug);
    },
    [],
  );

  const value = useMemo(
    () => ({
      items,
      itemCount: items.reduce((sum, i) => sum + i.quantity, 0),
      eventSlug,
      eventId,
      addItem,
      updateQuantity,
      removeItem,
      clearCart,
      setEventContext,
    }),
    [
      items,
      eventSlug,
      eventId,
      addItem,
      updateQuantity,
      removeItem,
      clearCart,
      setEventContext,
    ],
  );

  return (
    <StoreCartContext.Provider value={value}>{children}</StoreCartContext.Provider>
  );
}

export function useStoreCart() {
  const ctx = useContext(StoreCartContext);
  if (!ctx) {
    throw new Error("useStoreCart debe usarse dentro de StoreCartProvider");
  }
  return ctx;
}
