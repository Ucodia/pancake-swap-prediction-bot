require("dotenv").config();
const axios = require("axios");

const HOOK_ID = "842294167958323220";
const DISCORD_HOOK_URL = `https://discord.com/api/webhooks/${HOOK_ID}/${process.env.DISCORD_HOOK_TOKEN}`;

const postToDiscord = async (content) =>
  await axios.post(DISCORD_HOOK_URL, {
    username: "Prediction Bot",
    content,
  });

module.exports = { postToDiscord };
