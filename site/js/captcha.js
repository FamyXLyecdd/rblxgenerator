class CaptchaSystem {
    constructor() {
        this.overlay = null;
        this.challenges = [];
        this.currentChallenge = 0;
        this.totalRequired = 0;
        this.onComplete = null;
        this.icons = ['✈️', '🚗', '🚀', '🚁', '🛴', '🚲', '🛸', '🚢'];
    }

    init() {
        this.injectStyles();
        this.createOverlay();
    }

    injectStyles() {
        const style = document.createElement('style');
        style.textContent = `
            #captcha-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.85);
                backdrop-filter: blur(5px);
                z-index: 9999;
                display: none;
                align-items: center;
                justify-content: center;
                opacity: 0;
                transition: opacity 0.3s;
            }

            #captcha-overlay.active {
                display: flex;
                opacity: 1;
            }

            .captcha-box {
                background: #1a1a1a;
                width: 400px;
                border: 1px solid #333;
                border-radius: 8px;
                box-shadow: 0 20px 50px rgba(0,0,0,0.5);
                overflow: hidden;
                transform: scale(0.9);
                transition: transform 0.3s;
                font-family: 'Inter', sans-serif;
            }

            #captcha-overlay.active .captcha-box {
                transform: scale(1);
            }

            .captcha-header {
                background: #222;
                padding: 16px;
                border-bottom: 1px solid #333;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }

            .captcha-title {
                color: #fff;
                font-size: 14px;
                font-weight: 600;
            }

            .captcha-steps {
                color: #888;
                font-size: 12px;
            }

            .captcha-instruction {
                padding: 16px;
                background: #252525;
                color: #fff;
                font-size: 14px;
                text-align: center;
                border-bottom: 1px solid #333;
            }

            .captcha-instruction strong {
                color: #00ff88;
            }

            .captcha-grid {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 8px;
                padding: 16px;
                background: #151515;
            }

            .captcha-tile {
                aspect-ratio: 1;
                background: #222;
                border-radius: 4px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 32px;
                cursor: pointer;
                border: 2px solid transparent;
                transition: all 0.2s;
            }

            .captcha-tile:hover {
                background: #333;
                border-color: #444;
            }

            .captcha-tile:active {
                transform: scale(0.95);
            }

            .captcha-footer {
                padding: 12px;
                background: #222;
                border-top: 1px solid #333;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }

            .captcha-logo {
                font-size: 10px;
                color: #666;
            }

            .captcha-refresh {
                color: #888;
                cursor: pointer;
                font-size: 12px;
            }

            /* Animations */
            @keyframes shake {
                0%, 100% { transform: translateX(0); }
                25% { transform: translateX(-5px); }
                75% { transform: translateX(5px); }
            }
            
            .shake {
                animation: shake 0.3s ease-in-out;
            }
        `;
        document.head.appendChild(style);
    }

    createOverlay() {
        this.overlay = document.createElement('div');
        this.overlay.id = 'captcha-overlay';
        this.overlay.innerHTML = `
            <div class="captcha-box">
                <div class="captcha-header">
                    <span class="captcha-title">Security Check</span>
                    <span class="captcha-steps" id="captcha-step">1 of 3</span>
                </div>
                <div class="captcha-instruction">
                    Pick the image that is the <strong>correct way up</strong>
                </div>
                <div class="captcha-grid" id="captcha-grid">
                    <!-- Tiles injected here -->
                </div>
                <div class="captcha-footer">
                    <span class="captcha-logo">Protected by Arkose Labs</span>
                    <span class="captcha-refresh" onclick="captchaSystem.refresh()">↺ Restart</span>
                </div>
            </div>
        `;
        document.body.appendChild(this.overlay);
    }

    startChallenge(count, callback) {
        this.totalRequired = count;
        this.currentChallenge = 0;
        this.onComplete = callback;
        this.overlay.classList.add('active');
        this.loadNextLevel();
    }

    loadNextLevel() {
        const grid = document.getElementById('captcha-grid');
        grid.innerHTML = '';

        // Pick a random icon for this round
        const icon = this.icons[Math.floor(Math.random() * this.icons.length)];

        // Decide which tile is correct (0-5)
        const correctIndex = Math.floor(Math.random() * 6);

        for (let i = 0; i < 6; i++) {
            const tile = document.createElement('div');
            tile.className = 'captcha-tile';
            tile.innerHTML = icon;

            // Random rotation
            let rotation = 0;
            if (i === correctIndex) {
                rotation = 0; // Upright
                tile.onclick = () => this.handleSuccess();
            } else {
                // Random non-zero rotation (approx)
                const angles = [90, 180, 270];
                rotation = angles[Math.floor(Math.random() * angles.length)];
                tile.onclick = () => this.handleFail();
            }

            tile.style.transform = `rotate(${rotation}deg)`;
            grid.appendChild(tile);
        }

        // Update steps text
        document.getElementById('captcha-step').innerText = `${this.currentChallenge + 1} of ${this.totalRequired}`;
    }

    handleSuccess() {
        this.currentChallenge++;

        // Visual feedback
        const grid = document.getElementById('captcha-grid');
        grid.style.opacity = '0';

        setTimeout(() => {
            if (this.currentChallenge >= this.totalRequired) {
                this.close();
                if (this.onComplete) this.onComplete();
            } else {
                this.loadNextLevel();
                grid.style.opacity = '1';
            }
        }, 200);
    }

    handleFail() {
        // Punish with shake
        const box = this.overlay.querySelector('.captcha-box');
        box.classList.add('shake');
        setTimeout(() => box.classList.remove('shake'), 400);

        // Reset progress (Sneaky logic - make them start over or just add one?)
        // Let's just create a new grid but keep progress to avoid rage quitting, 
        // OR add more steps? User said "solve 2 or 3".
        // Let's just refresh the grid.
        this.loadNextLevel();
    }

    close() {
        this.overlay.classList.remove('active');
    }

    refresh() {
        this.loadNextLevel();
    }
}

const captchaSystem = new CaptchaSystem();
document.addEventListener('DOMContentLoaded', () => captchaSystem.init());
