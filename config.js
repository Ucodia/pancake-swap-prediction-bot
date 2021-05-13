require("dotenv").config();
const Web3 = require("web3");
const BnbPricePredictionAbi = require("./abi/BnbPricePrediction.json");
const { getRandomNodeUrl } = require("./nodeUrls");

const nodeUrl = getRandomNodeUrl();
const web3 = new Web3(new Web3.providers.HttpProvider(nodeUrl));
const account = web3.eth.accounts.privateKeyToAccount(
  process.env.PEANUT_BUTTER
);
web3.eth.accounts.wallet.add(account);
web3.eth.defaultAccount = account.address;
const contract = new web3.eth.Contract(
  BnbPricePredictionAbi,
  "0x516ffd7d1e0ca40b1879935b2de87cb20fc1124b",
  { from: account.address }
);

module.exports = {
  nodeUrl,
  web3,
  account,
  contract,
};
