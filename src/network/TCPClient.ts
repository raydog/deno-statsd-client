import { Client } from "../types/Client.ts";
import { StatsDError } from "../StatsDError.ts";
import { exponentialBackoff } from "../utils/exponentialBackoff.ts";
import { log } from "../../deps.ts";
import { describeAddr } from "../utils/describeAddr.ts";

const encoder: TextEncoder = new TextEncoder();

/**
 * Client used to send data over TCP.
 * 
 * @private
 */
export class TCPClient implements Client {
  #opts: Deno.ConnectOptions;

  #maxQueue: number;
  #maxDelay: number;
  #conn: Deno.Conn | null = null;

  #timeout: number | null = null;
  #queue: string[];
  #isFlushing = false;

  #logger = log.getLogger("statsd");

  // Simple constructor:
  constructor(host: string, port: number, maxQueue: number, maxDelay: number) {
    this.#opts = {
      transport: "tcp",
      hostname: host,
      port: port,
    };

    this.#maxQueue = maxQueue;
    this.#maxDelay = maxDelay;
    this.#queue = [];
  }

  // Pushes a metric line to be written. Doesn't IMMEDIATELY write:
  queueData(data: string) {
    this.#queue.push(data + "\n");

    // If this is set, we already have a flush queued, so don't bother:
    if (this.#isFlushing) return;

    // Else, is the backlog enough to FORCE us to flush before a timeout?
    if (this.#queue.length >= this.#maxQueue) {
      // console.log("TRIGGER: MAX Q");
      this._flushData()
        .catch((err) => console.log(err.message));
      return;
    }

    // Is there a flush scheduled?
    if (this.#timeout != null) return;

    // console.log("SET TIMEOUT");

    // Else, nothing scheduled, so fire that schedule up!
    this.#timeout = setTimeout(
      () => {
        // console.log("TRIGGER: TIMER");
        this._flushData()
          .catch((err) => console.log(err.message));
      },
      this.#maxDelay,
    );
  }

  // Flush the metric buffer to the StatsD server:
  private async _flushData() {
    this.#isFlushing = true;
    // console.log("START FLUSH");

    do {
      // Grab all the items that we can, and write them out.
      const items = this.#queue;
      this.#queue = [];

      // We don't need the timeout anymore:
      if (this.#timeout != null) {
        // console.log("  CLEAR TIMEOUT");
        clearTimeout(this.#timeout);
        this.#timeout = null;
      }

      // Note: this method technically encodes UTF-8 whereas we want ASCII, but since we verified the strings, those
      // should be equivalent. Update this to the correct Deno approach towards ASCII encoding, once a "correct" apprach
      // exists, but until then, I just don't want to do the ASCII encoding manually... (Manually is ~4x slower)
      const buf = encoder.encode(items.join(""));
      // console.log("  FLUSHING %d metrics", items.length);
      await this._write(buf);

      // Keep flushing while there are enough items in the queue. This is because writing to a socket takes time, and
      // events *could* have crossed the maxQueue threshold again.
    } while (this.#queue.length >= this.#maxQueue);

    // console.log("END FLUSH");
    this.#isFlushing = false;
  }

  private async _write(data: Uint8Array): Promise<void> {
    this.#logger.debug(`StatsD.TCP: Sending ${data.byteLength} bytes of data`);

    // Note: Deno claims that write returning anything less than data.byteLength should result in an error. I haven't
    // noticed that, so I'll instead keep trying to write the full buffer:
    for (let offset = 0; offset < data.byteLength;) {
      const sub = data.subarray(offset);

      // TODO: It'd be real nice if we could enable TCP keepAlive, but Deno doesn't seem to support that yet
      if (this.#conn == null) {
        this.#logger.debug(`StatsD.TCP: Connecting to ${this.#opts.hostname}:${this.#opts.port}...`);
        this.#conn = await this._tcpConnect();
        this.#logger.info(`StatsD.TCP: Connected to ${describeAddr(this.#conn.remoteAddr)} (via ${describeAddr(this.#conn.localAddr)})`);
      }

      try {
        const num = await this.#conn.write(sub);
        if (num < 0) {
          throw new StatsDError("Failed to write?");
        }
        offset += num;

      } catch (ex) {
        // Failed to write. Attempt to reconnect, and try again.
        // TODO: Is it safe to retry on the same chunk? Maybe advance to next metric in the chunk?
        this.#logger.error(`StatsD.TCP: Failed to write: ${ex.message}`);
        this.#conn.close();
        this.#conn = null;
      }
    }
  }

  async close() {
    if (!this.#conn) return;
    this.#logger.info(`StatsD.TCP: Shutting down`);
    // TODO: make safe?
    await this._flushData();
    this.#conn.close();
  }

  private async _tcpConnect(): Promise<Deno.Conn> {
    for (const retryMs of exponentialBackoff()) {
      try {
        return await Deno.connect(this.#opts);
      } catch (ex) {
        this.#logger.error(`StatsD.TCP: Failed to connect: write: ${ex.message}. Retrying in ${retryMs/1000} sec`);
        await _sleep(retryMs);
      }
    }
    // @ts-expect-error - Typescript doesn't understand 'never' types in generator returns:
    return null;
  }
}

function _sleep(ms: number): Promise<void> {
  return new Promise((res) => setTimeout(res, ms));
}
