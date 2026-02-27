import type { TriggerConfig } from "@trigger.dev/sdk/v3";

const config: TriggerConfig = {
  project: "prospecting-engine",
  runtime: "node",
  logLevel: "log",
  maxDuration: 300,
  retries: {
    enabledInDev: false,
    default: {
      maxAttempts: 3,
      minTimeoutInMs: 1000,
      maxTimeoutInMs: 10000,
      factor: 2,
    },
  },
};

export default config;
