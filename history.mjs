import Web3 from "web3";
import { createRequire } from "module";
const BnbPricePredictionAbi = createRequire(import.meta.url)(
  "./abi/BnbPricePrediction.json"
);
import { getRandomNodeUrl, trimRawData } from "./utils.mjs";

// chain config
const nodeUrl = getRandomNodeUrl();
const web3 = new Web3(new Web3.providers.HttpProvider(nodeUrl));
const contract = new web3.eth.Contract(
  BnbPricePredictionAbi,
  "0x516ffd7d1e0ca40b1879935b2de87cb20fc1124b",
  { from: "0x0000000000000000000000000000000000000000" }
);

(async () => {
  const userRounds = await contract.methods
    .getUserRounds("0x2881Cd32e9597ea15D20a3214616B2Ac12f522A8", 0, 10000)
    .call();

  userRounds[0].forEach(async (round, i, items) => {
    const rawLedger = await contract.methods
      .ledger(round, "0x2881Cd32e9597ea15D20a3214616B2Ac12f522A8")
      .call();
    const ledger = trimRawData(rawLedger);
    const bet = {
      epoch: round,
      position: ledger.position ? "bull" : "bear",
      amount: ledger.amount / 1e18,
      status: "confirmed",
      tx: "",
      claimStatus: "unknown",
      claimTx: "",
    };

    console.log(`Posting bet: ${i + 1} / ${items.length}`);
    set;
  });

  console.log("🔮 Prediction database updated!");
})();
