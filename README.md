# Pancake Swap Prediction Bot 🔮

*Project created circa May 2021*

This node.js bot's purpose is to automate bets on the Pancake Swap predicton game and send Discord notifications. The goal of the game is to bet on whether or not the the price of BNB will increase or decrease between the next block and the next next block. Winners gets an equal distibution of the betting pool.

Note that since this was created in 2021, the contract may have been updated and threfore this program will not work of the box.

There is 4 bot scripts in this package:
- Status `npm run status`: Run this script while game is closed to get a Discord notification open re-opening
- Bet `npm run bet`: Run this to automatically bet on the prediction game and send update notification to Discord
- Claim `npm run claim`: Run this to automatically claim winnings to your wallet
- History `npm run history`: Can't remember what this was for

## Strategy

The strategy is really simple and completely unscientific
- If current block is more than `BLOCK_THRESHOLD` block away, do not bet
- If the pool is smaller than `POOL_THRESHOLD` BNB , do not bet
- If both bull and bear position are are higher than `PAYOUT_CAP`, do not bet
- Otherwise, bet whichever payout cap is the smallest

## Configuration

Configure the wallet private key and Discord token in your `.env` file

```
WALLET_PRIVATE_KEY=
DISCORD_HOOK_TOKEN=
```
