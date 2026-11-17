/**
 * JECRC University Central Library
 * Barcode Engine: Generator & Real Camera Barcode Reader
 * Supports Code 128, Code 39, QR Code & EAN
 */

const BarcodeUtil = {
  // Code 128 patterns (B subset)
  patterns: [
    "212222", "222122", "222221", "121223", "121322", "131222", "122213", "122312", "132212", "221213", // 0-9
    "221312", "231212", "112232", "122132", "122231", "113222", "123122", "123221", "223211", "221132", // 10-19
    "221231", "213212", "223112", "312131", "311222", "321122", "321221", "312212", "322112", "322211", // 20-29
    "212123", "212321", "232121", "111323", "131123", "131321", "112313", "132113", "132311", "211313", // 30-39
    "231113", "231311", "112133", "112331", "132131", "113123", "113321", "133121", "313121", "211331", // 40-49
    "231131", "213113", "213311", "213131", "311123", "311321", "331121", "312113", "312311", "332111", // 50-59
    "314111", "221411", "431111", "111224", "111422", "121124", "121421", "141122", "141221", "112214", // 60-69
    "112412", "122114", "122411", "142112", "142211", "241211", "221114", "413111", "241112", "134111", // 70-79
    "111242", "121142", "121241", "114212", "124112", "124211", "411212", "421112", "421211", "212141", // 80-89
    "214121", "412121", "111143", "111341", "131141", "114113", "114311", "411113", "411311", "113141", // 90-99
    "114131", "311141", "411131", "211412", "211214", "211232", "2331112" // 100-106 (106 is STOP)
  ],

  // Generate an SVG barcode string for any alphanumeric text
  renderSVG: function(text, options = {}) {
    const width = options.width || 2;
    const height = options.height || 64;
    const displayValue = options.displayValue !== false;
    const lineColor = options.lineColor || "#1e293b";
    const cleanText = (text || "").trim();

    if (!cleanText) return "";

    // START Code B is index 104
    const codes = [104];
    let checksum = 104;

    for (let i = 0; i < cleanText.length; i++) {
      const charCode = cleanText.charCodeAt(i);
      const codeVal = charCode - 32;
      if (codeVal >= 0 && codeVal <= 95) {
        codes.push(codeVal);
        checksum += codeVal * (i + 1);
      }
    }

    const checkVal = checksum % 103;
    codes.push(checkVal);
    codes.push(106); // Stop code

    let binary = "";
    codes.forEach(c => {
      const pattern = this.patterns[c];
      if (!pattern) return;
      let isBar = true;
      for (let j = 0; j < pattern.length; j++) {
        const count = parseInt(pattern[j], 10);
        binary += (isBar ? "1" : "0").repeat(count);
        isBar = !isBar;
      }
    });

    const quietZone = "0000000000";
    const fullBinary = quietZone + binary + quietZone;
    const totalWidth = fullBinary.length * width;
    const totalHeight = height + (displayValue ? 20 : 0);

    let rects = "";
    let x = 0;
    for (let i = 0; i < fullBinary.length; i++) {
      if (fullBinary[i] === "1") {
        rects += `<rect x="${x}" y="0" width="${width}" height="${height}" fill="${lineColor}" />`;
      }
      x += width;
    }

    let textElement = "";
    if (displayValue) {
      textElement = `<text x="${totalWidth / 2}" y="${height + 16}" font-family="monospace, Courier, sans-serif" font-size="13" font-weight="700" letter-spacing="3" text-anchor="middle" fill="${lineColor}">${cleanText}</text>`;
    }

    return `<svg class="barcode-svg" viewBox="0 0 ${totalWidth} ${totalHeight}" width="${totalWidth}" height="${totalHeight}" xmlns="http://www.w3.org/2000/svg" style="max-width: 100%; height: auto; display: block; margin: 0 auto;">
      <rect width="100%" height="100%" fill="transparent"/>
      ${rects}
      ${textElement}
    </svg>`;
  }
};

