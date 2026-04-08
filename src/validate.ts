import { InvalidArgumentError } from "commander";

export function parsePositiveInt(value: string): number {
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) {
    throw new InvalidArgumentError(`"${value}" is not a positive integer.`);
  }
  return n;
}
