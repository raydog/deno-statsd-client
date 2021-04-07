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

  #isShuttingDown = false;

  #timeout: number | null = null;
  #queue: string[];
  #flushPromise: Promise<void> | null = null;
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
    // Hack: if shutting down, don't accept more metrics.
    if (this.#isShuttingDown) return;
    this.#queue.push(data + "\n");

    // If this is set, we already have a flush running, so don't bother:
    if (this.#flushPromise != null) return;

    // Else, is the backlog enough to FORCE us to flush before a timeout?
    if (this.#queue.length >= this.#maxQueue) {
      this.#flushPromise = this._flushData()
        .catch((err) => {
          this.#logger.debug(`StatsD.TCP: Failed to flush: ${err.message}`);
        });

      return;
    }

    // Is there a flush scheduled?
    if (this.#timeout != null) return;

    // Else, nothing scheduled, so fire that schedule up!
    this._scheduleFlush();
  }

  private _scheduleFlush() {
    this.#timeout = setTimeout(
      () => {
        this.#flushPromise = this._flushData()
          .catch((err) => {
            this.#logger.debug(`StatsD.TCP: Failed to flush: ${err.message}`);
          });
      },
      this.#maxDelay,
    );
  }

  // Flush the metric buffer to the StatsD server:
  private async _flushData() {
    do {
      // Grab all the items that we can, and write them out.
      const items = this.#queue;
      this.#queue = [];

      // We don't need the timeout anymore:
      if (this.#timeout != null) {
        clearTimeout(this.#timeout);
        this.#timeout = null;
      }

      // Note: this method technically encodes UTF-8 whereas we want ASCII, but since we verified the strings, those
      // should be equivalent. Update this to the correct Deno approach towards ASCII encoding, once a "correct" apprach
      // exists, but until then, I just don't want to do the ASCII encoding manually... (Manually is ~4x slower)
      const buf = encoder.encode(items.join(""));
      await this._write(buf);

      // Keep flushing while there are enough items in the queue. This is because writing to a socket takes time, and
      // events *could* have crossed the maxQueue threshold again.
    } while (this.#queue.length >= this.#maxQueue);

    // At this point, we know that there are not over maxQueue items in the backlog, so we aren't flushing again.
    // However, if there are still SOME items in the queue, we need to schedule another flush, so that there isn't a
    // possiblity that they get left behind:
    if (this.#queue.length && !this.#timeout && !this.#isShuttingDown) {
      this._scheduleFlush();
    }

    // No matter what, we aren't flushing anymore:
    this.#flushPromise = null;
  }

  private async _write(data: Uint8Array): Promise<void> {
    this.#logger.debug(`StatsD.TCP: Sending ${data.byteLength} bytes of data`);

    // Note: Deno claims that write returning anything less than data.byteLength should result in an error. I haven't
    // noticed that, so I'll instead keep trying to write the full buffer:
    for (let offset = 0; offset < data.byteLength;) {
      const sub = data.subarray(offset);

      // TODO: It'd be real nice if we could enable TCP keepAlive, but Deno doesn't seem to support that yet
      if (this.#conn == null) {
        this.#logger.debug(
          `StatsD.TCP: Connecting to ${this.#opts.hostname}:${this.#opts.port}...`,
        );
        this.#conn = await this._tcpConnect();
        this.#logger.info(
          `StatsD.TCP: Connected to ${
            describeAddr(this.#conn.remoteAddr)
          } (via ${describeAddr(this.#conn.localAddr)})`,
        );
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
    if (this.#isShuttingDown) return;
    this.#isShuttingDown = true;

    this.#logger.info(`StatsD.TCP: Shutting down`);

    // If we are currently flushing, work through that:
    if (this.#flushPromise) {
      await this.#flushPromise;
    }

    // If there's still something left, flush again:
    if (this.#queue.length) {
      await this._flushData();
    }

    // Ok, we're done. If connection exists, close it out:
    if (this.#conn) {
      this.#conn.close();
      this.#conn = null;
    }
  }

  private async _tcpConnect(): Promise<Deno.Conn> {
    for (const retryMs of exponentialBackoff()) {
      try {
        return await Deno.connect(this.#opts);
      } catch (ex) {
        this.#logger.error(
          `StatsD.TCP: Failed to connect: write: ${ex.message}. Retrying in ${retryMs /
            1000} sec`,
        );
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
