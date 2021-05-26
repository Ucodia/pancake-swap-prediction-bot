const endpoints = [
  "https://bsc-dataseed1.binance.org/",
  "https://bsc-dataseed2.binance.org/",
  "https://bsc-dataseed3.binance.org/",
  "https://bsc-dataseed4.binance.org/",
  "https://bsc-dataseed1.defibit.io/",
  "https://bsc-dataseed2.defibit.io/",
  "https://bsc-dataseed3.defibit.io/",
  "https://bsc-dataseed4.defibit.io/",
  "https://bsc-dataseed1.ninicoin.io/",
  "https://bsc-dataseed2.ninicoin.io/",
  "https://bsc-dataseed3.ninicoin.io/",
  "https://bsc-dataseed4.ninicoin.io/",
];

const randomInt = (min, max) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

const getRandomNodeUrl = () => endpoints[randomInt(0, endpoints.length - 1)];

module.exports = { getRandomNodeUrl, nodeUrls: endpoints };
