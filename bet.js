const { nodeUrl, web3, account, contract } = require("./config");

const PAYOUT_CAP = 1.7;
const POOL_THRESHOLD = 3.0;
const BLOCK_THRESHOLD = 4;

const Position = { Bull: "Bull", Bear: "Bear", None: "None" };
const BetStatus = {
  Running: "Running",
  BettingBull: "Betting Bull",
  BettingBear: "Betting Bear",
  Confirmed: "Confirmed",
  Failed: "Failed",
  NoGo: "No Go",
  Win: "Win",
  Loss: "Loss",
};

const weiRatio = 1e18;

const computeBetAmount = (balance) => {
  const balanceBnb = balance / weiRatio;
  // count whole tenth of BNB in balance
  const wholeTenth = Math.floor(balanceBnb / 0.1);
  // base amount is 0.03
  return wholeTenth * 0.01 + 0.03;
};

const computeDelay = (remainingBlocks, defaultDelay = 30000) => {
  const delayConfig = [
    [5, 750],
    [10, 1000],
    [20, 5000],
  ];
  for (let i = 0; i < delayConfig.length; i++) {
    if (remainingBlocks < delayConfig[i][0]) return delayConfig[i][1];
  }
  return defaultDelay;
};

// strategy to decide to not bet, bet bull or bet bear
// if both payout are above the cap, do not bet
// if bull payout is the smallest then bet bull, otherwise bet bear
const computePosition = (bullPayout, bearPayout, payoutCap) =>
  bullPayout > payoutCap && bearPayout > payoutCap
    ? Position.None
    : bullPayout < bearPayout
    ? Position.Bull
    : Position.Bear;

const computeRoundStats = (round, payoutCap) => {
  totalAmountBnb = round.totalAmount / weiRatio;
  bullAmountBnb = round.bullAmount / weiRatio;
  bearAmountBnb = round.bearAmount / weiRatio;
  bullPayout = round.totalAmount / round.bullAmount;
  bearPayout = round.totalAmount / round.bearAmount;
  predictedPosition = computePosition(bullPayout, bearPayout, payoutCap);
  actualPosition =
    round.lockPrice < round.closePrice ? Position.Bull : Position.Bear;
  return {
    totalAmountBnb,
    bullAmountBnb,
    bearAmountBnb,
    bullPayout,
    bearPayout,
    predictedPosition,
    actualPosition,
  };
};

const printSeparator = (length = 40) =>
  console.log(new Array(length).fill("-").join(""));