// ============================================================================
// CAMERA REAL-TIME BARCODE DECODER ENGINE
// Uses hardware-accelerated BarcodeDetector API (Chrome, Edge, Opera)
// with fallback to ZXing MultiFormatReader and Canvas image processing
// ============================================================================
const RealCameraScanner = {
  videoEl: null,
  canvasEl: null,
  canvasCtx: null,
  stream: null,
  scanningInterval: null,
  isScanning: false,
  detector: null,
  zxingReader: null,
  onDetectedCallback: null,
  lastScannedCode: null,
  lastScannedTime: 0,

  async init(videoElementId, onDetected) {
    this.videoEl = document.getElementById(videoElementId);
    this.onDetectedCallback = onDetected;

    // Create offscreen canvas for frame capture
    this.canvasEl = document.createElement("canvas");
    this.canvasCtx = this.canvasEl.getContext("2d", { willReadFrequently: true });

    // Initialize native browser BarcodeDetector if available
    if ("BarcodeDetector" in window) {
      try {
        const supported = await window.BarcodeDetector.getSupportedFormats();
        console.log("Native BarcodeDetector supported formats:", supported);
        this.detector = new window.BarcodeDetector({
          formats: supported.length > 0 ? supported : ["code_128", "code_39", "ean_13", "qr_code", "upc_a"]
        });
      } catch (e) {
        console.warn("BarcodeDetector initialization note:", e);
      }
    }

    // Initialize ZXing fallback if library loaded from CDN
    if (window.ZXing && window.ZXing.BrowserMultiFormatReader) {
      try {
        this.zxingReader = new window.ZXing.BrowserMultiFormatReader();
      } catch (e) {
        console.warn("ZXing fallback init note:", e);
      }
    }
  },

  async start(deviceId = null) {
    if (this.isScanning) return;

    try {
      const constraints = {
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      };

      if (deviceId) {
        constraints.video.deviceId = { exact: deviceId };
      }

      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.videoEl.srcObject = this.stream;
      await this.videoEl.play();
      this.isScanning = true;

      // Start continuous scanning loop (every 120ms)
      this.scanningInterval = setInterval(() => {
        this.scanCurrentFrame();
      }, 120);

      return true;
    } catch (err) {
      console.error("Camera access error:", err);
      throw err;
    }
  },

  stop() {
    this.isScanning = false;
    if (this.scanningInterval) {
      clearInterval(this.scanningInterval);
      this.scanningInterval = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    if (this.videoEl) {
      this.videoEl.srcObject = null;
    }
  },

  async scanCurrentFrame() {
    if (!this.isScanning || !this.videoEl || this.videoEl.readyState < 2) return;

    const now = Date.now();

    // 1. Try Native BarcodeDetector (Fastest & most accurate in modern Chrome/Edge)
    if (this.detector) {
      try {
        const barcodes = await this.detector.detect(this.videoEl);
        if (barcodes && barcodes.length > 0) {
          const raw = barcodes[0].rawValue;
          if (raw && this.isNewScan(raw, now)) {
            this.handleSuccess(raw);
            return;
          }
        }
      } catch (e) {
        // Fall through to fallback
      }
    }

    // 2. Try ZXing or Canvas scanline
    try {
      const vw = this.videoEl.videoWidth;
      const vh = this.videoEl.videoHeight;
      if (vw > 0 && vh > 0) {
        this.canvasEl.width = vw;
        this.canvasEl.height = vh;
        this.canvasCtx.drawImage(this.videoEl, 0, 0, vw, vh);

        // If ZXing is loaded
        if (this.zxingReader && this.zxingReader.decodeFromCanvas) {
          try {
            const result = this.zxingReader.decodeFromCanvas(this.canvasEl);
            if (result && result.getText && this.isNewScan(result.getText(), now)) {
              this.handleSuccess(result.getText());
              return;
            }
          } catch (ze) {}
        }
      }
    } catch (e) {}
  },

  // Scan from an uploaded image file (PNG / JPEG)
  async scanImageFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const img = new Image();
        img.onload = async () => {
          // 1. Try BarcodeDetector
          if (this.detector) {
            try {
              const barcodes = await this.detector.detect(img);
              if (barcodes && barcodes.length > 0) {
                resolve(barcodes[0].rawValue);
                return;
              }
            } catch (err) {}
          }

          // 2. Try ZXing fallback
          if (this.zxingReader && this.zxingReader.decodeFromImageElement) {
            try {
              const res = await this.zxingReader.decodeFromImageElement(img);
              if (res && res.getText) {
                resolve(res.getText());
                return;
              }
            } catch (err) {}
          }

          reject(new Error("No barcode recognized in image. Please ensure good lighting and contrast."));
        };
        img.onerror = () => reject(new Error("Failed to load image file."));
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  },

  isNewScan(code, now) {
    if (code === this.lastScannedCode && now - this.lastScannedTime < 2500) {
      return false; // prevent repeated triggers within 2.5s
    }
    return true;
  },

  handleSuccess(code) {
    this.lastScannedCode = code;
    this.lastScannedTime = Date.now();
    AudioEngine.playScanBeep();

    if (this.onDetectedCallback) {
      this.onDetectedCallback(code);
    }
  }
};

// ============================================================================
// AUDIO SYNTHESIZER (Web Audio API)
// ============================================================================
const AudioEngine = {
  ctx: null,

  init: function() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
  },

  playScanBeep: function() {
    try {
      this.init();
      if (!this.ctx) return;
      if (this.ctx.state === "suspended") {
        this.ctx.resume();
      }
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(2400, this.ctx.currentTime);
      gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.12);
    } catch (e) {}
  },

  playSuccessChime: function() {
    try {
      this.init();
      if (!this.ctx) return;
      if (this.ctx.state === "suspended") {
        this.ctx.resume();
      }
      const now = this.ctx.currentTime;
      [
        { freq: 587.33, start: 0, dur: 0.12 },
        { freq: 880.00, start: 0.08, dur: 0.22 }
      ].forEach(note => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(note.freq, now + note.start);
        gain.gain.setValueAtTime(0.25, now + note.start);
        gain.gain.exponentialRampToValueAtTime(0.001, now + note.start + note.dur);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + note.start);
        osc.stop(now + note.start + note.dur);
      });
    } catch (e) {}
  },

  playWarningTone: function() {
    try {
      this.init();
      if (!this.ctx) return;
      if (this.ctx.state === "suspended") {
        this.ctx.resume();
      }
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(220, this.ctx.currentTime);
      gain.gain.setValueAtTime(0.18, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.25);
    } catch (e) {}
  }
};
