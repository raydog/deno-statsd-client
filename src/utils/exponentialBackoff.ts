const MAX_EXPONENT = 6; // 64 sec

/**
 * Generator that yields millisecond delays for us to retry network connections.
 *
 * Based on the Google IoT algorithm: We'll wait 1, 2, 4, 8, 16... seconds, following powers of 2. We cap the
 * progression at some point, so we don't end up waiting days to reconnect, and each value has a random number of
 * milliseconds added, to reduce problematic reconnect swarms.
 */
export function* exponentialBackoff(): Generator<number, never, void> {
  for (let i = 0; i < MAX_EXPONENT; i++) {
    yield (2 ** i) * 1000 + _randMilliseconds();
  }

  // We've reached the max exponent, but we're still asking for values. We must still be retrying, so keep repeating
  // the last exponent (with random fuzz) forever:
  while (true) {
    yield (2 ** MAX_EXPONENT) * 1000 + _randMilliseconds();
  }
}

function _randMilliseconds(): number {
  return Math.floor(Math.random() * 1000);
}
