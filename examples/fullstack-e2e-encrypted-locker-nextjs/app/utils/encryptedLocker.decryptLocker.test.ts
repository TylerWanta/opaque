import sodium from "libsodium-wrappers";
import { decryptLocker, encryptLocker } from "./encryptedLocker";

const data = JSON.stringify({ secretNotes: [{ id: "1", text: "secret" }] });
const publicAdditionalData = { createdAt: new Date("2023-10-31") };
// sodium.to_base64(sodium.randombytes_buf(32))
const exportKey = "iX3NooF-7W5dXzJWEso-ilpcYE-v_vj1Uam3rpDvKBQ";
const sessionKey = "dQcJZvTqCgDzW36bzQrnJ6PIcVcZgiRRaFHwC5D4QxY";
const invalidKey = "invalidKey";

let encryptedLocker: {
  ciphertext: string;
  nonce: string;
  tag: string;
};

beforeAll(async () => {
  await sodium.ready;
  encryptedLocker = encryptLocker({
    data,
    publicAdditionalData,
    exportKey,
    sessionKey,
  });
});

it("should decrypt locker as string by default", () => {
  const decryptedLocker = decryptLocker({
    ciphertext: encryptedLocker.ciphertext,
    publicAdditionalData,
    nonce: encryptedLocker.nonce,
    exportKey,
  });

  expect(decryptedLocker).toEqual(data);
});

it("should decrypt locker as string by default", () => {
  const decryptedLocker = decryptLocker({
    ciphertext: encryptedLocker.ciphertext,
    publicAdditionalData,
    nonce: encryptedLocker.nonce,
    exportKey,
    outputFormat: "string",
  });

  expect(decryptedLocker).toEqual(data);
});

it("should decrypt locker as Uint8Array", () => {
  const otherEncryptedLocker = encryptLocker({
    data: new Uint8Array([0, 42, 0, 99]),
    publicAdditionalData,
    exportKey,
    sessionKey,
  });
  const decryptedLocker = decryptLocker({
    ciphertext: otherEncryptedLocker.ciphertext,
    publicAdditionalData,
    nonce: otherEncryptedLocker.nonce,
    exportKey,
    outputFormat: "uint8array",
  });

  expect(decryptedLocker).toEqual(new Uint8Array([0, 42, 0, 99]));
});

it("should throw an error for an invalid publicAdditionalData", () => {
  expect(() =>
    decryptLocker({
      ciphertext: encryptedLocker.ciphertext,
      publicAdditionalData: NaN,
      nonce: encryptedLocker.nonce,
      exportKey,
    })
  ).toThrow("NaN is not allowed");
});

it("should throw an error for invalid ciphertext", () => {
  expect(() =>
    decryptLocker({
      ciphertext: "ups",
      publicAdditionalData,
      nonce: encryptedLocker.nonce,
      exportKey,
    })
  ).toThrow("ciphertext is too short");
});

it("should throw an error for invalid exportKey", () => {
  expect(() =>
    decryptLocker({
      ciphertext: encryptedLocker.ciphertext,
      publicAdditionalData,
      nonce: encryptedLocker.nonce,
      exportKey: invalidKey,
    })
  ).toThrow("invalid input");
});
