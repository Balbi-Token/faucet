// Load ethers.js with fallback
function loadScript(src, callback, fallbackSrc) {
  const script = document.createElement('script');
  script.src = src;
  script.async = true;
  script.onload = callback;
  script.onerror = () => {
    console.error(`Failed to load ${src}. Trying fallback: ${fallbackSrc}`);
    if (fallbackSrc) {
      const fallbackScript = document.createElement('script');
      fallbackScript.src = fallbackSrc;
      fallbackScript.async = true;
      fallbackScript.onload = callback;
      fallbackScript.onerror = () => {
        console.error(`Failed to load ${fallbackSrc}. ethers.js is unavailable.`);
        alert('Error loading required library. Please try again later or check your connection.');
      };
      document.head.appendChild(fallbackScript);
    } else {
      alert('Error loading required library. Please try again later or check your connection.');
    }
  };
  document.head.appendChild(script);
}

// Load ethers.js (v5 UMD) with fallback
loadScript(
  'https://cdn.ethers.io/lib/ethers-5.7.umd.min.js',
  () => { window.ethersLoaded = true; initializeApp(); },
  'https://unpkg.com/ethers@5.7.2/dist/ethers.umd.min.js'
);

function initializeApp() {
  // === CONFIG ===
  const REPLIT_URL    = "https://74caa2ca-fab9-4e76-a1f0-3e32c4aaf7a4-00-lt9t4bvht6p6.spock.replit.dev";
  const RPC_URL       = "https://polygon-rpc.com";
  const TOKEN_ADDRESS = "0x0A97E35E5bE1103c814b772C507e15d862370732";
  const FAUCET_ADDRESS = "0x401614742a7a120616b4122d4f20F2f0Ea030B1C"; // FYI (not used on FE)

  let updateInterval = null;
  let timerInterval  = null;

  // === DOM ===
  const loginSection      = document.getElementById('loginSection');
  const walletAddressDiv  = document.getElementById('walletAddress');
  const addressDisplay    = document.getElementById('addressDisplay');
  const privateKeyInput   = document.getElementById('privateKeyInput');
  const connectButton     = document.getElementById('connectButton');
  const walletInfoDiv     = document.getElementById('walletInfo');
  const balbiBalanceSpan  = document.getElementById('balbiBalance');
  const usdcBalanceSpan   = document.getElementById('usdcBalance');
  const claimButton       = document.getElementById('claimButton');
  const claimTimerDiv     = document.getElementById('claimTimer');
  const claimSuccessDiv   = document.getElementById('claimSuccess');
  const claimHashDiv      = document.getElementById('claimHash');
  const logoutButton      = document.getElementById('logoutButton');

  // === Helpers ===
  function sanitizePk(pk) {
    return (pk || '').trim().replace(/\s+/g, '');
  }

  function deriveAddressFromPrivateKey(pk) {
    const formatted = pk.startsWith('0x') ? pk : `0x${pk}`;
    if (!ethers.utils.isHexString(formatted, 32)) {
      throw new Error('Invalid private key format');
    }
    return ethers.utils.computeAddress(formatted);
  }

  async function refreshBalances(address) {
    if (!address) return;
    try {
      balbiBalanceSpan.textContent = 'Loading...';
      usdcBalanceSpan.textContent  = 'Loading...';

      const response = await fetch(`${REPLIT_URL}/balance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address })
      });

      const data = await response.json();
      if (response.ok) {
        balbiBalanceSpan.textContent = `${parseFloat(data.balbi).toFixed(3)} BALBI`;
        usdcBalanceSpan.textContent  = `${parseFloat(data.usdc).toFixed(3)} USDC`;
      } else {
        console.error('Balance error:', data.error);
        balbiBalanceSpan.textContent = 'Error';
        usdcBalanceSpan.textContent  = 'Error';
      }
    } catch (err) {
      console.error('Network error while fetching balances:', err);
      balbiBalanceSpan.textContent = 'Error';
      usdcBalanceSpan.textContent  = 'Error';
    }
  }

  function updateClaimButton(timeLeft) {
    if (timeLeft <= 0) {
      claimButton.disabled = false;
      claimTimerDiv.textContent = 'Ready to claim!';
      claimButton.setAttribute('aria-disabled', 'false');
      claimButton.title = 'Ready to claim';
    } else {
      claimButton.disabled = true;
      const hours   = Math.floor(timeLeft / (1000 * 60 * 60));
      const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
      claimTimerDiv.textContent = `Next claim in: ${hours}h ${minutes}m ${seconds}s`;
      claimButton.setAttribute('aria-disabled', 'true');
      claimButton.title = 'Wait until the next claim window';
    }
  }

  function startTimer() {
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      const address = (addressDisplay.textContent || '').trim();
      if (!address) {
        claimButton.disabled = true;
        claimTimerDiv.textContent = '';
        return;
      }
      const storedTime = localStorage.getItem(`lastClaimTime_${address}`);
      if (storedTime) {
        const now = Date.now();
        const timeLeft = parseInt(storedTime, 10) + (4 * 60 * 60 * 1000) - now;
        updateClaimButton(timeLeft);
      } else {
        updateClaimButton(0);
      }
    }, 1000);
  }

  async function connectWallet(privateKey) {
    try {
      const pk = sanitizePk(privateKey);
      const walletAddress = deriveAddressFromPrivateKey(pk);

      // DO NOT store private key anywhere
      // localStorage.setItem('balbiPrivateKey', pk); // removed on purpose

      // Show sections
      loginSection.style.display     = 'none';
      walletAddressDiv.style.display = 'block';
      walletInfoDiv.style.display    = 'block';
      addressDisplay.textContent     = walletAddress;

      // Balances
      await refreshBalances(walletAddress);

      // Refresh balances every 10s
      if (updateInterval) clearInterval(updateInterval);
      updateInterval = setInterval(() => refreshBalances(walletAddress), 10000);

      // Start/refresh timer loop
      startTimer();

    } catch (err) {
      console.error('Error deriving address from private key:', err);
      alert('Invalid private key. Check the format and try again.');
    }
  }

  // === Events ===
  connectButton.addEventListener('click', () => {
    const privateKey = sanitizePk(privateKeyInput.value);
    if (!privateKey) {
      alert('Please enter your private key.');
      return;
    }
    connectWallet(privateKey);
  });

  claimButton.addEventListener('click', async () => {
    const walletAddress = (addressDisplay.textContent || '').trim();
    if (!walletAddress) {
      alert('Please connect your wallet first.');
      return;
    }

    claimButton.disabled = true;
    const originalLabel  = 'Claim Balbi';
    claimButton.textContent = 'Claiming...';
    claimSuccessDiv.style.display = 'none';
    claimHashDiv.style.display    = 'none';

    try {
      const response = await fetch(`${REPLIT_URL}/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: walletAddress })
      });

      const data = await response.json();
      if (response.ok) {
        claimSuccessDiv.textContent = "Tokens sent successfully!";
        claimSuccessDiv.style.display = 'block';

        claimHashDiv.textContent = `Tx Hash: ${data.txHash}`;
        claimHashDiv.style.display = 'block';

        // Save last claim time (per address)
        const now = Date.now();
        localStorage.setItem(`lastClaimTime_${walletAddress}`, now);
        updateClaimButton(4 * 60 * 60 * 1000);

        // Refresh balances (no need to re-derive address or use private key)
        await refreshBalances(walletAddress);

      } else {
        claimSuccessDiv.textContent = `Error: ${data.error || 'Unknown error'}`;
        claimSuccessDiv.style.display = 'block';
        updateClaimButton(data.timeLeft || 0);
      }

    } catch (err) {
      console.error('API error on claim:', err);
      alert('Error while claiming. Please try again later.');
    } finally {
      claimButton.textContent = originalLabel;

      const storedTime = localStorage.getItem(`lastClaimTime_${walletAddress}`);
      if (storedTime) {
        const timeLeft = parseInt(storedTime, 10) + (4 * 60 * 60 * 1000) - Date.now();
        updateClaimButton(timeLeft);
      }
    }
  });

  logoutButton.addEventListener('click', () => {
    if (updateInterval) clearInterval(updateInterval);
    if (timerInterval)  clearInterval(timerInterval);

    walletAddressDiv.style.display = 'none';
    walletInfoDiv.style.display    = 'none';
    loginSection.style.display     = 'block';
    privateKeyInput.value          = '';

    // Keep lastClaimTime per address if you want user to keep cooldown even after logout.
    // If you prefer to clear it on logout, uncomment below:
    // const addr = (addressDisplay.textContent || '').trim();
    // if (addr) localStorage.removeItem(`lastClaimTime_${addr}`);
    addressDisplay.textContent     = '';
    claimTimerDiv.textContent      = '';
    claimButton.disabled           = true;
  });

  // On load: ensure input is empty and button disabled; DO NOT auto-connect or auto-fill
  window.onload = () => {
    try { localStorage.removeItem('balbiPrivateKey'); } catch(e) {} // legacy cleanup
    if (privateKeyInput) privateKeyInput.value = '';
    claimButton.disabled = true;
    claimTimerDiv.textContent = '';
  };

  // Start timer loop idle (will keep button disabled until connect)
  startTimer();
}

// Cookie banner (unchanged – English copy lives in HTML)
document.addEventListener('DOMContentLoaded', () => {
  const consentBanner = document.getElementById('cookieConsent');
  const acceptButton  = document.getElementById('acceptCookiesButton');

  if (!consentBanner || !acceptButton) return;

  if (localStorage.getItem('cookieConsent')) {
    consentBanner.style.display = 'none';
  } else {
    consentBanner.style.display = 'flex';
  }

  acceptButton.addEventListener('click', () => {
    localStorage.setItem('cookieConsent', 'true');
    consentBanner.style.display = 'none';
  });
});
