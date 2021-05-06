/**
 * Logger defines a logging type that can be injected into the library to enable logging. The API defined is a subset of
 * the std logger's API, and should be compatible with it.
 */
export type Logger = {
  debug: (msg: string) => unknown;
  info: (msg: string) => unknown;
  warning: (msg: string) => unknown;
  error: (msg: string) => unknown;
};
