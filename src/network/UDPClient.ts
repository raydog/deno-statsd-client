import { Client } from "../types/Client.ts";
import { StatsDError } from "../StatsDError.ts";

const encoder: TextEncoder = new TextEncoder();

/**
 * Client used to send data over UDP.
 * 
 * @private
 */
export class UDPClient implements Client {
  #addr: Deno.NetAddr;
  #conn: Deno.DatagramConn;

  #mtu: number;
  #maxDelay: number;

  #timeout: number | null = null;
  #buffer: Uint8Array;
  #idx = 0;

  // Simple constructor:
  constructor(host: string, port: number, mtu: number, maxDelay: number) {
    this.#addr = {
      transport: "udp",
      hostname: host,
      port: port,
    };
    this.#conn = _connectUDP(this.#addr);

    this.#mtu = mtu;
    this.#maxDelay = maxDelay;
    this.#buffer = new Uint8Array(this.#mtu);
  }

  // Pushes a metric line to be written. Doesn't IMMEDIATELY write:
  queueData(data: string) {
    const pre = this.#idx ? "\n" : "";
    let enc = encoder.encode(pre + data);
    const buflen = this.#buffer.byteLength;

    if (enc.byteLength > this.#buffer.byteLength) {
      throw new StatsDError(
        `Metric is too large for this MTU: ${enc.byteLength} > ${buflen}`,
      );
    }

    if (this.#idx + enc.byteLength > buflen) {
      this._flushData();
      enc = enc.subarray(1); // Don't need the \n anymore
    }

    this.#buffer.set(enc, this.#idx);
    this.#idx += enc.byteLength;

    // Set flush timeout.
    if (!this.#timeout) {
      // TODO: maxDelay == 0 is an immediate send?
      this.#timeout = setTimeout(
        () => this._flushData(),
        this.#maxDelay,
      );
    }
  }

  // Flush the metric buffer to the StatsD server:
  private async _flushData() {
    if (this.#timeout != null) {
      clearTimeout(this.#timeout);
      this.#timeout = null;
    }
    if (this.#idx) {
      const region = this.#buffer.subarray(0, this.#idx);
      this.#buffer = new Uint8Array(this.#mtu);
      this.#idx = 0;
      await this._write(region)
        .catch(
          // TODO: Somehow pass async errors back through the main library
          (err) => console.log("FAIL", err.message),
        );
    }
  }

  private async _write(data: Uint8Array): Promise<void> {
    const num = await this.#conn.send(data, this.#addr);

    // console.log("<".repeat(60));
    // console.log(new TextDecoder().decode(data));
    // console.log(">".repeat(60));

    if (num < 0) {
      throw new StatsDError("Datagram rejected by kernel.");
    }
  }

  async close() {
    if (!this.#conn) return;
    await this._flushData();
    this.#conn.close();
  }
}

function _connectUDP(addr: Deno.NetAddr): Deno.DatagramConn {
  if (!Deno.listenDatagram) {
    throw new StatsDError(
      "Cannot connect to UDP. Try enabling unstable APIs with '--unstable'",
    );
  }
  return Deno.listenDatagram({
    hostname: "127.0.0.1", // << Only localhost
    port: 0, // << Whatever port
    transport: "udp",
  });
}
