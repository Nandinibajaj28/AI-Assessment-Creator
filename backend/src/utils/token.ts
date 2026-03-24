import crypto from "crypto";

type TokenPayload = {
  sub: string;
  email: string;
  name: string;
  iat: number;
  exp: number;
};

const DEFAULT_SECRET = "assignment-secret-key";
const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7;

function getSecret() {
  return process.env.JWT_SECRET || DEFAULT_SECRET;
}

function toBase64Url(value: string) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function fromBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));

  return Buffer.from(`${normalized}${padding}`, "base64").toString("utf8");
}

function sign(value: string) {
  return crypto
    .createHmac("sha256", getSecret())
    .update(value)
    .digest("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

export function generateToken(input: { id: string; email: string; name: string }) {
  const header = { alg: "HS256", typ: "JWT" };
  const iat = Math.floor(Date.now() / 1000);
  const payload: TokenPayload = {
    sub: input.id,
    email: input.email,
    name: input.name,
    iat,
    exp: iat + TOKEN_TTL_SECONDS
  };

  const encodedHeader = toBase64Url(JSON.stringify(header));
  const encodedPayload = toBase64Url(JSON.stringify(payload));
  const signature = sign(`${encodedHeader}.${encodedPayload}`);

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

export function verifyToken(token: string): TokenPayload | null {
  const parts = token.split(".");
  if (parts.length !== 3) {
    return null;
  }

  const [encodedHeader, encodedPayload, signature] = parts;
  const expectedSignature = sign(`${encodedHeader}.${encodedPayload}`);

  if (signature !== expectedSignature) {
    return null;
  }

  try {
    const payload = JSON.parse(fromBase64Url(encodedPayload)) as TokenPayload;

    if (payload.exp * 1000 < Date.now()) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}
