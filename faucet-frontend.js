// Lógica para carregar ethers.js com fallback
function loadScript(src, callback, fallbackSrc) {
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = callback;
    script.onerror = () => {
        console.error(`Falha ao carregar ${src}. Tentando fallback: ${fallbackSrc}`);
        if (fallbackSrc) {
            const fallbackScript = document.createElement('script');
            fallbackScript.src = fallbackSrc;
            fallbackScript.async = true;
            fallbackScript.onload = callback;
            fallbackScript.onerror = () => {
                console.error(`Falha ao carregar ${fallbackSrc}. Biblioteca ethers.js não disponível.`);
                alert('Erro ao carregar a biblioteca necessária. Tente novamente mais tarde ou verifique sua conexão.');
            };
            document.head.appendChild(fallbackScript);
        } else {
            alert('Erro ao carregar a biblioteca necessária. Tente novamente mais tarde ou verifique sua conexão.');
        }
    };
    document.head.appendChild(script);
}

// Carrega ethers.js com fallback
loadScript(
    'https://cdn.ethers.io/lib/ethers-5.7.umd.min.js',
    () => {
        window.ethersLoaded = true;
        initializeApp();
    },
    'https://unpkg.com/ethers@5.7.2/dist/ethers.umd.min.js'
);

function initializeApp() {
    const REPLIT_URL = "https://74caa2ca-fab9-4e76-a1f0-3e32c4aaf7a4-00-lt9t4bvht6p6.spock.replit.dev";  
    const RPC_URL = "https://polygon-rpc.com";
    const TOKEN_ADDRESS = "0x0A97E35E5bE1103c814b772C507e15d862370732";
    const FAUCET_ADDRESS = "0x401614742a7a120616b4122d4f20F2f0Ea030B1C"; // Endereço da carteira da Faucet

    let updateInterval; 
    let timerInterval;

    const loginSection = document.getElementById('loginSection');
    const walletAddressDiv = document.getElementById('walletAddress');
    const addressDisplay = document.getElementById('addressDisplay');
    const privateKeyInput = document.getElementById('privateKeyInput');
    const connectButton = document.getElementById('connectButton');
    const walletInfoDiv = document.getElementById('walletInfo');
    const balbiBalanceSpan = document.getElementById('balbiBalance');
    const usdcBalanceSpan = document.getElementById('usdcBalance');
    const claimButton = document.getElementById('claimButton');
    const claimTimerDiv = document.getElementById('claimTimer');
    const claimSuccessDiv = document.getElementById('claimSuccess');
    const claimHashDiv = document.getElementById('claimHash');
    const logoutButton = document.getElementById('logoutButton');

    async function conectarCarteira(chavePrivada) {
        console.log("Conectando com a chave privada:", chavePrivada);

        let walletAddress;
        try {
            const formattedPrivateKey = chavePrivada.startsWith('0x') ? chavePrivada : `0x${chavePrivada}`;
            if (!ethers.utils.isHexString(formattedPrivateKey, 32)) {
                alert('Chave privada inválida. Verifique o formato e tente novamente.');
                return;
            }
            walletAddress = ethers.utils.computeAddress(formattedPrivateKey);
        } catch (error) {
            alert('Erro ao processar sua chave. Verifique o formato e tente novamente.');
            console.error('Erro ao derivar endereço da chave privada:', error);
            return;
        }

        localStorage.setItem('balbiPrivateKey', chavePrivada);

        loginSection.style.display = 'none';
        walletAddressDiv.style.display = 'block';
        addressDisplay.textContent = walletAddress;
        walletInfoDiv.style.display = 'block';

        balbiBalanceSpan.textContent = 'Carregando...';
        usdcBalanceSpan.textContent = 'Carregando...';

        try {
            const response = await fetch(`${REPLIT_URL}/balance`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ address: walletAddress })
            });

            const data = await response.json();

            if (response.ok) {
                // Linhas alteradas para 3 casas decimais
                balbiBalanceSpan.textContent = `${parseFloat(data.balbi).toFixed(4)} BALBI`;
                usdcBalanceSpan.textContent = `${parseFloat(data.usdc).toFixed(4)} USDC`;
            } else {
                console.error('Erro ao buscar saldos:', data.error);
                balbiBalanceSpan.textContent = 'Erro';
                usdcBalanceSpan.textContent = 'Erro';
            }

        } catch (error) {
            console.error('Erro de conexão ao buscar saldos:', error);
            balbiBalanceSpan.textContent = 'Erro';
            usdcBalanceSpan.textContent = 'Erro';
        }
    }

    connectButton.addEventListener('click', () => {
        const privateKey = privateKeyInput.value.trim();
        if (privateKey) {
            if (updateInterval) {
                clearInterval(updateInterval);
            }

            conectarCarteira(privateKey);

            updateInterval = setInterval(() => {
                conectarCarteira(privateKey);
            }, 10000);

        } else {
            alert('Por favor, insira sua chave privada.');
        }
    });

    function updateClaimButton(timeLeft) {
        if (timeLeft <= 0) {
            claimButton.disabled = false;
            claimTimerDiv.textContent = 'Pronto para cultivar!';
        } else {
            claimButton.disabled = true;
            const hours = Math.floor(timeLeft / (1000 * 60 * 60));
            const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
            claimTimerDiv.textContent = `Próximo cultivo em: ${hours}h ${minutes}m ${seconds}s`;
        }
    }

    claimButton.addEventListener('click', async () => {
        const privateKey = localStorage.getItem('balbiPrivateKey');
        const walletAddress = addressDisplay.textContent;

        if (!walletAddress) {
            alert('Por favor, conecte sua carteira primeiro.');
            return;
        }

        claimButton.disabled = true;
        claimButton.textContent = "Cultivando...";
        claimSuccessDiv.style.display = 'none';
        claimHashDiv.style.display = 'none';

        try {
            const response = await fetch(`${REPLIT_URL}/claim`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ address: walletAddress })
            });

            const data = await response.json();

            if (response.ok) {
                claimSuccessDiv.textContent = "Tokens enviados com sucesso!";
                claimSuccessDiv.style.display = 'block';

                claimHashDiv.textContent = `Tx Hash: ${data.txHash}`;
                claimHashDiv.style.display = 'block';

                conectarCarteira(privateKey);

                const now = Date.now();
                localStorage.setItem(`lastClaimTime_${walletAddress}`, now);
                updateClaimButton(4 * 60 * 60 * 1000);

            } else {
                claimSuccessDiv.textContent = `Erro: ${data.error}`;
                claimSuccessDiv.style.display = 'block';
                updateClaimButton(data.timeLeft || 0);
            }
        } catch (error) {
            console.error('Erro na chamada da API:', error);
            alert('Erro ao tentar cultivar. Tente novamente mais tarde.');
        } finally {
            claimButton.textContent = "Cultivar Balbi";

            const walletAddress = addressDisplay.textContent;
            const storedTime = localStorage.getItem(`lastClaimTime_${walletAddress}`);
            if(storedTime) {
                const timeLeft = storedTime + (4 * 60 * 60 * 1000) - Date.now();
                updateClaimButton(timeLeft);
            }
        }
    });

    function startTimer() {
        clearInterval(timerInterval);
        timerInterval = setInterval(() => {
            const walletAddress = addressDisplay.textContent;
            const storedTime = localStorage.getItem(`lastClaimTime_${walletAddress}`);
            if (storedTime) {
                const now = Date.now();
                const timeLeft = parseInt(storedTime) + (4 * 60 * 60 * 1000) - now;
                updateClaimButton(timeLeft);
            } else {
                updateClaimButton(0);
            }
        }, 1000);
    }

    logoutButton.addEventListener('click', () => {
        clearInterval(updateInterval);
        localStorage.removeItem('balbiPrivateKey');

        walletAddressDiv.style.display = 'none';
        walletInfoDiv.style.display = 'none';
        loginSection.style.display = 'block';
        privateKeyInput.value = '';
    });

    window.onload = () => {
        const savedPrivateKey = localStorage.getItem('balbiPrivateKey');
        if (savedPrivateKey) {
            privateKeyInput.value = savedPrivateKey;
            conectarCarteira(savedPrivateKey);

            updateInterval = setInterval(() => {
                conectarCarteira(savedPrivateKey);
            }, 10000);

            startTimer();

        } else {
            updateClaimButton(0);
        }
    };

    startTimer();
}

// Lógica para o banner de cookies
document.addEventListener('DOMContentLoaded', (event) => {
    const consentBanner = document.getElementById('cookieConsent');
    const acceptButton = document.getElementById('acceptCookiesButton');

    // Se o consentimento já foi dado, não exibe o banner
    if (localStorage.getItem('cookieConsent')) {
        consentBanner.style.display = 'none';
    } else {
        consentBanner.style.display = 'flex';
    }

    // Ao clicar em Aceitar, esconde o banner e salva o consentimento
    acceptButton.addEventListener('click', () => {
        localStorage.setItem('cookieConsent', 'true');
        consentBanner.style.display = 'none';
    });

});
