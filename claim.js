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
    let paused = await contract.methods.paused().call();

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
    let claimable = false;

    try {
      claimable = await contract.methods
        .claimable(previousEpoch, account.address)
        .call();

      console.log(
        `Round ${previousEpoch} is ${!claimable ? "NOT " : ""}claimable`
      );
    } catch (error) {
      console.error(error.message);
    }

    if (claimable) {
      const claimFn = contract.methods.claim(previousEpoch);
      const claimTx = {
        from: account.address,
      };

      try {
        const claimGas = await claimFn.estimateGas(claimTx);

        claimFn
          .send({ ...claimTx, gasPrice, gas: claimGas })
          .on("receipt", async (receipt) => {
            const walletBalance = await web3.eth.getBalance(account.address);
            const message = `💰 Claimed round ${previousEpoch}, balance: ${(
              walletBalance / 1e18
            ).toFixed(4)} BNB`;
            console.log(message);
            await postToDiscord(message);
          })
          .on("error", (error) => {
            console.error(`😵 Failed to claim round ${previousEpoch}`);
          });
      } catch (error) {
        console.error(error.message);
      }
    }

    // claim every minute
    setTimeout(autoClaim, 5 * 60 * 1000);
  };

  autoClaim();
})();
