import path from "node:path";

import { describe, expect, it } from "vitest";

import { EnvError, parseEnv } from "./env";

// A hash of "correct horse" (scripts/hash-password.ts).
const PASSWORD_HASH = "argon2id:m=19456,t=2,p=1:CLZW5wQoCjh3Q9CHBp_JWw:Ak2xS7TYlYYrhemlgBkVxFmWXfcMq_rjd0mJGZcZFfA";

const valid = {
  GYAANSTACK_PASSWORD: PASSWORD_HASH,
  GYAANSTACK_SECRET: "a".repeat(32),
  DATABASE_URL: "postgresql://postgres:postgres@db:5432/gyaanstack",
};

function problems(source: Record<string, string | undefined>): string[] {
  try {
    parseEnv(source);
  } catch (error) {
    if (error instanceof EnvError) return error.problems;
    throw error;
  }
  throw new Error("Expected parseEnv to throw");
}

describe("parseEnv", () => {
  it("reads GYAANSTACK_API_URL without its trailing slash, and only an http or https address", () => {
    expect(parseEnv(valid).GYAANSTACK_API_URL).toBeUndefined();
    expect(parseEnv({ ...valid, GYAANSTACK_API_URL: "http://api.localhost:3000/v1/" }).GYAANSTACK_API_URL).toBe("http://api.localhost:3000/v1");
    expect(problems({ ...valid, GYAANSTACK_API_URL: "ftp://example.com" })).toEqual(["GYAANSTACK_API_URL must be an http:// or https:// URL."]);
  });

  it("accepts the required variables and fills in defaults", () => {
    expect(parseEnv(valid)).toEqual({
      ...valid,
      GYAANSTACK_DATA_DIR: "/data",
      GYAANSTACK_BACKUP_RETENTION_DAYS: 14,
      GYAANSTACK_TELEMETRY: undefined,
    });
  });

  it("reads whether the usage ping is on", () => {
    // Unset or empty: not decided, so GyaanStack Apply asks (#172).
    expect(parseEnv({ ...valid, GYAANSTACK_TELEMETRY: "" }).GYAANSTACK_TELEMETRY).toBeUndefined();
    expect(parseEnv(valid).GYAANSTACK_TELEMETRY).toBeUndefined();
    expect(parseEnv({ ...valid, GYAANSTACK_TELEMETRY: "ON" }).GYAANSTACK_TELEMETRY).toBe("on");
    expect(parseEnv({ ...valid, GYAANSTACK_TELEMETRY: " Off " }).GYAANSTACK_TELEMETRY).toBe("off");
    expect(problems({ ...valid, GYAANSTACK_TELEMETRY: "false" })).toEqual(['GYAANSTACK_TELEMETRY must be on or off (got "false").']);
  });

  it("reads the optional variables", () => {
    const env = parseEnv({
      ...valid,
      GYAANSTACK_DATA_DIR: "/srv/dossier",
      GYAANSTACK_BACKUP_RETENTION_DAYS: "30",
      GYAANSTACK_AI_PROVIDER: "local",
      GYAANSTACK_AI_URL: "http://ollama:11434",
      GYAANSTACK_AI_MODEL: "llama3.1:8b",
      GYAANSTACK_AI_KEY: "sk-test",
    });
    expect(env).toMatchObject({
      GYAANSTACK_DATA_DIR: "/srv/dossier",
      GYAANSTACK_BACKUP_RETENTION_DAYS: 30,
      GYAANSTACK_AI_PROVIDER: "local",
      GYAANSTACK_AI_URL: "http://ollama:11434",
      GYAANSTACK_AI_MODEL: "llama3.1:8b",
      GYAANSTACK_AI_KEY: "sk-test",
    });
  });

  it("reads the AI timeout in seconds", () => {
    expect(parseEnv({ ...valid, GYAANSTACK_AI_TIMEOUT_SECONDS: " 300 " }).GYAANSTACK_AI_TIMEOUT_SECONDS).toBe(300);
    expect(() => parseEnv({ ...valid, GYAANSTACK_AI_TIMEOUT_SECONDS: "5m" })).toThrow(/whole number of seconds/);
    expect(() => parseEnv({ ...valid, GYAANSTACK_AI_TIMEOUT_SECONDS: "1" })).toThrow(/at least 5/);
  });

  it("resolves a relative data directory", () => {
    const env = parseEnv({ ...valid, GYAANSTACK_DATA_DIR: "./data" });
    expect(env.GYAANSTACK_DATA_DIR).toBe(path.resolve("data"));
  });

  it("treats empty values as unset", () => {
    const env = parseEnv({ ...valid, GYAANSTACK_AI_KEY: "", GYAANSTACK_DATA_DIR: " " });
    expect(env.GYAANSTACK_AI_KEY).toBeUndefined();
    expect(env.GYAANSTACK_DATA_DIR).toBe("/data");
    expect(problems({ ...valid, GYAANSTACK_PASSWORD: "" })).toEqual([
      expect.stringMatching(/^GYAANSTACK_PASSWORD is not set\./),
    ]);
  });

  it("names every missing required variable", () => {
    expect(problems({})).toEqual([
      expect.stringMatching(/^GYAANSTACK_PASSWORD is not set\. Set it to/),
      expect.stringMatching(/^GYAANSTACK_SECRET is not set\. .*openssl rand/),
      expect.stringMatching(/^DATABASE_URL is not set\. /),
    ]);
  });

  it("takes an SQLite file as the database, by its full path", () => {
    expect(parseEnv({ ...valid, DATABASE_URL: "file:/data/gyaanstack.db" }).DATABASE_URL).toBe("file:/data/gyaanstack.db");
    expect(problems({ ...valid, DATABASE_URL: "file:./gyaanstack.db" })).toEqual([
      "DATABASE_URL must give the SQLite file's full path, e.g. file:/data/gyaanstack.db.",
    ]);
  });

  it("wants a hash of the password, not the password itself", () => {
    expect(problems({ ...valid, GYAANSTACK_PASSWORD: "correct horse" })).toEqual([
      expect.stringMatching(/^GYAANSTACK_PASSWORD must be a hash of your password, not the password itself\. .*hash-password/),
    ]);
    expect(parseEnv({ ...valid, GYAANSTACK_PASSWORD: ` ${PASSWORD_HASH}\n` }).GYAANSTACK_PASSWORD).toBe(PASSWORD_HASH);
  });

  it("rejects a secret shorter than 32 characters", () => {
    expect(problems({ ...valid, GYAANSTACK_SECRET: "short" })).toEqual([
      expect.stringMatching(/^GYAANSTACK_SECRET is too short \(5 characters\)\./),
    ]);
  });

  it("never echoes secret values", () => {
    const messages = problems({
      GYAANSTACK_PASSWORD: "hunter2",
      GYAANSTACK_SECRET: "tiny-secret",
      DATABASE_URL: "mysql://root:db-password@db/dossier",
    }).join("\n");
    expect(messages).not.toContain("hunter2");
    expect(messages).not.toContain("tiny-secret");
    expect(messages).not.toContain("db-password");
    expect(messages).toMatch(/DATABASE_URL must be a PostgreSQL connection string/);
  });

  it("rejects invalid optional values", () => {
    expect(
      problems({
        ...valid,
        GYAANSTACK_BACKUP_RETENTION_DAYS: "two weeks",
        GYAANSTACK_AI_PROVIDER: "gemini",
        GYAANSTACK_AI_URL: "ftp://example.com",
      }),
    ).toEqual([
      'GYAANSTACK_BACKUP_RETENTION_DAYS must be a whole number of days (got "two weeks").',
      'GYAANSTACK_AI_PROVIDER must be one of local, openai, anthropic, mistral, lmstudio (got "gemini").',
      "GYAANSTACK_AI_URL must be an http:// or https:// URL.",
    ]);
    expect(problems({ ...valid, GYAANSTACK_BACKUP_RETENTION_DAYS: "0" })).toEqual([
      "GYAANSTACK_BACKUP_RETENTION_DAYS must be at least 1.",
    ]);
  });
});

