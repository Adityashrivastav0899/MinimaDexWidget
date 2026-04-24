const CONFIG = {
  chainId: 137,
  chainName: "Polygon",
  rpcUrl: "https://polygon-rpc.com",

  routerAddress: "0xa5E0829CaCED8fFDD4De3c43696c57F7D7A678ff", // QuickSwap V2 Router

  tokens: {
    WMATIC: {
      symbol: "WMATIC",
      address: "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270",
      decimals: 18
    },
    USDT: {
      symbol: "USDT",
      address: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
      decimals: 6
    },

    /*
      Add real wrapped MINIMA token address here if available on your chosen chain.

      WMINIMA: {
        symbol: "WMINIMA",
        address: "PASTE_REAL_TOKEN_ADDRESS",
        decimals: 18
      }
    */
  }
};

const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)"
];

const ROUTER_ABI = [
  "function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts)",
  "function swapExactTokensForTokens(uint amountIn,uint amountOutMin,address[] calldata path,address to,uint deadline) external returns (uint[] memory amounts)"
];

let provider;
let signer;
let userAddress;
let router;

const connectBtn = document.getElementById("connectBtn");
const walletBox = document.getElementById("walletBox");
const walletAddressEl = document.getElementById("walletAddress");
const networkNameEl = document.getElementById("networkName");
const fromTokenEl = document.getElementById("fromToken");
const toTokenEl = document.getElementById("toToken");
const amountInEl = document.getElementById("amountIn");
const amountOutEl = document.getElementById("amountOut");
const fromBalanceEl = document.getElementById("fromBalance");
const toBalanceEl = document.getElementById("toBalance");
const statusBox = document.getElementById("statusBox");
const swapBtn = document.getElementById("swapBtn");
const switchBtn = document.getElementById("switchBtn");
const slippageEl = document.getElementById("slippage");

initTokens();

function initTokens() {
  Object.keys(CONFIG.tokens).forEach(symbol => {
    fromTokenEl.innerHTML += `<option value="${symbol}">${symbol}</option>`;
    toTokenEl.innerHTML += `<option value="${symbol}">${symbol}</option>`;
  });

  fromTokenEl.value = "WMATIC";
  toTokenEl.value = "USDT";
}

connectBtn.onclick = connectWallet;
fromTokenEl.onchange = refreshAll;
toTokenEl.onchange = refreshAll;
amountInEl.oninput = quoteSwap;
swapBtn.onclick = executeSwap;

switchBtn.onclick = () => {
  const oldFrom = fromTokenEl.value;
  fromTokenEl.value = toTokenEl.value;
  toTokenEl.value = oldFrom;
  refreshAll();
};

async function connectWallet() {
  try {
    if (!window.ethereum) {
      setStatus("MetaMask or compatible wallet not found");
      return;
    }

    provider = new ethers.BrowserProvider(window.ethereum);
    await provider.send("eth_requestAccounts", []);

    signer = await provider.getSigner();
    userAddress = await signer.getAddress();

    const network = await provider.getNetwork();

    if (Number(network.chainId) !== CONFIG.chainId) {
      await switchNetwork();
    }

    router = new ethers.Contract(CONFIG.routerAddress, ROUTER_ABI, signer);

    walletAddressEl.textContent = userAddress;
    networkNameEl.textContent = CONFIG.chainName;
    walletBox.classList.remove("hidden");
    connectBtn.textContent = "Connected";

    setStatus("Wallet connected");
    await refreshAll();

  } catch (err) {
    setStatus("Wallet connection failed: " + shortError(err));
  }
}

async function switchNetwork() {
  const hexChainId = "0x" + CONFIG.chainId.toString(16);

  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: hexChainId }]
    });
  } catch (switchError) {
    if (switchError.code === 4902) {
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [{
          chainId: hexChainId,
          chainName: CONFIG.chainName,
          rpcUrls: [CONFIG.rpcUrl],
          nativeCurrency: {
            name: "MATIC",
            symbol: "MATIC",
            decimals: 18
          },
          blockExplorerUrls: ["https://polygonscan.com"]
        }]
      });
    } else {
      throw switchError;
    }
  }
}

