const axios = require("axios");

const DISCORD_HOOK =
  "https://discord.com/api/webhooks/841227034969505832/5Qn-uL1ZWmklsdj3vAit4CsSkGyHM9hLdhPlp7aRAfBYtv6vQCOZ_Txnv2W3GWibpeOR";

const postToDiscord = async (content) =>
  await axios.post(DISCORD_HOOK, {
    username: "Prediction Bot",
    content,
  });

module.exports = { postToDiscord };
