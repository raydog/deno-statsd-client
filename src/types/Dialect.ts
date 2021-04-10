import { Tags } from "./Tags.ts";

/**
 * Abstraction to handle the different ways servers validate datatypes:
 */
export interface Dialect {
  assertValidMetricKey(key: string): void;
  assertValidSignedFloat(val: number): void;
  assertValidPositiveFloat(val: number): void;
  assertValidTags(tags: Tags): void;

  assertSupportsHistogram(): void;
  assertSupportsDistribution(): void;
}
