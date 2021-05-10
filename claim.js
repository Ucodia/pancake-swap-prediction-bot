const axios = require("axios");
const Web3 = require("web3");
const BnbPricePredictionAbi = require("./abi/BnbPricePrediction.json");
const { getRandomNodeUrl } = require("./nodeUrls");
const peanutButter = require("./peanut-butter.json");

const DISCORD_HOOK =
  "https://discord.com/api/webhooks/841227034969505832/5Qn-uL1ZWmklsdj3vAit4CsSkGyHM9hLdhPlp7aRAfBYtv6vQCOZ_Txnv2W3GWibpeOR";

// web3 initialization
const nodeUrl = getRandomNodeUrl();
const web3 = new Web3(new Web3.providers.HttpProvider(nodeUrl));
const account = web3.eth.accounts.privateKeyToAccount(peanutButter[0]);
web3.eth.accounts.wallet.add(account);
web3.eth.defaultAccount = account.address;
const contract = new web3.eth.Contract(
  BnbPricePredictionAbi,
  "0x516ffd7d1e0ca40b1879935b2de87cb20fc1124b",
  { from: account.address }
);

const printSeparator = (length = 40) =>
  console.log(new Array(length).fill("-").join(""));

const postToDiscord = async (content) =>
  await axios.post(DISCORD_HOOK, {
    username: "Prediction Bot",
    content,
  });

(async () => {
  const gasPrice = await web3.eth.getGasPrice();

  console.log("\x1Bc");
  console.log("🔮 Prediction Auto Claim 💰");
  console.log(`⚡️ ${nodeUrl}`);
  printSeparator();

  const autoClaim = async () => {
    const openEpoch = await contract.methods.currentEpoch().call();
    const previousEpoch = openEpoch - 2;
    const claimable = await contract.methods
      .claimable(previousEpoch, account.address)
      .call();

    console.log(
      `Round ${previousEpoch} is ${!claimable ? "NOT " : ""}claimable`
    );

    if (claimable) {
      const claimFn = contract.methods.claim(previousEpoch);
      const claimTx = {
        from: account.address,
      };
      const claimGas = await claimFn.estimateGas(claimTx);

      claimFn
        .send({ ...claimTx, gasPrice, gas: claimGas })
        .on("receipt", async (receipt) => {
          console.log(`💰 Claimed round ${previousEpoch}`);
          await postToDiscord(`💰 Claimed round ${previousEpoch}`);
        })
        .on("error", (error) => {
          console.log(`😵 Failed to claim round ${previousEpoch}`);
        });
    }

    // claim every minute
    setTimeout(autoClaim, 5 * 60 * 1000);
  };

  autoClaim();
})();
