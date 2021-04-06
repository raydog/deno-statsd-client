import { Client } from "../types/Client.ts";
import { StatsDError } from "../StatsDError.ts";
import { exponentialBackoff } from "../utils/exponentialBackoff.ts";

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
    // Note: Deno claims that write returning anything less than data.byteLength should result in an error. I haven't
    // noticed that, so I'll instead keep trying to write the full buffer:
    for (let offset = 0; offset < data.byteLength;) {
      const sub = data.subarray(offset);

      // TODO: It'd be real nice if we could enable TCP keepAlive, but Deno doesn't seem to support that yet
      if (this.#conn == null) {
        this.#conn = await _tcpConnect(this.#opts);
      }

      try {
        const num = await this.#conn.write(sub);
        // console.log("  WROTE", num, "OF", sub.byteLength);

        if (num < 0) {
          throw new StatsDError("Failed to write?");
        }
        offset += num;
      } catch (ex) {
        // Failed to write. Attempt to reconnect, and try again.
        // TODO: Is it safe to retry on the same chunk? Maybe advance to next metric in the chunk?
        // console.log("Write Error:", ex.message);
        this.#conn.close();
        this.#conn = null;
      }
    }

    // TODO: Catch errors, and attempt to connect again. Maybe resend on safe errors?

    // console.log("<".repeat(60));
    // console.log(new TextDecoder().decode(data));
    // console.log(">".repeat(60));
  }

  async close() {
    if (!this.#conn) return;
    // TODO: make safe?
    await this._flushData();
    this.#conn.close();
  }
}

async function _tcpConnect(opts: Deno.ConnectOptions): Promise<Deno.Conn> {
  for (const retryMs of exponentialBackoff()) {
    try {
      return await Deno.connect(opts);
    } catch (ex) {
      // console.log("Connect Error:", ex.message);
      await _sleep(retryMs);
    }
  }
  // @ts-expect-error - Typescript doesn't understand 'never' types in generator returns:
  return null;
}

function _sleep(ms: number): Promise<void> {
  return new Promise((res) => setTimeout(res, ms));
}
