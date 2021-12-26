import {
  CosmWasmClient,
  Secp256k1Pen,
  pubkeyToAddress,
  encodeSecp256k1Pubkey,
  EnigmaUtils,
  SigningCosmWasmClient,
} from "secretjs";

import { Bip39, Random } from "@iov/crypto";

const getNewAccount = async (
  REST_URL,
  setSigningClient,
  setAccount,
  usermnemonic
) => {
  //Use mnemonic from localstorage if it exists or create new mnemonic
  const trimmedMnemonic = usermnemonic?.replace(/"/g, "");
  const mnemonic =
    trimmedMnemonic ?? Bip39.encode(Random.getBytes(16)).toString();

  // This wraps a single keypair and allows for signing.
  const signingPen = await Secp256k1Pen.fromMnemonic(mnemonic);

  // Get the public key
  const pubkey = encodeSecp256k1Pubkey(signingPen.pubkey);

  // Get the wallet address
  const accAddress = pubkeyToAddress(pubkey, "secret");

  // Query the account
  const client = new CosmWasmClient(REST_URL);
  const account = await client.getAccount(accAddress);

  console.log("mnemonic: ", mnemonic);
  console.log("address: ", accAddress);
  console.log("account: ", account);
  console.log(accAddress);

  const customFees = {
    upload: {
      amount: [{ amount: "2000000", denom: "uscrt" }],
      gas: "2000000",
    },
    init: {
      amount: [{ amount: "500000", denom: "uscrt" }],
      gas: "500000",
    },
    exec: {
      amount: [{ amount: "500000", denom: "uscrt" }],
      gas: "500000",
    },
    send: {
      amount: [{ amount: "80000", denom: "uscrt" }],
      gas: "80000",
    },
  };

  const txEncryptionSeed = EnigmaUtils.GenerateNewSeed();
  const signingClient = new SigningCosmWasmClient(
    REST_URL,
    accAddress,
    (signBytes) => signingPen.sign(signBytes),
    txEncryptionSeed,
    customFees
  );
  setSigningClient(signingClient);
  setAccount({ ...account, address: accAddress });
  return { mnemonic, accAddress };
};

export default getNewAccount;
