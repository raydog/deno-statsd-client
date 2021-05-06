import { Client } from "../types/Client.ts";
import { Logger } from "../types/Logger.ts";

/**
 * Client that only delivers packets to the log.
 * 
 * @private
 */
export class LoggerClient implements Client {
  #isClosed = false;

  #logger: Logger;

  constructor({ logger }: { logger: Logger }) {
    this.#logger = logger;
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
