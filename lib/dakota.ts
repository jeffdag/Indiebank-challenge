import { DakotaClient, Environment } from "@dakota-xyz/ts-sdk";

let _dakota: DakotaClient | null = null;

export function getDakotaClient(): DakotaClient {
  if (!_dakota) {
    if (!process.env.DAKOTA_API_KEY) {
      throw new Error("DAKOTA_API_KEY environment variable is required");
    }
    _dakota = new DakotaClient({
      apiKey: process.env.DAKOTA_API_KEY,
      environment: Environment.Sandbox,
    });
  }
  return _dakota;
}

// For convenience, export a getter that can be used in server components
export const dakota = {
  get client() {
    return getDakotaClient();
  },
};