async function refreshAll() {
  if (!signer || !userAddress) return;
  await loadBalances();
  await quoteSwap();
}

async function loadBalances() {
  try {
    const from = CONFIG.tokens[fromTokenEl.value];
    const to = CONFIG.tokens[toTokenEl.value];

    const fromContract = new ethers.Contract(from.address, ERC20_ABI, provider);
    const toContract = new ethers.Contract(to.address, ERC20_ABI, provider);

    const fromBal = await fromContract.balanceOf(userAddress);
    const toBal = await toContract.balanceOf(userAddress);

    fromBalanceEl.textContent = Number(ethers.formatUnits(fromBal, from.decimals)).toFixed(6);
    toBalanceEl.textContent = Number(ethers.formatUnits(toBal, to.decimals)).toFixed(6);

  } catch (err) {
    setStatus("Balance loading failed: " + shortError(err));
  }
}

async function quoteSwap() {
  try {
    if (!router || !amountInEl.value || Number(amountInEl.value) <= 0) {
      amountOutEl.value = "";
      return;
    }

    const from = CONFIG.tokens[fromTokenEl.value];
    const to = CONFIG.tokens[toTokenEl.value];

    if (from.address.toLowerCase() === to.address.toLowerCase()) {
      setStatus("Choose two different tokens");
      return;
    }

    const amountIn = ethers.parseUnits(amountInEl.value, from.decimals);
    const path = [from.address, to.address];

    const amounts = await router.getAmountsOut(amountIn, path);
    amountOutEl.value = ethers.formatUnits(amounts[1], to.decimals);

    setStatus("Quote updated from real router");

  } catch (err) {
    amountOutEl.value = "";
    setStatus("No route or insufficient liquidity");
  }
}

async function executeSwap() {
  try {
    if (!signer || !userAddress) {
      setStatus("Connect wallet first");
      return;
    }

    const from = CONFIG.tokens[fromTokenEl.value];
    const to = CONFIG.tokens[toTokenEl.value];

    const amountIn = ethers.parseUnits(amountInEl.value, from.decimals);
    const path = [from.address, to.address];

    const amounts = await router.getAmountsOut(amountIn, path);
    const expectedOut = amounts[1];

    const slippage = Number(slippageEl.value || 1);
    const amountOutMin = expectedOut - (expectedOut * BigInt(Math.floor(slippage * 100)) / 10000n);

    const tokenContract = new ethers.Contract(from.address, ERC20_ABI, signer);

    const allowance = await tokenContract.allowance(userAddress, CONFIG.routerAddress);

    if (allowance < amountIn) {
      setStatus("Approval pending");
      const approveTx = await tokenContract.approve(CONFIG.routerAddress, amountIn);
      setStatus("Approval transaction sent: " + approveTx.hash);
      await approveTx.wait();
      setStatus("Approval confirmed");
    }

    const deadline = Math.floor(Date.now() / 1000) + 60 * 20;

    setStatus("Swap pending");

    const swapTx = await router.swapExactTokensForTokens(
      amountIn,
      amountOutMin,
      path,
      userAddress,
      deadline
    );

    setStatus("Swap transaction sent: " + swapTx.hash);

    const receipt = await swapTx.wait();

    if (receipt.status === 1) {
      setStatus("Swap successful: " + swapTx.hash);
      await refreshAll();
    } else {
      setStatus("Swap failed");
    }

  } catch (err) {
    setStatus("Swap failed: " + shortError(err));
  }
}

function setStatus(message) {
  statusBox.textContent = message;
}

function shortError(err) {
  return err?.reason || err?.shortMessage || err?.message || "Unknown error";
}
