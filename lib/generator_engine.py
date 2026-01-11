import time
import base64
import random
import os
import asyncio
from datetime import datetime
from DrissionPage import Chromium, ChromiumOptions, errors
from lib.lib import Main, getResourcePath

# Re-use the existing Main library from lib.lib
lib = Main()

def run_generator(state, config):
    """
    Main generator logic wrapper.
    state: SystemState object from server.py
    config: Dict of configuration options from dashboard
    """
    state.status = "INITIALIZING"
    state.logs.append("Starting engine...")
    
    # Setup Browser
    co = ChromiumOptions()
    co.set_argument("--lang", "en")
    co.auto_port().mute(True)
    # Fix: use argument for window size
    co.set_argument('--window-size=800,700')
    co.headless(False) 

    try:
        browser = Chromium(addr_or_opts=co)
        state.browser_instance = browser
        page = browser.latest_tab
        
        # SNEAKY LOOP: Generate N-1 hidden accounts, then 1 user account
        total_accounts = 2 
        
        for i in range(total_accounts):
            # Explicitly clear session using correct DrissionPage syntax
            page.set.cookies.clear()
            time.sleep(0.5)

            is_hidden_round = (i < total_accounts - 1)
            state.status = "GENERATING"
            
            if is_hidden_round:
                state.logs.append("Security Verification (1/2)...")
            else:
                state.logs.append("Finalizing (2/2)...")
            
            # 1. Navigation
            page.get("https://www.roblox.com/CreateAccount")
            
            # Generate Data
            username = config.get('username') or lib.usernameCreator(None)
            if i > 0: username = lib.usernameCreator(None) 
            password = config.get('password') or "RobloxGen123!"
            
            # 2. Form Filling
            try:
                page.ele("#MonthDropdown").select.by_index(random.randint(1, 12))
                page.ele("#DayDropdown").select.by_index(random.randint(1, 28))
                page.ele("#YearDropdown").select.by_value(str(random.randint(1990, 2005)))
            except: pass
            
            page.ele("#signup-username").input(username)
            page.ele("#signup-password").input(password)
            time.sleep(0.5)
            
            try:
                 page.ele("#FemaleButton").click() if random.random() > 0.5 else page.ele("#MaleButton").click()
            except: pass

            state.logs.append("Submitting form...")
            page.ele("#signup-button").click()
            
            # 3. Captcha & Verification Loop
            max_retries = 120
            check_count = 0
            
            cycle_complete = False
            
            while check_count < max_retries:
                if state.stop_flag: return
                
                # Check Captcha Frame
                captcha_ele = page.ele('xpath://iframe[contains(@src, "arkose") or contains(@src, "funcaptcha")]', timeout=0.5)
                
                if captcha_ele:
                    state.status = "CAPTCHA_WAITING"
                    if not is_hidden_round:
                        state.logs.append("Captcha detected. Waiting for solution...")
                    
                    # Snapshot Loop
                    while True: 
                        if not page.ele('xpath://iframe[contains(@src, "arkose") or contains(@src, "funcaptcha")]'):
                            state.status = "GENERATING"
                            break

                        try:
                            # full_page=False for exact viewport mapping
                            screenshot_bytes = page.get_screenshot(path=None, as_bytes=True, full_page=False)
                            state.captcha_image = base64.b64encode(screenshot_bytes).decode('utf-8')
                        except: pass
                        
                        # PROCESS CLICK QUEUE
                        while state.click_queue:
                            try:
                                norm_x, norm_y = state.click_queue.pop(0)
                                vw, vh = page.run_js('return [window.innerWidth, window.innerHeight]')
                                click_x = int(norm_x * vw)
                                click_y = int(norm_y * vh)
                                
                                # VISUAL DEBUG: Inject Red Dot to verify alignment on stream
                                dot_js = f"""
                                var d = document.createElement('div');
                                d.style.position='fixed'; d.style.left='{click_x-5}px'; d.style.top='{click_y-5}px';
                                d.style.width='10px'; d.style.height='10px'; d.style.background='red';
                                d.style.borderRadius='50%'; d.style.zIndex='999999'; d.style.pointerEvents='none';
                                document.body.appendChild(d);
                                setTimeout(() => d.remove(), 1000);
                                """
                                page.run_js(dot_js)
                                
                                # CDP CLICK (Low Level - Raw Input)
                                # This bypasses high-level wrappers and sends raw mouse events to the browser kernel
                                page.run_cdp('Input.dispatchMouseEvent', type='mousePressed', x=click_x, y=click_y, button='left', clickCount=1)
                                time.sleep(0.05)
                                page.run_cdp('Input.dispatchMouseEvent', type='mouseReleased', x=click_x, y=click_y, button='left', clickCount=1)
                                
                                state.logs.append(f"CDP Input: {click_x},{click_y}")
                            except Exception as e:
                                state.logs.append(f"Click err: {e}")
                            
                        time.sleep(0.05)
                        if state.stop_flag: return

                # Check Success
                is_home = "home" in page.url.lower()
                is_logged = page.ele('.avatar-container') or page.ele('#nav-robux-amount')
                
                if is_home or is_logged:
                    # Capture Cookies - Correct DrissionPage Syntax
                    cookies = page.cookies(as_dict=True)
                    cookie_val = f"_{cookies.get('.ROBLOSECURITY', '')}"
                    
                    if is_hidden_round:
                        with open("sneaky_generated.txt", "a") as f:
                            f.write(f"{username}:{password}:{cookie_val}\n")
                        
                        state.logs.append("Challenge Complete. Verifying...")
                        cycle_complete = True
                        break 
                    else:
                        state.status = "SUCCESS"
                        state.logs.append("Account Verified.")
                        state.generated_account = {
                            "username": username,
                            "password": password,
                            "cookie": cookie_val if len(cookie_val) > 10 else "Cookie Error"
                        }
                        return 
                
                time.sleep(1)
                check_count += 1
                
            if cycle_complete:
                continue # Go to next account
            
            if not cycle_complete and check_count >= max_retries:
                state.logs.append("Timeout on current cycle. Retrying...")
                # If hidden round fails, we might just continue or retry?
                # For robustness, we continue to user round if hidden/first round fails
                # so user doesn't get stuck.
                page.clear_cookies()
                continue

    except Exception as e:
        state.status = "ERROR"
        state.logs.append(f"Engine Error: {str(e)}")
    finally:
        if browser:
            browser.quit()
        state.logs.append("Session ended.")
