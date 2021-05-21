import { Client } from "../types/Client.ts";
import { StatsDError } from "../StatsDError.ts";
import { Logger } from "../types/Logger.ts";
import { describeAddr } from "../utils/describeAddr.ts";

const encoder: TextEncoder = new TextEncoder();

type ConstructorOpts = {
  host: string;
  port: number;
  mtu: number;
  maxDelay: number;
  logger: Logger;
};

/**
 * Client used to send data over UDP.
 *
 * @private
 */
export class UDPClient implements Client {
  #addr: Deno.NetAddr;
  #conn: Deno.DatagramConn;

  #isShuttingDown = false;
  #mtu: number;
  #maxDelay: number;

  #timeout: number | null = null;
  #buffer: Uint8Array;
  #idx = 0;

  #logger: Logger;

  // Simple constructor:
  constructor({ host, port, mtu, maxDelay, logger }: ConstructorOpts) {
    this.#addr = {
      transport: "udp",
      hostname: host,
      port: port,
    };
    this.#conn = _connectUDP();
    this.#logger = logger;
    this.#logger.info(
      `StatsD.UDP: Connected via ${describeAddr(this.#conn.addr)}`,
    );

    this.#mtu = mtu;
    this.#maxDelay = maxDelay;
    this.#buffer = new Uint8Array(this.#mtu);
  }

  // Pushes a metric line to be written. Doesn't IMMEDIATELY write:
  queueData(data: string) {
    if (this.#isShuttingDown) return;
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
          (err) => {
            this.#logger.error(`StatsD.UDP: Write error: ${err.message}`);
          },
        );
    }
  }

  private async _write(data: Uint8Array): Promise<void> {
    const num = await this.#conn.send(data, this.#addr);

    this.#logger.debug(
      `StatsD.UDP: Sending ${data.byteLength}-byte packet to ${
        describeAddr(this.#addr)
      }`,
    );

    if (num < 0) {
      throw new StatsDError("Datagram rejected by kernel.");
    }
  }

  async close() {
    if (this.#isShuttingDown) return;
    this.#isShuttingDown = true;

    this.#logger.info(`StatsD.UDP: Shutting down`);

    await this._flushData();
    this.#conn.close();
  }
}

function _connectUDP(): Deno.DatagramConn {
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
