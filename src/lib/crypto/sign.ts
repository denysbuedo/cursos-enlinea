import * as ed from "@noble/ed25519";

// La clave privada se carga desde variable de entorno (nunca en código)
// Formato: hex (64 chars) o base64
function getPrivateKey(): Uint8Array {
  const key = process.env.EDDSA_PRIVATE_KEY;
  if (!key) throw new Error("EDDSA_PRIVATE_KEY not configured");
  // Asumimos formato hex
  if (key.length === 64) {
    return Uint8Array.from(Buffer.from(key, "hex"));
  }
  // O base64
  return Uint8Array.from(Buffer.from(key, "base64"));
}

async function getPublicKey(): Promise<Uint8Array> {
  const privateKey = getPrivateKey();
  return ed.getPublicKey(privateKey);
}

export async function signCredential(credential: string): Promise<string> {
  const privateKey = getPrivateKey();
  const messageHash = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(credential)
  );
  const signature = await ed.sign(new Uint8Array(messageHash), privateKey);
  return Buffer.from(signature).toString("base64url");
}

export async function verifyCredential(
  credential: string,
  signatureBase64: string,
  publicKeyHex: string
): Promise<boolean> {
  const messageHash = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(credential)
  );
  const signature = Uint8Array.from(Buffer.from(signatureBase64, "base64url"));
  const publicKey = Uint8Array.from(Buffer.from(publicKeyHex, "hex"));
  return ed.verify(signature, new Uint8Array(messageHash), publicKey);
}

export async function getPublicKeyHex(): Promise<string> {
  const pubKey = await getPublicKey();
  return Buffer.from(pubKey).toString("hex");
}
