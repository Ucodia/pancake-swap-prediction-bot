const Web3 = require("web3");
const BnbPricePredictionAbi = require("./abi/BnbPricePrediction.json");

const PAYOUT_CAP = 1.7;
const BET_AMOUNT = 0.01;
const WALLET_PKEY = "0x0000000000000000000000000000000000000000";

const Position = { Bull: "Bull", Bear: "Bear", None: "None" };
const BetStatus = {
  Pending: "Pending",
  BettingBull: "Betting Bull",
  BettingBear: "Betting Bear",
  Confirmed: "Confirmed",
  NoGo: "No Go",
  Win: "Win",
  Loss: "Loss",
};

const web3 = new Web3(
  new Web3.providers.HttpProvider("https://bsc-dataseed3.ninicoin.io/")
);
const contract = new web3.eth.Contract(
  BnbPricePredictionAbi,
  "0x516ffd7d1e0ca40b1879935b2de87cb20fc1124b"
);
const gweiToBnbRatio = 1e18;
const remainingBlockToDelayScale = [
  [10, 1000],
  [20, 2000],
];

const computeDelay = (remainingBlocks, defaultDelay = 10000) => {
  for (let i = 0; i < remainingBlockToDelayScale.length; i++) {
    if (remainingBlocks < remainingBlockToDelayScale[i][0])
      return remainingBlockToDelayScale[i][1];
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
  totalAmountBnb = round.totalAmount / gweiToBnbRatio;
  bullAmountBnb = round.bullAmount / gweiToBnbRatio;
  bearAmountBnb = round.bearAmount / gweiToBnbRatio;
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
  const betsStatus = {};

  const run = async () => {
    // metrics
    const startTime = new Date();

    const epoch = await contract.methods.currentEpoch().call();
    const [
      blockNumber,
      walletBalance,
      openRound,
      prevRound,
    ] = await Promise.all([
      web3.eth.getBlockNumber(),
      web3.eth.getBalance(WALLET_PKEY),
      contract.methods.rounds(epoch).call(),
      contract.methods.rounds(epoch - 2).call(),
    ]);

    console.log("\x1Bc");
    console.log("🔮 Prediction Bot 🤖");

    // computer stats
    const remainingBlocks = openRound.lockBlock - blockNumber;
    const openRoundStats = computeRoundStats(openRound, PAYOUT_CAP);
    const prevRoundStats = computeRoundStats(prevRound, PAYOUT_CAP);

    // set the bets
    if (!betsStatus[epoch]) {
      betsStatus[epoch] = BetStatus.Pending;
    }

    if (betsStatus[epoch] === BetStatus.Pending) {
      if (remainingBlocks < 0) {
        betsStatus[epoch] = BetStatus.NoGo;
      } else if (remainingBlocks < 3) {
        const newStatus =
          openRoundStats.predictedPosition === Position.Bull
            ? BetStatus.BettingBull
            : openRoundStats.predictedPosition === Position.Bear
            ? BetStatus.BettingBear
            : BetStatus.NoGo;
        betsStatus[epoch] = newStatus;

        // if betting status, execute bet
        if (
          [BetStatus.BettingBull, BetStatus.BettingBear].includes(newStatus)
        ) {
          const betFn =
            newStatus === BetStatus.BettingBull
              ? contract.methods.betBull()
              : contract.methods.betBear();

          // const estimatedGas = await betFn.estimateGas({ from: WALLET_PKEY });
          // console.log(estimatedGas);

          // const betTx = await betFn.call({ from: WALLET_PKEY });
          // console.log(betTx);
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
        // const claimTx = await contract.methods
        //   .claim(prevRound.epoch)
        //   .call({ from: WALLET_PKEY });
        // console.log(claimTx);
      } else {
        betsStatus[prevRound.epoch] = BetStatus.Loss;
      }
    }

    // print status
    printSeparator();
    console.log(
      `previous prediction: ${
        prevRoundStats.predictedPosition === Position.none
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
    console.log(
      `wallet balance: ${(walletBalance / gweiToBnbRatio).toFixed(2)} BNB`
    );

    printSeparator();
    console.log(`time: ${new Date() - startTime}ms`);
    const delay = computeDelay(remainingBlocks);
    console.log(`refresh rate: ${delay}ms`);
    setTimeout(run, delay);
  };

  run();
})();