describe("job search variables (E14-4)", () => {
  it("reads the source and its keys", () => {
    expect(
      parseEnv({
        ...valid,
        GYAANSTACK_JOBS_SOURCE: "jsearch",
        GYAANSTACK_JSEARCH_KEY: "ak_test",
        GYAANSTACK_JSEARCH_HOST: "rapidapi",
        GYAANSTACK_ADZUNA_APP_ID: "app",
        GYAANSTACK_ADZUNA_KEY: "adz",
        GYAANSTACK_FREEHIRE_URL: "https://jobs.example/",
      }),
    ).toMatchObject({
      GYAANSTACK_JOBS_SOURCE: "jsearch",
      GYAANSTACK_JSEARCH_KEY: "ak_test",
      GYAANSTACK_JSEARCH_HOST: "rapidapi",
      GYAANSTACK_ADZUNA_APP_ID: "app",
      GYAANSTACK_ADZUNA_KEY: "adz",
      GYAANSTACK_FREEHIRE_URL: "https://jobs.example",
    });
    expect(parseEnv({ ...valid, GYAANSTACK_JOBS_SOURCE: "freehire" }).GYAANSTACK_JOBS_SOURCE).toBe("freehire");
  });

  it("reads whether the Bundesagentur für Arbeit is offered, and refuses choosing it while it's off (#223)", () => {
    expect(parseEnv(valid).GYAANSTACK_JOBS_ARBEITSAGENTUR).toBeUndefined();
    expect(parseEnv({ ...valid, GYAANSTACK_JOBS_ARBEITSAGENTUR: " OFF " }).GYAANSTACK_JOBS_ARBEITSAGENTUR).toBe("off");
    expect(problems({ ...valid, GYAANSTACK_JOBS_ARBEITSAGENTUR: "no" })).toEqual(['GYAANSTACK_JOBS_ARBEITSAGENTUR must be on or off (got "no").']);
    expect(problems({ ...valid, GYAANSTACK_JOBS_SOURCE: "arbeitsagentur", GYAANSTACK_JOBS_ARBEITSAGENTUR: "off" })).toEqual([
      "GYAANSTACK_JOBS_SOURCE is arbeitsagentur, but GYAANSTACK_JOBS_ARBEITSAGENTUR is off. Choose another source, or remove one of the two.",
    ]);
  });

  it("rejects sources and hosts it doesn't know, without echoing keys", () => {
    expect(problems({ ...valid, GYAANSTACK_JOBS_SOURCE: "linkedin", GYAANSTACK_JSEARCH_HOST: "google", GYAANSTACK_JSEARCH_KEY: "ak_secret" })).toEqual([
      'GYAANSTACK_JOBS_SOURCE must be one of jsearch, adzuna, arbeitsagentur, freehire, off (got "linkedin").',
      'GYAANSTACK_JSEARCH_HOST must be openwebninja or rapidapi (got "google").',
    ]);
  });
});
