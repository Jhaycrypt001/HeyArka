/**
 * Credential loading for the Bitget Demo (paper trading) REST API.
 *
 * Hard constraint, non-negotiable: this package must never be able to place
 * a live order. Credentials are read from environment variables only — never
 * hardcoded, never written to a log, never included in an error message or
 * an audit event. Two independent key sets are required (control + shield)
 * so the A/B comparison is between two real accounts, not two code paths
 * sharing one balance.
 */

export interface BitgetCredentials {
  apiKey: string;
  apiSecret: string;
  passphrase: string;
}

export interface CanaryCredentials {
  control: BitgetCredentials;
  shielded: BitgetCredentials;
}

const REQUIRED_VARS = [
  "BITGET_DEMO_CONTROL_API_KEY",
  "BITGET_DEMO_CONTROL_API_SECRET",
  "BITGET_DEMO_CONTROL_API_PASSPHRASE",
  "BITGET_DEMO_SHIELDED_API_KEY",
  "BITGET_DEMO_SHIELDED_API_SECRET",
  "BITGET_DEMO_SHIELDED_API_PASSPHRASE",
] as const;

/**
 * Reads and validates both credential sets from the environment. Throws with
 * the names of whichever vars are missing — never with their values — so a
 * misconfigured environment fails loudly before any network call is made.
 */
export function loadCredentialsFromEnv(env: NodeJS.ProcessEnv = process.env): CanaryCredentials {
  const missing = REQUIRED_VARS.filter((name) => !env[name]);
  if (missing.length > 0) {
    throw new Error(
      `Missing required Bitget Demo credential environment variable(s): ${missing.join(", ")}. ` +
        `The canary requires two independent Demo API key sets (control + shielded) so the A/B ` +
        `comparison is between two real paper-trading accounts. See README for setup.`,
    );
  }

  return {
    control: {
      apiKey: env.BITGET_DEMO_CONTROL_API_KEY as string,
      apiSecret: env.BITGET_DEMO_CONTROL_API_SECRET as string,
      passphrase: env.BITGET_DEMO_CONTROL_API_PASSPHRASE as string,
    },
    shielded: {
      apiKey: env.BITGET_DEMO_SHIELDED_API_KEY as string,
      apiSecret: env.BITGET_DEMO_SHIELDED_API_SECRET as string,
      passphrase: env.BITGET_DEMO_SHIELDED_API_PASSPHRASE as string,
    },
  };
}
