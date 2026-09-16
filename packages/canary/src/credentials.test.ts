import { describe, expect, it } from "vitest";
import { loadCredentialsFromEnv } from "./credentials.js";

const FULL_ENV = {
  BITGET_DEMO_CONTROL_API_KEY: "control-key-abc",
  BITGET_DEMO_CONTROL_API_SECRET: "control-secret-def",
  BITGET_DEMO_CONTROL_API_PASSPHRASE: "control-pass-ghi",
  BITGET_DEMO_SHIELDED_API_KEY: "shielded-key-jkl",
  BITGET_DEMO_SHIELDED_API_SECRET: "shielded-secret-mno",
  BITGET_DEMO_SHIELDED_API_PASSPHRASE: "shielded-pass-pqr",
};

describe("loadCredentialsFromEnv", () => {
  it("loads both real credential sets from a complete environment", () => {
    const creds = loadCredentialsFromEnv(FULL_ENV);
    expect(creds.control).toEqual({
      apiKey: "control-key-abc",
      apiSecret: "control-secret-def",
      passphrase: "control-pass-ghi",
    });
    expect(creds.shielded).toEqual({
      apiKey: "shielded-key-jkl",
      apiSecret: "shielded-secret-mno",
      passphrase: "shielded-pass-pqr",
    });
  });

  it("throws naming every missing variable when the environment is empty", () => {
    expect(() => loadCredentialsFromEnv({})).toThrowError(
      /BITGET_DEMO_CONTROL_API_KEY.*BITGET_DEMO_CONTROL_API_SECRET.*BITGET_DEMO_CONTROL_API_PASSPHRASE.*BITGET_DEMO_SHIELDED_API_KEY.*BITGET_DEMO_SHIELDED_API_SECRET.*BITGET_DEMO_SHIELDED_API_PASSPHRASE/s,
    );
  });

  it("throws naming exactly the missing subset when only some vars are set", () => {
    const partial = { ...FULL_ENV };
    delete (partial as Record<string, string | undefined>).BITGET_DEMO_SHIELDED_API_SECRET;

    let message = "";
    try {
      loadCredentialsFromEnv(partial);
      throw new Error("expected loadCredentialsFromEnv to throw");
    } catch (err) {
      message = err instanceof Error ? err.message : String(err);
    }

    expect(message).toContain("BITGET_DEMO_SHIELDED_API_SECRET");
    expect(message).not.toContain("BITGET_DEMO_CONTROL_API_KEY");
  });

  it("never includes a credential value in the thrown error text, even on partial config", () => {
    const partial = { ...FULL_ENV };
    delete (partial as Record<string, string | undefined>).BITGET_DEMO_SHIELDED_API_SECRET;

    try {
      loadCredentialsFromEnv(partial);
      throw new Error("expected loadCredentialsFromEnv to throw");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      for (const value of Object.values(FULL_ENV)) {
        expect(message).not.toContain(value);
      }
    }
  });
});
