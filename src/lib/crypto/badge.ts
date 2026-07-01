import { signCredential, getPublicKeyHex } from "./sign";

interface BadgeInput {
  badgeId: string;
  studentName: string;
  studentId: string;
  courseName: string;
  courseDescription: string;
  criteriaNarrative: string;
  issuerName: string;
  issuerUrl: string;
  verificationUrl: string;
  issuedAt: Date;
}

export async function generateOpenBadge(input: BadgeInput) {
  const publicKeyHex = await getPublicKeyHex();
  const issuerDid = `did:key:${publicKeyHex}`;

  const credential = {
    "@context": [
      "https://www.w3.org/ns/credentials/v2",
      "https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json",
    ],
    id: input.verificationUrl,
    type: ["VerifiableCredential", "OpenBadgeCredential"],
    issuer: {
      id: issuerDid,
      name: input.issuerName,
      url: input.issuerUrl,
    },
    validFrom: input.issuedAt.toISOString(),
    credentialSubject: {
      id: `did:example:${input.studentId}`,
      name: input.studentName,
      achievement: {
        id: `${input.verificationUrl}#achievement`,
        type: ["Achievement"],
        name: input.courseName,
        description: input.courseDescription,
        criteria: {
          narrative: input.criteriaNarrative,
        },
      },
    },
  };

  // Firmar el credential canónico
  const canonical = JSON.stringify(credential);
  const proofValue = await signCredential(canonical);

  const signedCredential = {
    ...credential,
    proof: {
      type: "DataIntegrityProof",
      cryptosuite: "eddsa-rdfc-2022",
      created: new Date().toISOString(),
      verificationMethod: `${issuerDid}#key-1`,
      proofPurpose: "assertionMethod",
      proofValue,
    },
  };

  return signedCredential;
}
