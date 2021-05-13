const { nodeUrl, web3, account, contract } = require("./config");
const { postToDiscord } = require("./discord");

const printSeparator = (length = 40) =>
  console.log(new Array(length).fill("-").join(""));

(async () => {
  const gasPrice = await web3.eth.getGasPrice();

  console.log("\x1Bc");
  console.log("🔮 Prediction Auto Claim 💰");
  console.log(`⚡️ ${nodeUrl}`);
  printSeparator();

  const autoClaim = async () => {
    const startTime = new Date();

    const paused = await contract.methods.paused().call();
    if (paused) {
      console.log(
        startTime,
        "Prediction is currently paused, refreshing in 5 minutes..."
      );
      setTimeout(autoClaim, 5 * 60 * 1000);
      return;
    }

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
