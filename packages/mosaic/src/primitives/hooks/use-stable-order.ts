'use client';

import { useMemo, useRef } from 'react';

function sameOrder(a: string[], b: string[]) {
  return a.length === b.length && a.every((key, index) => key === b[index]);
}

/**
 * Keeps items in the order they were first seen: a new item is appended, a removed item drops
 * out, and an item that moves in `items` stays where it was. The order given on the first
 * render is the one kept.
 */
export function useStableOrder<T>(items: T[], getKey: (item: T) => string): T[] {
  const keys = items.map(getKey);
  const order = useRef<string[] | null>(null);
  const kept = order.current ?? keys;
  const current = new Set(keys);
  const next = [...kept.filter(key => current.has(key)), ...keys.filter(key => !kept.includes(key))];
  if (order.current === null || !sameOrder(order.current, next)) {
    order.current = next;
  }
  const ordered = order.current;

  return useMemo(() => {
    const byKey = new Map(items.map(item => [getKey(item), item]));
    return ordered.flatMap(key => {
      const item = byKey.get(key);
      return item === undefined ? [] : [item];
    });
  }, [items, getKey, ordered]);
}
