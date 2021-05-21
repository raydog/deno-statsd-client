/**
 * A generic connection to an external server. Encapsulates all the raw transport deets.
 *
 * @private
 */
export interface Client {
  /**
   * Throw a new metric onto the pile.
   */
  queueData(metric: string): void;

  /**
   * Will shut down the network layer.
   */
  close(): Promise<void>;
}
