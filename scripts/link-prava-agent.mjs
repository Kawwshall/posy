// Wires the locally-linked Prava Pay agent (~/.prava/agent.json) into
// .env.local so live product discovery (lib/prava-shopping.ts) can sign
// requests. Reads your private key locally, normalizes it to the base64
// PKCS8 DER the code expects, and writes it to .env.local.
//
// It NEVER prints your private key. Run:  node scripts/link-prava-agent.mjs
//
// Safe to re-run; it updates the two keys in place.

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { createPrivateKey, sign } from "node:crypto";

const stateDir = process.env.PRAVA_STATE_DIR || join(homedir(), ".prava");
const agentPath = join(stateDir, "agent.json");
const envPath = join(process.cwd(), ".env.local");

function fail(msg) {
  console.error("✗ " + msg);
  process.exit(1);
}

if (!existsSync(agentPath)) fail(`No linked agent found at ${agentPath}. Run \`prava setup\` first.`);

let j;
try {
  j = JSON.parse(readFileSync(agentPath, "utf8"));
} catch (e) {
  fail(`Could not parse ${agentPath}: ${e.message}`);
}

// Find the agent id and private key under any of the common field names.
const pick = (obj, names) => {
  for (const n of names) {
    if (obj && typeof obj[n] === "string" && obj[n].length) return obj[n];
  }
  // one level of nesting (e.g. { identity: {...} })
  for (const v of Object.values(obj || {})) {
    if (v && typeof v === "object") {
      const hit = pick(v, names);
      if (hit) return hit;
    }
  }
  return undefined;
};

const agentId = pick(j, ["agentId", "agent_id", "id", "agentID"]);
const rawKey = pick(j, ["privateKey", "private_key", "privateKeyPem", "key", "secretKey", "sk", "seed"]);

if (!agentId) fail("Could not find an agent id in agent.json.");
if (!rawKey) fail("Could not find a private key in agent.json.");

// Normalize the private key to a KeyObject, trying each plausible encoding.
function toKeyObject(val) {
  const attempts = [];
  if (val.includes("BEGIN")) attempts.push(() => createPrivateKey(val)); // PEM
  attempts.push(() => createPrivateKey({ key: Buffer.from(val, "base64"), format: "der", type: "pkcs8" }));
  attempts.push(() => createPrivateKey({ key: Buffer.from(val, "hex"), format: "der", type: "pkcs8" }));
  // raw 32-byte Ed25519 seed (base64 or hex) -> wrap in a PKCS8 DER envelope
  const wrapSeed = (seed) => {
    if (seed.length !== 32) throw new Error("not a 32-byte seed");
    const prefix = Buffer.from("302e020100300506032b657004220420", "hex");
    return createPrivateKey({ key: Buffer.concat([prefix, seed]), format: "der", type: "pkcs8" });
  };
  attempts.push(() => wrapSeed(Buffer.from(val, "base64")));
  attempts.push(() => wrapSeed(Buffer.from(val, "hex")));
  for (const attempt of attempts) {
    try {
      const ko = attempt();
      if (ko.asymmetricKeyType === "ed25519") return ko;
    } catch {}
  }
  return undefined;
}

const keyObject = toKeyObject(rawKey);
if (!keyObject) fail("Found a private key but could not read it as an Ed25519 key. Please share the agent.json field names.");

// Prove it can actually sign (this is exactly what prava-shopping.ts does).
try {
  sign(null, Buffer.from("posy-selftest"), keyObject);
} catch (e) {
  fail("The key loaded but failed a signing self-test: " + e.message);
}

const pkcs8Base64 = keyObject.export({ type: "pkcs8", format: "der" }).toString("base64");

// Merge into .env.local without disturbing other values.
let env = existsSync(envPath) ? readFileSync(envPath, "utf8") : "";
const upsert = (name, value) => {
  const line = `${name}=${value}`;
  const re = new RegExp(`^${name}=.*$`, "m");
  if (re.test(env)) env = env.replace(re, line);
  else env = env.replace(/\s*$/, "\n") + line + "\n";
};
upsert("PRAVA_AGENT_ID", agentId);
upsert("PRAVA_AGENT_PRIVATE_KEY", pkcs8Base64);
writeFileSync(envPath, env);

console.log("✓ Wrote PRAVA_AGENT_ID and PRAVA_AGENT_PRIVATE_KEY to .env.local");
console.log("  Agent ID: " + agentId);
console.log("  Private key: normalized to base64 PKCS8 DER (not shown)");
console.log("  Restart the server to pick it up:  pkill -f vinext ; npm run dev");
