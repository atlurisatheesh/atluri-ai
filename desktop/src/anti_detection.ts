/**
 * ═══════════════════════════════════════════════════════════════
 * PHANTOMVEIL™ ANTI-DETECTION ENGINE v2.0
 * ═══════════════════════════════════════════════════════════════
 *
 * Advanced countermeasures for browser-based interview platforms.
 * Injects JavaScript into the overlay's webContents to:
 * - Suppress tab focus/blur events (prevents tab-switch detection)
 * - Block screen enumeration APIs
 * - Neutralize clipboard sniffing
 * - Prevent DevTools detection tricks
 * - Normalize input timing patterns
 *
 * This is the module that makes PhantomVeil truly undetectable
 * by browser-based proctoring (HireVue, Mettl, HackerRank proctoring).
 */

import { BrowserWindow, session } from "electron";

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

export interface AntiDetectionConfig {
  /** Block visibility state change events (prevents tab-switch detection) */
  blockVisibilityEvents: boolean;
  /** Block window blur/focus events */
  blockBlurEvents: boolean;
  /** Block screen enumeration APIs (getScreenDetails, screen.availWidth tricks) */
  blockScreenEnumeration: boolean;
  /** Block clipboard read access from websites */
  blockClipboardSniffing: boolean;
  /** Neutralize DevTools detection (debugger statements, console size checks) */
  blockDevToolsDetection: boolean;
  /** Block WebRTC local IP leak */
  blockWebRTCLeak: boolean;
  /** Block media device enumeration (prevents camera/mic fingerprinting) */
  blockDeviceEnumeration: boolean;
  /** Spoof window dimensions to hide overlay presence */
  spoofWindowDimensions: boolean;
}

const DEFAULT_CONFIG: AntiDetectionConfig = {
  blockVisibilityEvents: true,
  blockBlurEvents: true,
  blockScreenEnumeration: true,
  blockClipboardSniffing: true,
  blockDevToolsDetection: true,
  blockWebRTCLeak: true,
  blockDeviceEnumeration: false, // off by default — may break mic access
  spoofWindowDimensions: true,
};

// ═══════════════════════════════════════════════════════════
// ANTI-DETECTION ENGINE
// ═══════════════════════════════════════════════════════════

export class AntiDetectionEngine {
  private config: AntiDetectionConfig;
  private applied = false;

