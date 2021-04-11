import { Client } from "../types/Client.ts";
import { log } from "../../deps.ts";

/**
 * Client that only delivers packets to the log.
 * 
 * @private
 */
export class LoggerClient implements Client {
  #isClosed = false;

  #logger = log.getLogger("statsd");

  constructor() {
  }

  queueData(data: string) {
    if (this.#isClosed) return;
    this.#logger.info(`StatsD.Logger: ${data}`);
  }

  // deno-lint-ignore require-await
  async close() {
    this.#isClosed = true;
  }
}
