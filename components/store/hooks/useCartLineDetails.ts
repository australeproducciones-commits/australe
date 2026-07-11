"use client";

import { useEffect, useState } from "react";
import type { StoreCartItem } from "@/lib/store/types";
import type { StoreCartLineDetail } from "@/lib/store/queries";

type CartLineRequestItem = {
  productId: string;
  variantId: string | null;
};

function parseCartItemsKey(itemsKey: string): CartLineRequestItem[] {
  if (!itemsKey) {
    return [];
  }

  return JSON.parse(itemsKey) as CartLineRequestItem[];
}

export function useCartLineDetails(items: StoreCartItem[]) {
  const [lines, setLines] = useState<StoreCartLineDetail[]>([]);
  const [fetchedKey, setFetchedKey] = useState("");
  const [error, setError] = useState(false);
  const isEmpty = items.length === 0;

  const itemsKey = JSON.stringify(
    items.map((item) => ({
      productId: item.productId,
      variantId: item.variantId,
    })),
  );

  useEffect(() => {
    if (isEmpty) {
      return;
    }

    let cancelled = false;

    fetch("/api/store/cart-lines", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: parseCartItemsKey(itemsKey),
      }),
    })
      .then(async (res) => {
        if (!res.ok) {
          throw new Error("cart-lines failed");
        }
        return res.json() as Promise<{ lines?: StoreCartLineDetail[] }>;
      })
      .then((data) => {
        if (!cancelled) {
          setLines(data.lines ?? []);
          setFetchedKey(itemsKey);
          setError(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLines([]);
          setFetchedKey(itemsKey);
          setError(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [itemsKey, isEmpty]);

  return {
    lines: isEmpty ? [] : lines,
    loading: !isEmpty && fetchedKey !== itemsKey,
    error: !isEmpty && fetchedKey === itemsKey && error,
  };
}
