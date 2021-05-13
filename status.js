const { contract } = require("./config");
const { postToDiscord } = require("./discord");

(async () => {
  const startTime = new Date();
  let previousStatus = true;

  const pollMarketStatus = async () => {
    const paused = await contract.methods.paused().call();

    if (!paused && paused !== previousStatus) {
      postToDiscord("Prediction market just re-opened! 🔮✨");
    } else {
      console.log(
        startTime,
        "Prediction market is still paused, refreshing in 5 minutes..."
      );
      setTimeout(pollMarketStatus, 5 * 60 * 1000);
    }

    previousStatus = paused;
  };

  pollMarketStatus();
})();
