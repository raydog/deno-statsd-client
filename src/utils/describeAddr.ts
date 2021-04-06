/**
 * Describes the given Deno address. Used for logging.
 * 
 * @private
 * @param addr 
 * @returns 
 */
export function describeAddr(addr: Deno.Addr): string {
  switch (addr.transport) {
    case "udp":
    case "tcp":
      return `${addr.hostname}:${addr.port} (${addr.transport})`;

    case "unix":
    case "unixpacket":
      return `${addr.path} (${addr.transport})`;
  }
}