(async () => {
  const gasPrice = await web3.eth.getGasPrice();
  const betsStatus = {};

  const autoBet = async () => {
    const startTime = new Date();
    let paused = await contract.methods.paused().call();

    if (paused) {
      console.log("\x1Bc");
      console.log("🔮 Prediction Bot 🤖");
      console.log(`⚡️ ${nodeUrl}`);
      printSeparator();
      console.log(
        startTime,
        "Prediction is currently paused, refreshing in 5 minutes..."
      );
      setTimeout(autoBet, 5 * 60 * 1000);
      return;
    }

    const epoch = await contract.methods.currentEpoch().call();
    const [blockNumber, walletBalance, openRound, prevRound] =
      await Promise.all([
        web3.eth.getBlockNumber(),
        web3.eth.getBalance(account.address),
        contract.methods.rounds(epoch).call(),
        contract.methods.rounds(epoch - 2).call(),
      ]);

    // compute round additional stats
    const remainingBlocks = openRound.lockBlock - blockNumber;
    const openRoundStats = computeRoundStats(openRound, PAYOUT_CAP);
    const prevRoundStats = computeRoundStats(prevRound, PAYOUT_CAP);
    const betAmount = computeBetAmount(walletBalance);

    // set the bets
    if (!betsStatus[epoch]) {
      betsStatus[epoch] = BetStatus.Running;
    }

    if (betsStatus[epoch] === BetStatus.Running) {
      if (remainingBlocks <= 0) {
        betsStatus[epoch] = BetStatus.NoGo;
      } else if (
        remainingBlocks <= BLOCK_THRESHOLD &&
        openRoundStats.totalAmountBnb > POOL_THRESHOLD
      ) {
        const newStatus =
          openRoundStats.predictedPosition === Position.Bull
            ? BetStatus.BettingBull
            : openRoundStats.predictedPosition === Position.Bear
            ? BetStatus.BettingBear
            : BetStatus.Running;
        betsStatus[epoch] = newStatus;

        // if betting status, execute bet
        if (
          [BetStatus.BettingBull, BetStatus.BettingBear].includes(newStatus)
        ) {
          const betFn =
            newStatus === BetStatus.BettingBull
              ? contract.methods.betBull()
              : contract.methods.betBear();
          const betTx = {
            from: account.address,
            value: web3.utils.toWei(betAmount.toString()),
          };
          const betGas = await betFn.estimateGas(betTx);

          betFn
            .send({ ...betTx, gasPrice, gas: betGas })
            .on("receipt", (receipt) => {
              betsStatus[epoch] = BetStatus.Confirmed;
            })
            .on("error", (error) => {
              betsStatus[epoch] = BetStatus.Failed;
              console.error(error);
            });
        }
      }
    }

    // if betting on previous status, verify result and claim
    if (
      [BetStatus.BettingBull, BetStatus.BettingBear].includes(
        betsStatus[prevRound.epoch]
      )
    ) {
      if (prevRoundStats.predictedPosition === prevRoundStats.actualPosition) {
        betsStatus[prevRound.epoch] = BetStatus.Win;
      } else {
        betsStatus[prevRound.epoch] = BetStatus.Loss;
      }
    }

    // print status
    console.log("\x1Bc");
    console.log("🔮 Prediction Bot 🤖");
    console.log(`⚡️ ${nodeUrl}`);
    printSeparator();

    console.log(
      `previous prediction: ${
        prevRoundStats.predictedPosition === Position.None
          ? "No go ✋"
          : prevRoundStats.predictedPosition === prevRoundStats.actualPosition
          ? "Good 👍"
          : "Bad 👎"
      }`
    );
    console.log(`open round: ${openRound.epoch}`);
    console.log(`total: ${openRoundStats.totalAmountBnb.toFixed(2)} BNB`);
    console.log(
      `bull: ${openRoundStats.bullAmountBnb.toFixed(
        2
      )} BNB / ${openRoundStats.bullPayout.toFixed(2)}x${
        openRoundStats.predictedPosition === Position.Bull ? " ✅" : ""
      }`
    );
    console.log(
      `bear: ${openRoundStats.bearAmountBnb.toFixed(
        2
      )} BNB / ${openRoundStats.bearPayout.toFixed(2)}x${
        openRoundStats.predictedPosition === Position.Bear ? " ✅" : ""
      }`
    );
    console.log(
      `remaining blocks: ${remainingBlocks}${
        remainingBlocks <= 10 ? " 🔔" : ""
      }`
    );
    printSeparator();

    console.log(`bets: ${JSON.stringify(betsStatus, null, 2)}`);
    console.log(`wallet balance: ${(walletBalance / weiRatio).toFixed(4)} BNB`);
    printSeparator();

    console.log(`payout cap: ${PAYOUT_CAP}`);
    console.log(`pool threshold: ${POOL_THRESHOLD} BNB`);
    console.log(`block threshold: ${BLOCK_THRESHOLD} last`);
    console.log(`bet amount: ${betAmount}`);
    console.log(`time: ${new Date() - startTime}ms`);
    const delay = computeDelay(remainingBlocks);
    console.log(`refresh rate: ${delay}ms`);
    printSeparator();

    // schedule next run
    setTimeout(autoBet, delay);
  };

  autoBet();
})();
