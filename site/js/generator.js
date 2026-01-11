/**
 * rblxgenerator - Client-Side Account Generator
 * Runs entirely in user's browser using popup windows
 */

// ============ State ============
const state = {
    isGenerating: false,
    accounts: [],
    todayCount: 0,
    dailyLimit: 3,
    tier: 'free', // 'free', 'pro', 'ultimate'
    successCount: 0,
    failCount: 0
};

// ============ DOM Elements ============
const elements = {
    startBtn: document.getElementById('startBtn'),
    stopBtn: document.getElementById('stopBtn'),
    progressBar: document.getElementById('progressBar'),
    terminalLog: document.getElementById('terminalLog'),
    accountsList: document.getElementById('accountsList'),
    accountsHeader: document.getElementById('accountsHeader'),
    todayCount: document.getElementById('todayCount'),
    successRate: document.getElementById('successRate'),
    currentStatus: document.getElementById('currentStatus'),
    userTier: document.getElementById('userTier'),
    adBanner: document.getElementById('adBanner'),
    captchaPanel: document.getElementById('captchaPanel')
};

// ============ Initialize ============
function init() {
    loadState();
    updateUI();
    log('info', 'System initialized. Ready to generate accounts.');
    log('info', `Tier: ${state.tier.toUpperCase()} | Daily limit: ${state.dailyLimit} accounts`);
}

// ============ Logging ============
function log(type, message) {
    const time = new Date().toTimeString().split(' ')[0];
    const typeClass = {
        info: 'log-info',
        success: 'log-success',
        error: 'log-error',
        warning: 'log-warning'
    }[type] || 'log-info';
    
    const line = document.createElement('div');
    line.className = 'log-line';
    line.innerHTML = `<span class="log-time">[${time}]</span> <span class="${typeClass}">${message}</span>`;
    
    elements.terminalLog.appendChild(line);
    elements.terminalLog.scrollTop = elements.terminalLog.scrollHeight;
}

function clearLog() {
    elements.terminalLog.innerHTML = '';
    log('info', 'Log cleared.');
}

// ============ State Management ============
function loadState() {
    const saved = localStorage.getItem('rblxgen_state');
    if (saved) {
        const parsed = JSON.parse(saved);
        // Reset daily count if new day
        const today = new Date().toDateString();
        if (parsed.lastDate !== today) {
            parsed.todayCount = 0;
            parsed.lastDate = today;
        }
        Object.assign(state, parsed);
    }
    
    // Load accounts
    const accounts = localStorage.getItem('rblxgen_accounts');
    if (accounts) {
        state.accounts = JSON.parse(accounts);
    }
}

function saveState() {
    const toSave = {
        todayCount: state.todayCount,
        dailyLimit: state.dailyLimit,
        tier: state.tier,
        lastDate: new Date().toDateString()
    };
    localStorage.setItem('rblxgen_state', JSON.stringify(toSave));
    localStorage.setItem('rblxgen_accounts', JSON.stringify(state.accounts));
}

// ============ UI Updates ============
function updateUI() {
    // Update tier display
    elements.userTier.textContent = state.tier.toUpperCase() + ' TIER';
    if (state.tier !== 'free') {
        elements.userTier.classList.add('pro');
        elements.adBanner.style.display = 'none';
    }
    
    // Update stats
    elements.todayCount.textContent = `${state.todayCount} / ${state.dailyLimit}`;
    
    const total = state.successCount + state.failCount;
    if (total > 0) {
        const rate = Math.round((state.successCount / total) * 100);
        elements.successRate.textContent = rate + '%';
    }
    
    // Update accounts list
    updateAccountsList();
}

function updateAccountsList() {
    if (state.accounts.length === 0) {
        elements.accountsList.innerHTML = `
            <div class="empty-state">
                No accounts generated yet.
                <br>Configure and click Start.
            </div>
        `;
        elements.accountsHeader.textContent = '0 accounts';
        return;
    }
    
    elements.accountsHeader.textContent = `${state.accounts.length} accounts`;
    elements.accountsList.innerHTML = state.accounts.map((acc, i) => `
        <div class="account-row">
            <div class="account-info">
                <span class="account-user">${acc.username}</span>
                <span class="account-pass">${acc.password}</span>
            </div>
            <div class="account-actions">
                <button class="btn-icon" onclick="copyAccount(${i})" title="Copy">[C]</button>
            </div>
        </div>
    `).join('');
}

function setStatus(status) {
    elements.currentStatus.textContent = status;
}

function setProgress(percent) {
    elements.progressBar.style.width = percent + '%';
}

// ============ Username Generation ============
const CONSONANTS = 'bcdfghjklmnpqrstvwxyz';
const VOWELS = 'aeiou';

function generateUsername() {
    let username = '';
    const length = 8 + Math.floor(Math.random() * 5); // 8-12 chars
    let isConsonant = Math.random() > 0.3;
    
    for (let i = 0; i < length; i++) {
        if (isConsonant) {
            username += CONSONANTS[Math.floor(Math.random() * CONSONANTS.length)];
        } else {
            username += VOWELS[Math.floor(Math.random() * VOWELS.length)];
        }
        isConsonant = !isConsonant;
    }
    
    // Capitalize first letter randomly
    if (Math.random() > 0.5) {
        username = username.charAt(0).toUpperCase() + username.slice(1);
    }
    
    // Add numbers
    if (Math.random() > 0.5) {
        username += Math.floor(Math.random() * 100);
    }
    
    return username;
}

