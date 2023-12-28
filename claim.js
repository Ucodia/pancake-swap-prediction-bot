const { default: axios } = require("axios");
const { nodeUrl, web3, account, contract } = require("./config");
const { postToDiscord } = require("./discord");
const LOCAL_STORAGE_URI = "http://localhost:3000";

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

    const unclaimedBets = await axios.get(
      `${LOCAL_STORAGE_URI}/bets?status=confirmed&claimStatus_like=(unclaimed|unknown)`
    );
    const claimableBets = unclaimedBets.data.filter(
      (bet) => parseInt(bet.epoch, 10) < previousEpoch
    );

    if (claimableBets.length > 0) {
      console.log(
        `Found claimable rounds: ${claimableBets.map((b) => b.epoch).join(" ")}`
      );
    }

    claimableBets.forEach(async (bet) => {
      const claimFn = contract.methods.claim(bet.epoch);
      const claimTx = {
        from: account.address,
      };
      try {
        const claimGas = await claimFn.estimateGas(claimTx);
        claimFn
          .send({ ...claimTx, gasPrice, gas: claimGas })
          .on("receipt", async (receipt) => {
            const walletBalance = await web3.eth.getBalance(account.address);
            const message = `💰 Claimed round ${epoch}, balance: ${(
              walletBalance / 1e18
            ).toFixed(4)} BNB`;
            console.log(message);

            await axios.put(`${LOCAL_STORAGE_URI}/bets/${bet}`, {
              ...bet,
              claimStatus: "claimed",
              claimTx: receipt.transactionHash,
            });
            await postToDiscord(message);
          })
          .on("error", async (error) => {
            console.error(`😵 Failed to claim round ${epoch}`);
          });
      } catch (error) {
        console.error(error.message);

        if (error.message.toLowerCase().includes("not eligible")) {
          await axios.put(`${LOCAL_STORAGE_URI}/bets/${bet.epoch}`, {
            ...bet,
            claimStatus: "unclaimable",
          });
        } else if (error.message.toLowerCase().includes("rewards claimed")) {
          await axios.put(`${LOCAL_STORAGE_URI}/bets/${bet.epoch}`, {
            ...bet,
            claimStatus: "claimed",
          });
        }
      }
    });

    // claim every minute
    setTimeout(autoClaim, 5 * 60 * 1000);
  };

  autoClaim();
})();
