export type LibConfig = {
  
  /**
   * Information on how to connect to a Server.
   */
  server?: UDPConfig,
  
  /**
   * The Maximum Transmission Unit for the network connection.
   * 
   * We use this number when figuring out the maximum amount of data that we can send in a single network packet. A
   * smaller number means more packets will have to be sent, but if we set this value _TOO_ high, it might mean that
   * packets won't arrive.
   * 
   * The default value of 1500 bytes is usually safe enough for most server networks. Fancy networks that have Jumbo
   * frames enabled might be able to bump this value higher, like to 9000 bytes, but worse networks (like if these
   * packets are routed through the wider internet) might need to reduce the MTU to 512.
   */
  mtu?: number,

  /**
   * The sampling rate we'll use for metrics. This should be a value between 0 and 1, inclusive.
   * 
   * For example, if this value is set to 0.1, then 1 out of 10 calls to .count() will actually result in a counter
   * being increased. HOWEVER, it will be increased by 10x the amount it normally would have been increased. This will
   * result in less data being sent, and the values will be MOSTLY the same, but graphs may ultimately be a little more
   * erratic.
   * 
   * Default value is 1. (So no random sampling)
   */
  sampling?: number,
  
  /**
   * When we get a metric to send, we'll wait (at most) this number of milliseconds before sending. We may decide to
   * send the data sooner, if the total amount of batched data exceeds the MTU size.
   * 
   * Default value is 1000. (1 second)
   */
  maxDelayMs?: number,
  
  /**
   * What StatsD dialect the server speaks.
   * 
   * Default value is `Dialect.StatsD`.
   */
  dialect?: Dialect,

  /**
   * Tags are key-value pairs that are appended to each metric.
   * 
   * Default value is usually `{}`.
   * 
   * If the dialect is `Dialect.Datadog`, we will attempt to read the DD_ENTITY_ID env var, and assign it to the
   * "dd.internal.entity_id" tag automatically.
   */
  globalTags?: { [key: string]: string },

};

/**
 * Information to connect to a UDP StatsD server.
 */
type UDPConfig = {
  proto: "udp",

  /**
   * The server that we'll send our stats to.
   * 
   * Default value is "localhost".
   */
   host?: string,

   /**
    * The server port number that we'll connect to.
    * 
    * Default value is 8125.
    */
   port?: number,
};

export enum Dialect {
  /**
   * StatsD dialect supports the functionality present in the Etsy reference server.
   * - Histogram metrics will be sent as timing metrics.
   * - Tags will be ignored.
   */
  StatsD,

  /**
   * Datadog dialect supports feature present in the DogStatsD server.
   * - Histograms are supported.
   * - Tags are supported.
   */
  Datadog,
}


/*
Fast Ethernet (1432) - This is most likely for Intranets.
Gigabit Ethernet (8932) - Jumbo frames can make use of this feature much more efficient.
Commodity Internet (512) - If you are routing over the internet a value in this range will be reasonable. You might be able to go higher, but you are at the mercy of all the hops in your route.
*/
