import { SigningCosmWasmClient } from "secretjs";

const setupKeplr = async (CHAIN_ID, setAccount, setSigningClient) => {
  // Define sleep
  const sleep = (ms) => new Promise((accept) => setTimeout(accept, ms));

  // Wait for Keplr to be injected to the page
  while (!window.keplr && !window.getOfflineSigner && !window.getEnigmaUtils) {
    await sleep(10);
  }

  // Use a custom chain with Keplr.
  // On mainnet we don't need this (`experimentalSuggestChain`).
  // This works well with `enigmampc/secret-network-sw-dev`:
  //     - https://hub.docker.com/r/enigmampc/secret-network-sw-dev
  //     - Run a local chain: `docker run -it --rm -p 26657:26657 -p 26656:26656 -p 1337:1337 -v $(shell pwd):/root/code --name secretdev enigmampc/secret-network-sw-dev`
  //     - `alias secretcli='docker exec -it secretdev secretcli'`
  //     - Store a contract: `docker exec -it secretdev secretcli tx compute store /root/code/contract.wasm.gz --from a --gas 10000000 -b block -y`
  // On holodeck, set:
  //     1. CHIAN_ID = "holodeck-2"
  //     2. rpc = "ttp://chainofsecrets.secrettestnet.io:26657"
  //     3. rest = "https://chainofsecrets.secrettestnet.io"
  //     4. chainName = Whatever you like
  // For more examples, go to: https://github.com/chainapsis/keplr-example/blob/master/src/main.js
  await window.keplr.experimentalSuggestChain({
    chainId: CHAIN_ID,
    chainName: "Local Secret Chain",
    rpc: "http://localhost:26657",
    rest: "http://localhost:1337",
    bip44: {
      coinType: 529,
    },
    coinType: 529,
    stakeCurrency: {
      coinDenom: "SCRT",
      coinMinimalDenom: "uscrt",
      coinDecimals: 6,
    },
    bech32Config: {
      bech32PrefixAccAddr: "secret",
      bech32PrefixAccPub: "secretpub",
      bech32PrefixValAddr: "secretvaloper",
      bech32PrefixValPub: "secretvaloperpub",
      bech32PrefixConsAddr: "secretvalcons",
      bech32PrefixConsPub: "secretvalconspub",
    },
    currencies: [
      {
        coinDenom: "SCRT",
        coinMinimalDenom: "uscrt",
        coinDecimals: 6,
      },
    ],
    feeCurrencies: [
      {
        coinDenom: "SCRT",
        coinMinimalDenom: "uscrt",
        coinDecimals: 6,
      },
    ],
    gasPriceStep: {
      low: 0.1,
      average: 0.25,
      high: 0.4,
    },
    features: ["secretwasm"],
  });

  // Enable Keplr.
  // This pops-up a window for the user to allow keplr access to the webpage.
  await window.keplr.enable(CHAIN_ID);

  // Setup SecrtJS with Keplr's OfflineSigner
  // This pops-up a window for the user to sign on each tx we sent
  const keplrOfflineSigner = window.getOfflineSigner(CHAIN_ID);
  const accounts = await keplrOfflineSigner.getAccounts();
  console.log("accounts", accounts);

  const signingClient = new SigningCosmWasmClient(
    "http://localhost:1337", // holodeck - https://chainofsecrets.secrettestnet.io; mainnet - user your LCD/REST provider
    accounts[0].address,
    keplrOfflineSigner,
    window.getEnigmaUtils(CHAIN_ID),
    {
      // 300k - Max gas units we're willing to use for init
      init: {
        amount: [{ amount: "300000", denom: "uscrt" }],
        gas: "300000",
      },
      // 300k - Max gas units we're willing to use for exec
      exec: {
        amount: [{ amount: "300000", denom: "uscrt" }],
        gas: "300000",
      },
    }
  );

  setSigningClient(signingClient);
  setAccount(accounts[0]);
};

export default setupKeplr;
