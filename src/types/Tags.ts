/**
 * Tags are key-value annotations that can be attached to metrics. Useful for storing things like hostname or deployment
 * names alongside metrics, to differentiate them.
 * 
 * Tags can either be a `"key": "value"` (where they are sent as "key:value" over-the-wire) or they can be `"key": true`
 * pairs (where they are simply sent as "key".)
 * 
 * If the tag value is either "" or `false`, we won't send that key.
 * 
 * @example
 *   // Sent as "debug,hostname:localhost,region:us-east-1":
 *   {
 *     debug: true,
 *     hostname: "localhost",
 *     region: "us-east-1",
 *   }
 */
export type Tags = {
  [key: string]: string | boolean;
};
