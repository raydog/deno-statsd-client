/**
 * Tags are key-value pairs that are appended to each metric.
 * 
 * Useful for storing things like hostname or deployment names alongside metrics, to differentiate them.
 */
export type Tags = { [key: string]: string };
