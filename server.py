import logging
import threading
import time
import base64
import os
import io
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS

# Configure Logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app) # Enable CORS for dashboard local development

# --------------------------
# GLOBAL STATE
# --------------------------
class SystemState:
    def __init__(self):
        self.status = "IDLE" # IDLE, GENERATING, CAPTCHA_WAITING, SUCCESS, ERROR
        self.logs = []
        self.captcha_image = None # Base64 string
        self.click_queue = [] # Queue of (x, y) tuples
        self.generated_account = None # Dict when done
        self.browser_instance = None # DrissionPage object (for direct control if needed)
        self.stop_flag = False

state = SystemState()

# --------------------------
# API ENDPOINTS
# --------------------------

@app.route('/')
def home():
    # Serve the dashboard if accessed directly
    return send_from_directory('site', 'dashboard.html')

@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory('site', path)

@app.route('/api/status', methods=['GET'])
def get_status():
    """Returns current state, latest logs, and captcha image if waiting."""
    response = {
        "status": state.status,
        "logs": state.logs[-5:], # Last 5 logs
        "account": state.generated_account
    }
    
    if state.status == "CAPTCHA_WAITING" and state.captcha_image:
        response["captcha_image"] = state.captcha_image
        
    return jsonify(response)

@app.route('/api/start', methods=['POST'])
def start_generation():
    """Starts the background generation thread."""
    if state.status not in ["IDLE", "SUCCESS", "ERROR"]:
        return jsonify({"error": "Generation already in progress"}), 400
    
    config = request.json or {}
    # Reset state
    state.status = "STARTING..."
    state.logs = []
    state.captcha_image = None
    state.click_queue = [] # Clear queue
    state.generated_account = None
    state.stop_flag = False
    
    # Start Thread
    t = threading.Thread(target=run_engine_thread, args=(config,))
    t.daemon = True
    t.start()
    
    return jsonify({"message": "Started"})

@app.route('/api/click', methods=['POST'])
def receive_click():
    """Receives click coordinates from the user."""
    data = request.json
    x = data.get('x')
    y = data.get('y')
    
    if state.status != "CAPTCHA_WAITING":
        return jsonify({"error": "Not waiting for captcha"}), 400
        
    logger.info(f"Received click at {x}, {y}")
    state.click_queue.append((x, y))
    return jsonify({"message": "Click queued"})

# --------------------------
# ENGINE BRIDGE
# --------------------------
def run_engine_thread(config):
    """Import and run the generator engine safely."""
    try:
        from lib.generator_engine import run_generator
        run_generator(state, config)
    except Exception as e:
        logger.error(f"Engine crashed: {e}")
        state.status = "ERROR"
        state.logs.append(f"Critical Error: {str(e)}")

# --------------------------
# MAIN
# --------------------------
if __name__ == '__main__':
    print("----------------------------------------------------------------")
    print("  ROBLOX GENERATOR SERVER LISTEN ON http://localhost:5000")
    print("----------------------------------------------------------------")
    app.run(host='0.0.0.0', port=5000, threaded=True)
