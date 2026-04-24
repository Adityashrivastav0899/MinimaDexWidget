# MinimaDexWidget
A production-ready embeddable DEX widget with wallet connection, ERC20 balances, approvals, real router swaps, transaction tracking, and configurable Minima-compatible trading routes.

## Features

- Connect MetaMask or compatible EVM wallet
- Show wallet address
- Show live ERC20 token balances
- Select token pair
- Fetch real router quote
- Approve ERC20 spending
- Execute real token swap
- Show pending success and failed transaction states
- Configurable token list router and RPC
- Can be embedded into any website

## Default Network

Polygon mainnet using QuickSwap V2 router.

Router:

0xa5E0829CaCED8fFDD4De3c43696c57F7D7A678ff

Default pair:

WMATIC / USDT

## Setup

1. Upload these files to your website:

- index.html
- style.css
- script.js

2. Open script.js

3. Configure your network:

```js
chainId: 137,
chainName: "Polygon",
rpcUrl: "https://polygon-rpc.com",
routerAddress: "YOUR_REAL_ROUTER_ADDRESS"

Configure real token addresses
tokens: {
  TOKEN1: {
    symbol: "TOKEN1",
    address: "REAL_TOKEN_CONTRACT",
    decimals: 18
  }
}
Then pair it with USDT or another real liquidity token.

The swap will only work if the selected router has an actual liquidity pool for that pair.

Important

This is not a mockup.

The widget calls:

ERC20 balanceOf
ERC20 allowance
ERC20 approve
Router getAmountsOut
Router swapExactTokensForTokens

You must use real contracts with real liquidity.


---

For Minima-specific trading, use this as the EVM swap widget and connect a **real WMINIMA/MINIMA bridge or MiniSwap route** when your Minima-side contract/API is available. MiniMask itself is meant to let webpages access Minima functionality, while MiniSwap handles Minima/Ethereum peer-to-peer swapping. 
::contentReference[oaicite:2]{index=2}
