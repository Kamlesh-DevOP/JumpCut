export const logger = {
  info(message) {
    process.stdout.write(`${message}\n`);
  },
  error(error) {
    const message = error instanceof Error ? error.stack ?? error.message : String(error);
    process.stderr.write(`${message}\n`);
  }
};
