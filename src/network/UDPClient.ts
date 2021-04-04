import { Client } from "../types/Client.ts";
import { StatsDError } from "../StatsDError.ts";


/**
 * Client used to send data over UDP.
 * 
 * @private
 */
export class UDPClient implements Client {

  #addr: Deno.NetAddr;
  #conn: Deno.DatagramConn | null = null;

  // Simple constructor:
  constructor (host: string, port: number) {
    this.#addr = {
      transport: "udp",
      hostname: host,
      port: port,
    }
    this.connect();
  }

  /**
   * Attempt to connect to the correct server. Does nothing if already connected.
   * The raw Datagram connection is returned, to avoid TS nullability issues.
   */
  private connect(): Deno.DatagramConn {
    if (!Deno.listenDatagram) {
      throw new StatsDError("Cannot connect to UDP. Try enabling unstable APIs with '--unstable'");
    }
    if (this.#conn) {
      // Already connected
      return this.#conn;
    }
    return this.#conn = Deno.listenDatagram({
      hostname: "0.0.0.0", // << Unrouteable
      port: 0,             // << Whatever port
      transport: "udp"
    });
  }

  async write(data: Uint8Array): Promise<void> {
    const conn = this.connect();
    const num = await conn.send(data, this.#addr);

    console.log("<".repeat(60));
    console.log(new TextDecoder().decode(data));
    console.log(">".repeat(60));

    if (num < 0) {
      throw new StatsDError("Datagram rejected by kernel.");
    }
  }
  
  close() {
    if (!this.#conn) { return; }
    this.#conn.close();
  }
}
