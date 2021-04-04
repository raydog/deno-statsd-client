export type MetricOpts = {
  /**
   * The sampling rate we'll use for metrics. This should be a value between 0 and 1, inclusive.
   * 
   * For example, if this value is set to 0.1, then 1 out of 10 calls to .count() will actually result in a counter
   * being sent to the server. HOWEVER, the server will then increase the counter by 10x the amount it normally would
   * have been increased. This will result in less data being sent over the wire, but with mostly the same ending
   * values. (Albeit with a bit more error.)
   */
  sampleRate?: number;

  /**
   * Tags are key-value pairs that are appended to each metric.
   */
  tags?: { [key: string]: string };
};
