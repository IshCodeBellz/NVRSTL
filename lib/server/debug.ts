export function debug(tag: string, ...args: unknown[]) {
  if (process.env.TEST_DEBUG === "1") {
    // eslint-disable-next-line no-console
    console.log(`[${tag}]`, ...args);
  }
}