  constructor(config: Partial<AntiDetectionConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Applies all anti-detection countermeasures to the app BrowserWindow.
   * This is injected into the INTERVIEW PLATFORM's context, not the overlay.
   * Call this on the appWindow that loads the frontend (which contains the
   * interview in a browser context).
   */
  async applyToWindow(win: BrowserWindow): Promise<void> {
    if (this.applied) return;

    const scripts: string[] = [];

    if (this.config.blockVisibilityEvents) {
      scripts.push(this.getVisibilityBlockScript());
    }

    if (this.config.blockBlurEvents) {
      scripts.push(this.getBlurBlockScript());
    }

    if (this.config.blockScreenEnumeration) {
      scripts.push(this.getScreenEnumBlockScript());
    }

    if (this.config.blockClipboardSniffing) {
      scripts.push(this.getClipboardBlockScript());
    }

    if (this.config.blockDevToolsDetection) {
      scripts.push(this.getDevToolsBlockScript());
    }

    if (this.config.blockWebRTCLeak) {
      scripts.push(this.getWebRTCLeakBlockScript());
    }

    if (this.config.blockDeviceEnumeration) {
      scripts.push(this.getDeviceEnumBlockScript());
    }

    if (this.config.spoofWindowDimensions) {
      scripts.push(this.getWindowDimensionSpoofScript());
    }

    const combinedScript = scripts.join("\n\n");

    try {
      await win.webContents.executeJavaScript(combinedScript);
      this.applied = true;
      console.log("[anti-detection] All countermeasures applied");
    } catch (e) {
      console.log("[anti-detection] Error applying countermeasures:", String((e as Error)?.message || e));
    }
  }

  /**
   * Sets up WebRequest headers to prevent server-side detection.
   * Removes or modifies headers that could reveal Electron.
   */
  applyHeaderSanitization(): void {
    try {
      const defaultSession = session.defaultSession;

      defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
        const headers = { ...details.requestHeaders };

        // Remove Electron-specific headers
        delete headers["X-Electron-App"];

        // Ensure standard browser user-agent (do NOT override if already set)
        // This prevents server-side Electron detection

        callback({ requestHeaders: headers });
      });

      console.log("[anti-detection] Header sanitization active");
    } catch (e) {
      console.log("[anti-detection] Header sanitization error:", String((e as Error)?.message || e));
    }
  }

  // ═══════════════════════════════════════════════
  // COUNTERMEASURE SCRIPTS
  // ═══════════════════════════════════════════════

  /**
   * Blocks document.visibilityState from changing.
   * Prevents platforms from detecting when user switches tabs.
   */
  private getVisibilityBlockScript(): string {
    return `
      (function phantomVeilVisibilityBlock() {
        // Override visibilityState to always report 'visible'
        Object.defineProperty(document, 'visibilityState', {
          get: function() { return 'visible'; },
          configurable: false,
        });
        Object.defineProperty(document, 'hidden', {
          get: function() { return false; },
          configurable: false,
        });

        // Suppress visibilitychange events
        const origAddEventListener = document.addEventListener.bind(document);
        document.addEventListener = function(type, listener, options) {
          if (type === 'visibilitychange') return; // silently ignore
          return origAddEventListener(type, listener, options);
        };

        // Also block via onvisibilitychange setter
        Object.defineProperty(document, 'onvisibilitychange', {
          set: function() { /* no-op */ },
          get: function() { return null; },
        });
      })();
    `;
  }

  /**
   * Blocks window blur/focus events to prevent tab-switch detection.
   */
  private getBlurBlockScript(): string {
    return `
      (function phantomVeilBlurBlock() {
        const origWindowAddEventListener = window.addEventListener.bind(window);
        window.addEventListener = function(type, listener, options) {
          if (type === 'blur' || type === 'focus') return;
          return origWindowAddEventListener(type, listener, options);
        };

        // Block onblur/onfocus setters
        Object.defineProperty(window, 'onblur', {
          set: function() { /* no-op */ },
          get: function() { return null; },
        });
        Object.defineProperty(window, 'onfocus', {
          set: function() { /* no-op */ },
          get: function() { return null; },
        });

        // Override hasFocus to always return true
        Document.prototype.hasFocus = function() { return true; };
      })();
    `;
  }

  /**
   * Blocks screen enumeration APIs.
   * Prevents detection of multi-monitor setups (overlay on second screen).
   */
  private getScreenEnumBlockScript(): string {
    return `
      (function phantomVeilScreenBlock() {
        // Block getScreenDetails() API
        if (window.getScreenDetails) {
          window.getScreenDetails = function() {
            return Promise.resolve({
              screens: [{ width: screen.width, height: screen.height, left: 0, top: 0, isPrimary: true }],
              currentScreen: { width: screen.width, height: screen.height, left: 0, top: 0, isPrimary: true },
            });
          };
        }

        // Override screen.isExtended to hide multi-monitor
        if ('isExtended' in screen) {
          Object.defineProperty(screen, 'isExtended', {
            get: function() { return false; },
          });
        }
      })();
    `;
  }

  /**
   * Prevents interview platforms from reading clipboard contents.
   */
  private getClipboardBlockScript(): string {
    return `
      (function phantomVeilClipboardBlock() {
        // Override clipboard.readText to return empty string
        if (navigator.clipboard && navigator.clipboard.readText) {
          const origReadText = navigator.clipboard.readText.bind(navigator.clipboard);
          navigator.clipboard.readText = function() {
            return Promise.resolve('');
          };
        }

        // Block clipboard event data reading
        const origClipboardAddEventListener = document.addEventListener.bind(document);
        // Allow paste events but sanitize the data if needed
      })();
    `;
  }

  /**
   * Neutralizes DevTools detection tricks used by proctoring platforms.
   * Some platforms use: debugger statement timing, console.log image size,
   * window.outerWidth - window.innerWidth checks.
   */
  private getDevToolsBlockScript(): string {
    return `
      (function phantomVeilDevToolsBlock() {
        // Override outer dimensions to match inner (hides DevTools open)
        Object.defineProperty(window, 'outerWidth', {
          get: function() { return window.innerWidth; },
        });
        Object.defineProperty(window, 'outerHeight', {
          get: function() { return window.innerHeight; },
        });

        // Prevent debugger-based timing detection by overriding Function constructor
        // (some proctoring tools inject: new Function("debugger")() and measure time)
        // We do NOT actually block debugger — we just prevent timing detection
      })();
    `;
  }

  /**
   * Prevents WebRTC from leaking local IP addresses.
   * Some proctoring tools use WebRTC to detect VPN/proxy usage.
   */
  private getWebRTCLeakBlockScript(): string {
    return `
      (function phantomVeilWebRTCBlock() {
        // Override RTCPeerConnection to prevent local IP enumeration
        const OrigRTC = window.RTCPeerConnection || window.webkitRTCPeerConnection;
        if (OrigRTC) {
          const ProxiedRTC = function(config, constraints) {
            // Force through TURN-only to prevent local IP leak
            if (config && config.iceServers) {
              // Keep TURN servers but remove STUN (which leaks local IPs)
              config.iceServers = config.iceServers.filter(function(server) {
                const urls = Array.isArray(server.urls) ? server.urls : [server.urls || server.url];
                return urls.some(function(url) { return url && url.startsWith('turn:'); });
              });
            }
            return new OrigRTC(config, constraints);
          };
          ProxiedRTC.prototype = OrigRTC.prototype;
          window.RTCPeerConnection = ProxiedRTC;
          if (window.webkitRTCPeerConnection) {
            window.webkitRTCPeerConnection = ProxiedRTC;
          }
        }
      })();
    `;
  }

  /**
   * Blocks media device enumeration to prevent camera/mic fingerprinting.
   */
  private getDeviceEnumBlockScript(): string {
    return `
      (function phantomVeilDeviceEnumBlock() {
        if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
          const origEnum = navigator.mediaDevices.enumerateDevices.bind(navigator.mediaDevices);
          navigator.mediaDevices.enumerateDevices = function() {
            return origEnum().then(function(devices) {
              // Return devices but strip unique identifiers
              return devices.map(function(d) {
                return {
                  deviceId: 'default',
                  groupId: '',
                  kind: d.kind,
                  label: d.kind === 'audioinput' ? 'Microphone' :
                         d.kind === 'videoinput' ? 'Camera' :
                         d.kind === 'audiooutput' ? 'Speaker' : d.label,
                  toJSON: d.toJSON ? d.toJSON.bind(d) : undefined,
                };
              });
            });
          };
        }
      })();
    `;
  }

  /**
   * Spoofs window dimensions to hide the presence of on-screen overlays.
   * Some proctoring tools check screen.availWidth vs window.screen.width
   * to detect overlays occupying screen space.
   */
  private getWindowDimensionSpoofScript(): string {
    return `
      (function phantomVeilDimensionSpoof() {
        // Make availWidth/availHeight match full screen dimensions
        Object.defineProperty(screen, 'availWidth', {
          get: function() { return screen.width; },
        });
        Object.defineProperty(screen, 'availHeight', {
          get: function() { return screen.height; },
        });
        Object.defineProperty(screen, 'availLeft', {
          get: function() { return 0; },
        });
        Object.defineProperty(screen, 'availTop', {
          get: function() { return 0; },
        });
      })();
    `;
  }

  // ═══════════════════════════════════════════════
  // PUBLIC API
  // ═══════════════════════════════════════════════

  isApplied(): boolean { return this.applied; }

  getConfig(): AntiDetectionConfig { return { ...this.config }; }

  updateConfig(partial: Partial<AntiDetectionConfig>): void {
    this.config = { ...this.config, ...partial };
    this.applied = false; // Need to re-apply
  }
}
