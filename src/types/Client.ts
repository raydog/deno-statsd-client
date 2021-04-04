/**
 * A generic connection to an external server. Encapsulates all the raw transport deets.
 * 
 * @private
 */
export interface Client {
  /**
   * Will push a line of data onto the pile.
   */
  write(data: Uint8Array): Promise<void>;

  /**
   * Will shut down the network layer.
   */
  close(): void;
}
