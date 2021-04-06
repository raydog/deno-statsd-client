import { asserts } from "../../testDeps.ts";
import { StatsDError } from "../StatsDError.ts";
import { exponentialBackoff } from "./exponentialBackoff.ts";

Deno.test("exponentialBackoff produces ok values", () => {
  const exp = exponentialBackoff();
  const res = [];
  for (let i = 0; i < 10; i++) {
    const { value } = exp.next();
    res.push(Math.floor(value / 1000));
  }
  asserts.assertEquals(res, [1, 2, 4, 8, 16, 32, 64, 64, 64, 64]);
});
