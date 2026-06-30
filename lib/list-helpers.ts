/**
 * Bounded pagination helpers.
 *
 * Dakota's SDK iterators paginate through every page by default. For demo
 * views we only ever render the most recent N items, so paginating beyond
 * the first page wastes seconds of round-trip latency. These helpers cap
 * the read at N items and bail.
 */

import type { PaginatedIterator } from "@dakota-xyz/ts-sdk";

/**
 * Drain at most `n` items from the iterator. Stops fetching pages as soon
 * as we've collected `n`. Use this whenever the UI only displays a fixed
 * top-N (recent transactions, top recipients, etc).
 */
export async function takeAtMost<T>(
  iter: PaginatedIterator<T>,
  n: number
): Promise<T[]> {
  const out: T[] = [];
  for await (const item of iter) {
    out.push(item);
    if (out.length >= n) break;
  }
  return out;
}
