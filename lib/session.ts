import { SignJWT, jwtVerify, JWTPayload } from "jose";

if (!process.env.SESSION_SECRET && process.env.NODE_ENV === 'production') {
  throw new Error("SESSION_SECRET environment variable is missing in production.");
}

const secretKey = process.env.SESSION_SECRET || "default_development_secret";
const encodedKey = new TextEncoder().encode(secretKey);

export interface SessionData {
  id: number;
  username: string;
  avatar_url: string;
}

// The decrypted payload will include JWT standard claims like iat (issued at) and exp (expiration time)
export type DecryptedSession = SessionData & JWTPayload;

export async function encrypt(payload: SessionData) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(encodedKey);
}

export async function decrypt(session: string | undefined = ""): Promise<DecryptedSession | null> {
  if (!session) return null;
  try {
    const { payload } = await jwtVerify(session, encodedKey, { algorithms: ["HS256"] });
    return payload as DecryptedSession;
  } catch (error) {
    return null;
  }
}