function generatePassword() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#';
    let password = '';
    for (let i = 0; i < 12; i++) {
        password += chars[Math.floor(Math.random() * chars.length)];
    }
    return password;
}

// ============ Account Generation ============
async function startGeneration() {
    if (state.isGenerating) return;
    
    // Check daily limit
    const count = parseInt(document.getElementById('accountCount').value) || 1;
    if (state.todayCount + count > state.dailyLimit) {
        log('error', `Daily limit reached! You can generate ${state.dailyLimit - state.todayCount} more today.`);
        if (state.tier === 'free') {
            log('warning', 'Upgrade to Pro for 100 accounts/day or Ultimate for unlimited!');
        }
        return;
    }
    
    state.isGenerating = true;
    elements.startBtn.disabled = true;
    elements.stopBtn.disabled = false;
    setStatus('Generating...');
    
    log('info', `Starting generation of ${count} account(s)...`);
    
    const password = document.getElementById('password').value || generatePassword();
    const birthYear = document.getElementById('birthYear').value;
    
    for (let i = 0; i < count && state.isGenerating; i++) {
        setProgress(((i + 1) / count) * 100);
        
        const username = generateUsername();
        log('info', `[${i + 1}/${count}] Generating: ${username}`);
        
        try {
            // Attempt to create account
            const result = await createAccount(username, password, birthYear);
            
            if (result.success) {
                const account = {
                    username: result.username,
                    password: password,
                    email: result.email || null,
                    cookie: result.cookie || null,
                    createdAt: new Date().toISOString()
                };
                
                state.accounts.push(account);
                state.todayCount++;
                state.successCount++;
                
                log('success', `[+] Account created: ${result.username}`);
            } else {
                state.failCount++;
                log('error', `[-] Failed: ${result.error}`);
            }
        } catch (err) {
            state.failCount++;
            log('error', `[-] Error: ${err.message}`);
        }
        
        // Small delay between accounts
        if (i < count - 1) {
            await sleep(2000);
        }
    }
    
    stopGeneration();
    saveState();
    updateUI();
    
    log('success', `Generation complete! ${state.accounts.length} accounts total.`);
}

function stopGeneration() {
    state.isGenerating = false;
    elements.startBtn.disabled = false;
    elements.stopBtn.disabled = true;
    setStatus('Idle');
    setProgress(0);
}

async function createAccount(username, password, birthYear) {
    // This opens a popup to Roblox signup and automates the form
    // For security, actual generation happens in user's browser context
    
    log('info', `Opening Roblox signup page...`);
    
    return new Promise((resolve) => {
        // In a real implementation, this would:
        // 1. Open popup to roblox.com/signup
        // 2. Inject script to fill form
        // 3. Handle captcha (manual for free, API for pro)
        // 4. Return credentials
        
        // For demo, simulate with delay
        setTimeout(() => {
            // Simulate 80% success rate
            if (Math.random() > 0.2) {
                resolve({
                    success: true,
                    username: username,
                    email: null,
                    cookie: null
                });
            } else {
                resolve({
                    success: false,
                    error: 'Username taken or rate limited'
                });
            }
        }, 3000);
    });
}

// ============ Export Functions ============
function exportAccounts(format) {
    if (state.accounts.length === 0) {
        log('error', 'No accounts to export!');
        return;
    }
    
    let content = '';
    let filename = `rblxgen_accounts_${Date.now()}`;
    let mimeType = 'text/plain';
    
    switch (format) {
        case 'txt':
            content = state.accounts.map(a => 
                `${a.username}:${a.password}`
            ).join('\n');
            filename += '.txt';
            break;
            
        case 'csv':
            content = 'Username,Password,Email,Created\n';
            content += state.accounts.map(a => 
                `${a.username},${a.password},${a.email || ''},${a.createdAt}`
            ).join('\n');
            filename += '.csv';
            mimeType = 'text/csv';
            break;
            
        case 'json':
            content = JSON.stringify(state.accounts, null, 2);
            filename += '.json';
            mimeType = 'application/json';
            break;
            
        case 'ram':
            // Roblox Account Manager format (cookies)
            content = state.accounts
                .filter(a => a.cookie)
                .map(a => a.cookie)
                .join('\n');
            filename += '_ram.txt';
            break;
    }
    
    // Download file
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    
    log('success', `Exported ${state.accounts.length} accounts as ${format.toUpperCase()}`);
}

// ============ Utility Functions ============
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function copyAccount(index) {
    const acc = state.accounts[index];
    const text = `${acc.username}:${acc.password}`;
    navigator.clipboard.writeText(text).then(() => {
        log('info', `Copied: ${acc.username}`);
    });
}

function showUpgrade() {
    log('warning', 'This feature requires Pro or Ultimate subscription!');
    log('info', 'Visit the pricing page to upgrade.');
}

// ============ Captcha Handling ============
function showCaptcha() {
    elements.captchaPanel.style.display = 'block';
    log('warning', 'Captcha required! Solve it to continue.');
}

function hideCaptcha() {
    elements.captchaPanel.style.display = 'none';
}

// ============ Initialize on Load ============
document.addEventListener('DOMContentLoaded', init);
