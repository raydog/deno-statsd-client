/**
 * Describes the given Deno address. Used for logging.
 * 
 * @private
 * @param addr 
 * @returns 
 */
export function describeAddr(
  addr: Deno.Addr | Deno.ConnectOptions | Deno.UnixConnectOptions,
): string {
  switch (addr.transport) {
    case undefined:
    case "udp":
    case "tcp":
      return `${addr.hostname}:${addr.port} (${addr.transport ?? "tcp"})`;

    case "unix":
    case "unixpacket":
      return `${addr.path} (${addr.transport})`;
  }
}
