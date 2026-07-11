"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
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

const CART_CHANGE_EVENT = "australe-store-cart-change";
const EMPTY_CART: StoreCartItem[] = [];

let cartSnapshotCache: {
  raw: string | null;
  items: StoreCartItem[];
} = { raw: null, items: [] };

function parseStoredCart(raw: string | null): StoreCartItem[] {
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as { items?: StoreCartItem[] };
    return parsed.items ?? [];
  } catch {
    return [];
  }
}

function getCartSnapshot(): StoreCartItem[] {
  if (typeof window === "undefined") {
    return [];
  }

  const raw = localStorage.getItem(STORE_CART_STORAGE_KEY);
  if (raw === cartSnapshotCache.raw) {
    return cartSnapshotCache.items;
  }

  const items = parseStoredCart(raw);
  cartSnapshotCache = { raw, items };
  return items;
}

function readStoredCart(): StoreCartItem[] {
  return getCartSnapshot();
}

function persistCart(items: StoreCartItem[]) {
  if (typeof window === "undefined") {
    return;
  }

  const raw = JSON.stringify({ items });
  localStorage.setItem(STORE_CART_STORAGE_KEY, raw);
  cartSnapshotCache = { raw, items };
  window.dispatchEvent(new Event(CART_CHANGE_EVENT));
}

function subscribeToCart(onStoreChange: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  const onStorage = (event: StorageEvent) => {
    if (event.key === STORE_CART_STORAGE_KEY) {
      onStoreChange();
    }
  };

  window.addEventListener(CART_CHANGE_EVENT, onStoreChange);
  window.addEventListener("storage", onStorage);

  return () => {
    window.removeEventListener(CART_CHANGE_EVENT, onStoreChange);
    window.removeEventListener("storage", onStorage);
  };
}

function itemKey(productId: string, variantId: string | null) {
  return `${productId}:${variantId ?? "base"}`;
}

export function StoreCartProvider({ children }: { children: ReactNode }) {
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const items = useSyncExternalStore(
    subscribeToCart,
    () => (mounted ? getCartSnapshot() : EMPTY_CART),
    () => EMPTY_CART,
  );
  const [eventId, setEventId] = useState<string | null>(null);
  const [eventSlug, setEventSlug] = useState<string | null>(null);

  const addItem = useCallback((item: StoreCartItem) => {
    const prev = readStoredCart();
    const key = itemKey(item.productId, item.variantId);
    const existing = prev.find(
      (i) => itemKey(i.productId, i.variantId) === key,
    );

    const next = existing
      ? prev.map((i) =>
          itemKey(i.productId, i.variantId) === key
            ? { ...i, quantity: i.quantity + item.quantity }
            : i,
        )
      : [...prev, item];

    persistCart(next);
  }, []);

  const updateQuantity = useCallback(
    (productId: string, variantId: string | null, quantity: number) => {
      const prev = readStoredCart();
      const next =
        quantity <= 0
          ? prev.filter(
              (i) =>
                itemKey(i.productId, i.variantId) !==
                itemKey(productId, variantId),
            )
          : prev.map((i) =>
              itemKey(i.productId, i.variantId) ===
              itemKey(productId, variantId)
                ? { ...i, quantity }
                : i,
            );

      persistCart(next);
    },
    [],
  );

  const removeItem = useCallback((productId: string, variantId: string | null) => {
    const prev = readStoredCart();
    persistCart(
      prev.filter(
        (i) =>
          itemKey(i.productId, i.variantId) !== itemKey(productId, variantId),
      ),
    );
  }, []);

  const clearCart = useCallback(() => {
    persistCart([]);
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
