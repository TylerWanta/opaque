export type Locker = {
  ciphertext: string;
  nonce: string;
  publicAdditionalDataCiphertext: string;
  publicAdditionalDataNonce: string;
  tag: string;
};

export type PublicAdditionalData =
  | string
  | number
  | boolean
  | null
  | { [x: string]: PublicAdditionalData }
  | Array<PublicAdditionalData>;

export type RecoveryLockbox = {
  receiverPublicKey: string;
  creatorPublicKey: string;
  ciphertext: string;
  nonce: string;
};

export type CreateLockerSecretKeyParams = {
  exportKey: string;
};

export type VerifyLockerTagParams = {
  locker: Locker;
  sessionKey: string;
};

export type ValidateLockerAndDecryptPublicAdditionalDataParams = {
  locker: Locker;
  sessionKey: string;
};

export type CreateRecoveryLockboxParams = {
  exportKey: string;
  recoveryExportKey: string;
};

export type CreateLockerParams = {
  data: string | Uint8Array;
  publicAdditionalData: PublicAdditionalData;
  exportKey: string;
  sessionKey: string;
};

export type DecryptLockerParams = {
  locker: Locker;
  exportKey: string;
  sessionKey: string;
  outputFormat?: "string" | "uint8array";
};

export type DecryptLockerFromRecoveryLockboxParams = {
  locker: Locker;
  recoveryExportKey: string;
  recoverySessionKey: string;
  recoveryLockbox: RecoveryLockbox;
  outputFormat?: "string" | "uint8array";
};
