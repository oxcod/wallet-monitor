const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { glob } = require('glob');

const app = express();
const PORT = 8099;

app.use(cors());
app.use(express.json());

let WALLET_CONFIG = [];

function generateWalletConfig() {
    console.log('Auto-generating wallet configuration...');
    
    // Remove old configuration file if exists
    if (fs.existsSync('./wallet_config.js')) {
        fs.unlinkSync('./wallet_config.js');
        console.log('Removed old wallet_config.js');
    }
    
    const walletConfigs = [];
    
    try {
        const urlFiles = glob.sync('../The browser wallet URL of account *.txt');
        console.log(`Found ${urlFiles.length} wallet URL files`);
        
        urlFiles.forEach(file => {
            try {
                const filename = path.basename(file, '.txt');
                const address = filename.replace('The browser wallet URL of account ', '');
                const url = fs.readFileSync(file, 'utf8').trim();
                const portMatch = url.match(/:(\d+)$/);
                const port = portMatch ? parseInt(portMatch[1]) : null;
                
                if (port) {
                    walletConfigs.push({ address, url, port });
                    console.log(`Added wallet: ${address} -> ${url}`);
                }
            } catch (error) {
                console.error(`Error processing file ${file}:`, error.message);
            }
        });
        
        if (walletConfigs.length > 0) {
            const configContent = `const WALLET_CONFIG = ${JSON.stringify(walletConfigs, null, 4)};\n`;
            fs.writeFileSync('wallet_config.js', configContent);
            console.log(`Generated wallet_config.js with ${walletConfigs.length} wallet(s)`);
        } else {
            console.log('No wallet URL files found, creating empty config');
            fs.writeFileSync('wallet_config.js', 'const WALLET_CONFIG = [];\n');
        }
    } catch (error) {
        console.error('Error generating config:', error.message);
        fs.writeFileSync('wallet_config.js', 'const WALLET_CONFIG = [];\n');
    }
    
    return walletConfigs;
}

let configGenerated = false;

function loadWalletConfig() {
    try {
        if (!fs.existsSync('./wallet_config.js')) {
            if (!configGenerated) {
                WALLET_CONFIG = generateWalletConfig();
                configGenerated = true;
            }
            return;
        }
        
        delete require.cache[path.resolve('./wallet_config.js')];
        const configContent = fs.readFileSync('./wallet_config.js', 'utf8');
        const configMatch = configContent.match(/const WALLET_CONFIG = (\[[\s\S]*?\]);/);
        if (configMatch) {
            WALLET_CONFIG = eval(configMatch[1]);
            console.log(`Loaded ${WALLET_CONFIG.length} wallet configurations`);
        }
    } catch (error) {
        console.error('Error loading wallet config:', error.message);
        if (!configGenerated) {
            WALLET_CONFIG = generateWalletConfig();
            configGenerated = true;
        }
    }
}

async function fetchWithTimeout(url, options = {}, timeout = 6000) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        return response;
    } catch (error) {
        clearTimeout(timeoutId);
        throw error;
    }
}

app.get('/api/wallets', (req, res) => {
    loadWalletConfig();
    res.json({
        success: true,
        data: WALLET_CONFIG.map(wallet => ({
            address: wallet.address,
            port: wallet.port
        }))
    });
});

app.get('/api/wallet/:address/balance', async (req, res) => {
    const { address } = req.params;
    const wallet = WALLET_CONFIG.find(w => w.address === address);
    
    if (!wallet) {
        return res.status(404).json({
            success: false,
            error: 'Wallet not found'
        });
    }
    
    try {
        const response = await fetchWithTimeout(`${wallet.url}/api/balance`);
        
        if (response.ok) {
            const data = await response.json();
            res.json({
                success: true,
                data: {
                    address: wallet.address,
                    port: wallet.port,
                    balance: parseFloat(data.balance) || 0,
                    status: 'online'
                }
            });
        } else {
            throw new Error(`HTTP ${response.status}`);
        }
    } catch (error) {
        res.json({
            success: false,
            data: {
                address: wallet.address,
                port: wallet.port,
                balance: 0,
                status: 'offline',
                error: error.name === 'AbortError' ? 'Connection timeout' : error.message
            }
        });
    }
});

app.get('/api/network/status', async (req, res) => {
    loadWalletConfig();
    
    const results = await Promise.allSettled(
        WALLET_CONFIG.map(async (wallet) => {
            try {
                const response = await fetchWithTimeout(`${wallet.url}/api/balance`);
                if (response.ok) {
                    const data = await response.json();
                    return {
                        address: wallet.address,
                        port: wallet.port,
                        balance: parseFloat(data.balance) || 0,
                        status: 'online',
                        error: null
                    };
                } else {
                    throw new Error(`HTTP ${response.status}`);
                }
            } catch (error) {
                return {
                    address: wallet.address,
                    port: wallet.port,
                    balance: 0,
                    status: 'offline',
                    error: error.name === 'AbortError' ? 'Connection timeout' : error.message
                };
            }
        })
    );
    
    const wallets = results.map(result => result.status === 'fulfilled' ? result.value : result.reason);
    const totalNodes = wallets.length;
    const activeNodes = wallets.filter(w => w.status === 'online').length;
    const inactiveNodes = wallets.filter(w => w.status === 'offline').length;
    const totalBalance = wallets.filter(w => w.status === 'online').reduce((sum, w) => sum + w.balance, 0);
    
    res.json({
        success: true,
        data: {
            summary: {
                total_nodes: totalNodes,
                active_nodes: activeNodes,
                inactive_nodes: inactiveNodes,
                total_balance: totalBalance
            },
            wallets: wallets,
            timestamp: new Date().toISOString()
        }
    });
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'wallet_monitor_auto.html'));
});

app.get('/wallet_monitor_auto.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'wallet_monitor_auto.html'));
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Wallet API Server running on port ${PORT}`);
    console.log(`Dashboard: http://localhost:${PORT}`);
    loadWalletConfig();
});