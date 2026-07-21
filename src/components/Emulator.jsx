import React, { useEffect, useRef, useState } from 'react';
import mGBA from '@thenick775/mgba-wasm';
import { FolderOpen, Settings, X, Edit3 } from 'lucide-react';
import CustomControlsOverlay from './CustomControlsOverlay';

export default function Emulator() {
  const canvasRef = useRef(null);
  const [emulator, setEmulator] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const [romLoaded, setRomLoaded] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsInteractable, setSettingsInteractable] = useState(false);
  const [videoMode, setVideoMode] = useState(() => {
    return localStorage.getItem('gba-video-mode') || 'none';
  });
  const [currentFps, setCurrentFps] = useState(0);
  const frameCountRef = useRef(0);
  const [showTouchControls, setShowTouchControls] = useState(false);
  const [isEditLayoutMode, setIsEditLayoutMode] = useState(false);
  const [isLandscape, setIsLandscape] = useState(window.innerWidth > window.innerHeight);

  useEffect(() => {
    const handleResize = () => setIsLandscape(window.innerWidth > window.innerHeight);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const getLayoutId = (base) => `${base}-${isLandscape ? 'landscape' : 'portrait'}`;

  const defaultSettings = {
    frameSkip: 0,
    showFpsCounter: false,
    volume: 1.0,
    fastForward: 1.0,
    autoMuteOnFastForward: true,
    dpadScale: 1.2,
    btnScale: 1.2,
    lrScale: 1.2,
    sysBtnScale: 1.0,
    theme: 'indigo',
    fullscreenMode: false,
    screenScale: 3,
  };

  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('gba-settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          ...defaultSettings,
          ...parsed
        };
      } catch (e) {}
    }
    return defaultSettings;
  });

  const showSettingsRef = useRef(false);
  const emulatorRef = useRef(null);
  const romLoadedRef = useRef(false);

  useEffect(() => { showSettingsRef.current = showSettings; }, [showSettings]);
  
  useEffect(() => {
    if (showSettings) {
      const timer = setTimeout(() => setSettingsInteractable(true), 350);
      return () => clearTimeout(timer);
    } else {
      setSettingsInteractable(false);
    }
  }, [showSettings]);

  useEffect(() => { emulatorRef.current = emulator; }, [emulator]);
  useEffect(() => { romLoadedRef.current = romLoaded; }, [romLoaded]);

  useEffect(() => {
    const theme = settings.theme ?? 'indigo';
    const themeClass = `theme-${theme}`;
    const classesToRemove = Array.from(document.body.classList).filter(c => c.startsWith('theme-'));
    classesToRemove.forEach(c => document.body.classList.remove(c));
    document.body.classList.add(themeClass);
    
    return () => {
      document.body.classList.remove(themeClass);
    };
  }, [settings.theme]);

  const handleControlPositionChange = (id, pos) => {
    const currentLayouts = settings.customLayouts || {};
    const nextSettings = { ...settings, customLayouts: { ...currentLayouts, [id]: pos } };
    setSettings(nextSettings);
    localStorage.setItem('gba-settings', JSON.stringify(nextSettings));
  };

  const handleSettingChange = (key, value) => {
    const nextSettings = { ...settings, [key]: value };
    setSettings(nextSettings);
    localStorage.setItem('gba-settings', JSON.stringify(nextSettings));
    
    if (emulator) {
      try {
        if (key === 'volume') {
          if (nextSettings.autoMuteOnFastForward && Number(nextSettings.fastForward) > 1) {

            emulator.setVolume(0);
          } else {
            emulator.setVolume(Number(value));
          }
        } else if (key === 'fastForward') {
          const speed = Number(value);
          emulator.setCoreSettings({
            frameSkip: speed === 3 ? Math.max(Number(nextSettings.frameSkip), 1) : (speed >= 4 ? Math.max(Number(nextSettings.frameSkip), 2) : Number(nextSettings.frameSkip)),
            rewindEnable: false,
            videoSync: true,
            audioSampleRate: 48000
          });
          emulator.setFastForwardMultiplier(speed);

          if (nextSettings.autoMuteOnFastForward) {
            if (speed > 1) {
              emulator.setVolume(0);
            } else {
              emulator.setVolume(Number(nextSettings.volume));
            }
          }
        } else if (key === 'autoMuteOnFastForward') {
          const shouldMute = Boolean(value);
          if (shouldMute && Number(nextSettings.fastForward) > 1) {
            emulator.setVolume(0);
          } else {
            emulator.setVolume(Number(nextSettings.volume));
          }
        } else if (key === 'frameSkip') {
          emulator.setCoreSettings({
            frameSkip: speed === 3 ? Math.max(Number(nextSettings.frameSkip), 1) : (speed >= 4 ? Math.max(Number(nextSettings.frameSkip), 2) : Number(nextSettings.frameSkip)),
            rewindEnable: false,
            videoSync: true,
            audioSampleRate: 48000
          });
          emulator.setFastForwardMultiplier(speed);
          if (nextSettings.autoMuteOnFastForward && speed > 1) {
            emulator.setVolume(0);
          } else {
            emulator.setVolume(Number(nextSettings.volume));
          }
        }
      } catch (e) {
        console.error("Error setting core settings:", e);
      }
    }
  };

  const handleOpenSettings = () => {
    setShowSettings(true);
    const activeEmulator = emulatorRef.current;
    const isRomLoaded = romLoadedRef.current;
    if (activeEmulator && isRomLoaded) {
      try {
        activeEmulator.pauseGame();
      } catch (e) {
        console.error("Failed to pause game:", e);
      }
    }
  };

  const handleCloseSettings = () => {
    setShowSettings(false);
    const activeEmulator = emulatorRef.current;
    const isRomLoaded = romLoadedRef.current;
    if (activeEmulator && isRomLoaded) {
      try {
        activeEmulator.resumeGame();
      } catch (e) {
        console.error("Failed to resume game:", e);
      }
    }
  };

  // Track FPS dynamically by monkey-patching canvas drawing contexts
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const originalGetContext = canvas.getContext;
    
    canvas.getContext = function(type, attributes) {
      const ctx = originalGetContext.call(this, type, attributes);
      if (!ctx) return ctx;

      // Wrap 2D context
      if (type === '2d' && !ctx._wrapped) {
        ctx._wrapped = true;
        const originalPutImageData = ctx.putImageData;
        ctx.putImageData = function(...args) {
          frameCountRef.current++;
          return originalPutImageData.apply(this, args);
        };
      }

      // Wrap WebGL / WebGL2 context
      if ((type === 'webgl' || type === 'webgl2') && !ctx._wrapped) {
        ctx._wrapped = true;
        
        const originalTexImage2D = ctx.texImage2D;
        ctx.texImage2D = function(...args) {
          const width = args[3];
          const height = args[4];
          if ((width === 240 && height === 160) || (width === 160 && height === 144)) {
            frameCountRef.current++;
          } else if (args.length < 5) {
            frameCountRef.current++;
          }
          return originalTexImage2D.apply(this, args);
        };

        const originalTexSubImage2D = ctx.texSubImage2D;
        ctx.texSubImage2D = function(...args) {
          const width = args[4];
          const height = args[5];
          if ((width === 240 && height === 160) || (width === 160 && height === 144)) {
            frameCountRef.current++;
          } else if (args.length < 6) {
            frameCountRef.current++;
          }
          return originalTexSubImage2D.apply(this, args);
        };
      }

      return ctx;
    };

    let lastTime = performance.now();
    const interval = setInterval(() => {
      const now = performance.now();
      const delta = (now - lastTime) / 1000;
      if (delta > 0) {
        const fps = Math.round(frameCountRef.current / delta);
        setCurrentFps(fps);
      }
      frameCountRef.current = 0;
      lastTime = now;
    }, 1000);

    return () => {
      canvas.getContext = originalGetContext;
      clearInterval(interval);
    };
  }, []);

  // Initialize Emulator
  useEffect(() => {
    let moduleInstance = null;
    const init = async () => {
      if (canvasRef.current) {
        try {
          const Module = await mGBA({ canvas: canvasRef.current });
          await Module.FSInit();
          
          // Map keyboard controls via SDL bindings
          Module.bindKey('Up', 'Up');
          Module.bindKey('Down', 'Down');
          Module.bindKey('Left', 'Left');
          Module.bindKey('Right', 'Right');
          Module.bindKey('z', 'A');
          Module.bindKey('x', 'B');
          Module.bindKey('q', 'L');
          Module.bindKey('w', 'R');
          Module.bindKey('Return', 'Start');
          Module.bindKey('Shift', 'Select');
          
          // Apply initial settings
          try {
            const speed = Number(settings.fastForward);
            Module.setCoreSettings({
              frameSkip: speed === 3 ? Math.max(Number(settings.frameSkip), 1) : (speed >= 4 ? Math.max(Number(settings.frameSkip), 2) : Number(settings.frameSkip)),
              rewindEnable: false,
              videoSync: true,
              audioSampleRate: 48000
            });
            Module.setFastForwardMultiplier(speed);
            if (settings.autoMuteOnFastForward && speed > 1) {
              Module.setVolume(0);
            } else {
              Module.setVolume(Number(settings.volume));
            }
          } catch (e) {
            console.error("Error setting initial core settings:", e);
          }

          // Register in-game save auto-sync to IndexedDB
          try {
            Module.addCoreCallbacks({
              saveDataUpdatedCallback: () => {
                Module.FSSync()
                  .then(() => console.log("Auto-saved game state to IndexedDB!"))
                  .catch((e) => console.error("Auto-save sync failed:", e));
              }
            });
          } catch (e) {
            console.error("Failed to register saveDataUpdatedCallback:", e);
          }

          setEmulator(Module);
          setIsReady(true);
          moduleInstance = Module;
        } catch (e) {
          console.error("mGBA Init Error:", e);
        }
      }
    };
    init();
    
    // Detect touch device and register dynamic controls switching
    const touchCapable = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    setShowTouchControls(touchCapable);

    const KEY_MAP = {
      'arrowup': 'Up',
      'arrowdown': 'Down',
      'arrowleft': 'Left',
      'arrowright': 'Right',
      'z': 'A',
      'x': 'B',
      'q': 'L',
      'w': 'R',
      'enter': 'Start',
      'shift': 'Select'
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (showSettingsRef.current) {
          handleCloseSettings();
        } else {
          handleOpenSettings();
        }
        return;
      }

      const btn = KEY_MAP[e.key.toLowerCase()];
      if (btn) {
        visualPress(btn);
      }

      setShowTouchControls(false);
    };

    const handleKeyUp = (e) => {
      const btn = KEY_MAP[e.key.toLowerCase()];
      if (btn) {
        visualRelease(btn);
      }
    };

    const handleTouchStart = () => {
      setShowTouchControls(true);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('touchstart', handleTouchStart, { passive: true });

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('touchstart', handleTouchStart);
      if (moduleInstance) {
        try {
          moduleInstance.quitMgba();
        } catch (e) {
          // Emscripten exits with an ExitStatus error which is normal during cleanup
          console.log("mGBA instance cleaned up.");
        }
      }
    };
  }, []);

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file && emulator) {
      loadRomFile(file);
    }
  };

  const handleDrop = (event) => {
    event.preventDefault();
    event.stopPropagation();
    const file = event.dataTransfer.files[0];
    if (file && emulator) {
      loadRomFile(file);
    }
    event.currentTarget.classList.remove('active');
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.classList.add('active');
  };

  const handleDragLeave = (event) => {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.classList.remove('active');
  };

  const applyActiveSettings = (emu) => {
    if (!emu) return;
    try {
      const speed = Number(settings.fastForward);
      emu.setCoreSettings({
        frameSkip: speed === 3 ? Math.max(Number(settings.frameSkip), 1) : (speed >= 4 ? Math.max(Number(settings.frameSkip), 2) : Number(settings.frameSkip)),
        rewindEnable: false,
        videoSync: true,
        audioSampleRate: 48000
      });
      emu.setFastForwardMultiplier(speed);
      if (settings.autoMuteOnFastForward && speed > 1) {
        emu.setVolume(0);
      } else {
        emu.setVolume(Number(settings.volume));
      }
    } catch (e) {
      console.error("Failed to apply active settings:", e);
    }
  };

  const loadRomFile = (file) => {
    emulator.uploadRom(file, () => {
      const romPath = emulator.filePaths().gamePath + '/' + file.name;
      emulator.loadGame(romPath);
      setRomLoaded(true);
      applyActiveSettings(emulator);
    });
  };

  const handleExportSave = () => {
    if (!emulator) return;
    try {
      const saveBytes = emulator.getSave();
      if (!saveBytes || saveBytes.length === 0) {
        alert("No in-game save data found. Make sure you save inside the game first!");
        return;
      }
      
      const romName = emulator.gameName ? emulator.gameName.split('/').pop() : 'game';
      const saveName = romName.replace(/\.(gba|gb|gbc)$/i, '') + '.sav';

      const blob = new Blob([saveBytes], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = saveName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Failed to export save:", e);
      alert("Failed to export save data.");
    }
  };

  const handleExportState = () => {
    if (!emulator) return;
    try {
      if (typeof emulator.forceAutoSaveState !== 'function' || typeof emulator.getAutoSaveState !== 'function') {
         alert("Save state export is not supported in this environment.");
         return;
      }
      emulator.forceAutoSaveState();
      const stateObj = emulator.getAutoSaveState();
      
      if (!stateObj || !stateObj.data || stateObj.data.length === 0) {
        alert("Failed to capture save state!");
        return;
      }
      
      const romName = emulator.gameName ? emulator.gameName.split('/').pop() : 'game';
      const stateName = romName.replace(/\.(gba|gb|gbc)$/i, '') + '.ss1';

      const blob = new Blob([stateObj.data], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = stateName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Failed to export state:", e);
      alert("Failed to export save state.");
    }
  };

  const handleImportSave = (event) => {
    const file = event.target.files[0];
    event.target.value = '';
    if (!file || !emulator) return;

    const extMatch = file.name.match(/\.(sav|ss\d+)$/i);
    if (!extMatch) {
      alert("Please select a valid .sav or save state (.ss0, .ss1, etc) file!");
      return;
    }
    const ext = extMatch[1].toLowerCase();
    const isSaveState = ext.startsWith('ss');

    const romName = emulator.gameName ? emulator.gameName.split('/').pop() : '';
    if (!romName) {
      alert("No active game to import save for!");
      return;
    }

    if (isSaveState) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          if (typeof emulator.uploadAutoSaveState === 'function') {
            await emulator.uploadAutoSaveState(emulator.autoSaveStateName, data);
            const success = emulator.loadAutoSaveState();
            if (success) {
              handleCloseSettings();
            } else {
              alert("Failed to load save state! The file might be corrupt or for a different game.");
            }
          } else {
            alert("Save state import is not supported in this environment.");
          }
        } catch (err) {
          console.error("Failed to import auto save state:", err);
          alert("Error importing save state.");
        }
      };
      reader.readAsArrayBuffer(file);
      return;
    }

    const targetSaveName = romName.replace(/\.(gba|gb|gbc)$/i, '') + '.sav';
    const renamedFile = new File([file], targetSaveName, { type: file.type });
    const romPath = emulator.gameName;

    try {
      emulator.quitGame();
    } catch (e) {
      console.warn("quitGame before import:", e);
    }

    emulator.uploadSaveOrSaveState(renamedFile, () => {
      setTimeout(() => {
        emulator.loadGame(romPath);
        applyActiveSettings(emulator);
        handleCloseSettings();
        emulator.FSSync()
          .then(() => console.log("Imported save synced to IndexedDB."))
          .catch((err) => console.error("Post-import sync failed:", err));
      }, 200);
    });
  };

  const handleFactoryReset = async () => {
    const confirmReset = window.confirm(
      "FACTORY RESET APP\n\n" +
      "This will permanently delete:\n" +
      "• All in-game save files (.SAV)\n" +
      "• All save states (.SS1, etc.)\n" +
      "• Your customized settings (themes, scales, volume, etc.)\n\n" +
      "Are you absolutely sure you want to proceed? This cannot be undone."
    );

    if (!confirmReset) return;

    setSettings(defaultSettings);

    try {
      if (emulatorRef.current) {
        try {
          emulatorRef.current.quitGame();
        } catch (e) {
          console.warn("Emulation quit during reset:", e);
        }
      }

      localStorage.clear();

      if (window.indexedDB) {
        if (typeof window.indexedDB.databases === 'function') {
          try {
            const dbs = await window.indexedDB.databases();
            for (const db of dbs) {
              window.indexedDB.deleteDatabase(db.name);
            }
          } catch (e) {
            console.error("Failed to delete IndexedDB databases via databases() API:", e);
          }
        }
        window.indexedDB.deleteDatabase('/mgba');
      }

      if (window.caches) {
        try {
          const keys = await window.caches.keys();
          for (const key of keys) {
            await window.caches.delete(key);
          }
        } catch (e) {
          console.error("Failed to clear Cache Storage:", e);
        }
      }

      if (navigator.serviceWorker) {
        try {
          const registrations = await navigator.serviceWorker.getRegistrations();
          for (const registration of registrations) {
            await registration.unregister();
          }
        } catch (e) {
          console.error("Failed to unregister Service Worker:", e);
        }
      }

      alert("Application has been completely reset. Reloading now...");
      window.location.href = window.location.origin + window.location.pathname;
    } catch (err) {
      console.error("Error during factory reset:", err);
      alert("An error occurred during reset. Some data might not have been deleted.");
    }
  };

  // Touch controls handling with unified multi-touch slider support
  const pressTimestampsRef = useRef({});
  const activeButtonsRef = useRef(new Set());

  // Enforces a minimum display window for the visual press state to prevent repaint batch drops
  const visualPress = (btn) => {
    pressTimestampsRef.current[btn] = Date.now();
    const el = document.querySelector(`[data-gba-btn="${btn}"]`);
    if (el) el.classList.add('pressed');
  };

  const visualRelease = (btn) => {
    const pressTime = pressTimestampsRef.current[btn] || 0;
    const duration = Date.now() - pressTime;
    const minDuration = 80; // 80ms visual lock

    const removeVisual = () => {
      const el = document.querySelector(`[data-gba-btn="${btn}"]`);
      if (el) el.classList.remove('pressed');
    };

    if (duration < minDuration) {
      setTimeout(removeVisual, minDuration - duration);
    } else {
      removeVisual();
    }
  };

  const pressBtn = (btn) => {
    visualPress(btn);
    const activeEmulator = emulatorRef.current;
    if (activeEmulator) {
      try {
        activeEmulator.buttonPress(btn);
      } catch (err) {}
    }
  };

  const releaseBtn = (btn) => {
    const activeEmulator = emulatorRef.current;
    if (activeEmulator) {
      try {
        activeEmulator.buttonUnpress(btn);
      } catch (err) {}
    }
    visualRelease(btn);
  };

  const handleConsoleTouch = (e) => {
    if (showSettings) return;

    let touchedMenu = false;
    const nextPressedButtons = new Set();

    for (let i = 0; i < e.touches.length; i++) {
      const touch = e.touches[i];
      const element = document.elementFromPoint(touch.clientX, touch.clientY);
      if (element) {
        const buttonElement = element.closest('[data-gba-btn]');
        if (buttonElement) {
          const buttonName = buttonElement.getAttribute('data-gba-btn');
          if (buttonName === 'Menu') {
            touchedMenu = true;
          } else if (buttonName) {
            nextPressedButtons.add(buttonName);
          }
        }
      }
    }

    if (touchedMenu) {
      if (e.cancelable) e.preventDefault();
      handleOpenSettings();
      // Unpress any GBA buttons to prevent keyboard sticking when menu opens
      const prevPressedButtons = activeButtonsRef.current;
      prevPressedButtons.forEach((btn) => {
        releaseBtn(btn);
      });
      activeButtonsRef.current.clear();
      return;
    }

    if (e.cancelable) {
      e.preventDefault();
    }

    const prevPressedButtons = activeButtonsRef.current;

    // Release keys no longer touched
    prevPressedButtons.forEach((btn) => {
      if (!nextPressedButtons.has(btn)) {
        releaseBtn(btn);
      }
    });

    // Press keys newly touched
    nextPressedButtons.forEach((btn) => {
      if (!prevPressedButtons.has(btn)) {
        pressBtn(btn);
      }
    });

    activeButtonsRef.current = nextPressedButtons;
  };

  const getCanvasClassName = (mode) => {
    let classes = [];
    // Only the explicit 'Bilinear (Smooth)' filter should use image-rendering: auto (which creates a blur)
    if (mode === 'smooth') {
      classes.push('canvas-smooth');
    } else {
      classes.push('canvas-pixelated');
    }

    if (mode === 'hq-smooth') classes.push('filter-hq-smooth');
    if (mode === 'hq-crisp') classes.push('filter-hq-crisp');
    if (mode === 'hq-vibrant') classes.push('filter-hq-vibrant');
    if (mode === 'hq-soft') classes.push('filter-hq-soft');
    if (mode === 'amd-fsr') classes.push('filter-amd-fsr');

    return classes.join(' ');
  };

  return (
    <div 
      className={`emulator-container ${romLoaded ? 'game-playing' : ''}`}
    >
      
      {!romLoaded && (
        <div 
          className="drop-zone"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => document.getElementById('rom-upload').click()}
        >
          {isReady ? (
            <>
              <FolderOpen size={48} style={{ margin: '0 auto 1rem', color: 'var(--gba-theme-drop-icon, var(--gba-indigo-light))' }} />
              <p>Load Your Game Boy ROM</p>
              <span className="btn" style={{ fontSize: '1rem' }}>Drag & Drop or Browse File (.gba, .gb, .gbc, .zip)</span>
              <input 
                type="file" 
                id="rom-upload" 
                className="file-input" 
                accept=".gba,.gb,.gbc,.zip"
                onChange={handleFileSelect}
              />
            </>
          ) : (
            <p>Initializing Emulator Core...</p>
          )}
        </div>
      )}

      {isEditLayoutMode && (
        <div style={{ position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 999999, display: 'flex', gap: '10px' }}>
          <button className="save-action-btn" style={{ padding: '10px 20px', background: '#4ade80', color: '#000', fontWeight: 'bold' }} onClick={() => {
            setIsEditLayoutMode(false);
            if (emulator && romLoadedRef.current) {
              try { emulator.resumeGame(); } catch (e) {}
            }
          }}>DONE EDITING</button>
          <button className="save-action-btn danger-btn" style={{ padding: '10px 20px' }} onClick={() => {
            const nextSettings = { ...settings };
            delete nextSettings.customLayouts;
            setSettings(nextSettings);
            localStorage.setItem('gba-settings', JSON.stringify(nextSettings));
            setIsEditLayoutMode(false);
            if (emulator && romLoadedRef.current) {
              try { emulator.resumeGame(); } catch (e) {}
            }
          }}>RESET LAYOUT</button>
        </div>
      )}

      {/* Settings are now integrated directly inside the GBA screen bezel overlay */}

      <div 
        className={`emulator-layout theme-${settings.theme ?? 'indigo'} ${showTouchControls ? 'with-touch' : 'only-keyboard'} ${settings.fullscreenMode && !showTouchControls ? 'fullscreen-mode' : ''} ${romLoaded ? 'game-playing' : ''} ${!romLoaded ? 'hide-layout' : ''}`}
        style={{
          '--dpad-scale': String(settings.dpadScale ?? 1.2),
          '--btn-scale': String(settings.btnScale ?? 1.2),
          '--lr-scale': String(settings.lrScale ?? 1.2),
          '--sys-btn-scale': String(settings.sysBtnScale ?? 1.0)
        }}
        onTouchStart={handleConsoleTouch}
        onTouchMove={handleConsoleTouch}
        onTouchEnd={handleConsoleTouch}
        onTouchCancel={handleConsoleTouch}
      >
          {/* Custom Controls Overlay */}
          {showTouchControls && (isEditLayoutMode || Object.keys(settings.customLayouts || {}).length > 0) && (
            <CustomControlsOverlay
              isEditMode={isEditLayoutMode}
              settings={settings}
              onPositionChange={handleControlPositionChange}
              handleOpenSettings={handleOpenSettings}
              getLayoutId={getLayoutId}
            />
          )}

          {/* Left Wing (D-pad) */}
          {showTouchControls && !(isEditLayoutMode || Object.keys(settings.customLayouts || {}).length > 0) && (
            <div className="console-wing wing-left">
              <button className="bumper-btn bumper-l mobile-landscape-only" data-gba-btn="L" style={{ display: 'none' }}>L</button>
              <div className="left-controls" style={{ margin: '1rem 0', minHeight: '110px' }}>
                <div className="dpad">
                  <button className="dpad-btn dpad-up" data-gba-btn="Up"></button>
                  <button className="dpad-btn dpad-down" data-gba-btn="Down"></button>
                  <button className="dpad-btn dpad-left" data-gba-btn="Left"></button>
                  <button className="dpad-btn dpad-right" data-gba-btn="Right"></button>
                  <div className="dpad-btn dpad-center"></div>
                </div>
              </div>
              <div className="sys-btn-wrapper mobile-landscape-only" style={{ display: 'none', marginTop: '3.5rem' }}>
                <button className="sys-btn select-btn" data-gba-btn="Select"></button>
                <span className="sys-btn-label">SELECT</span>
              </div>
            </div>
          )}

          {/* Center (Screen bezel & System buttons) */}
          <div className="console-center">
            {/* Screen lens */}
            <div className="screen-bezel" style={{ display: 'flex' }}>
              <div className="bezel-inner">
                <div className="canvas-wrapper" style={{ '--user-max-width': `${240 * (settings.screenScale || 3)}px` }}>
                  <canvas 
                    ref={canvasRef} 
                    width={240} 
                    height={160} 
                    id="canvas"
                    className={getCanvasClassName(videoMode)}
                  ></canvas>
                  {videoMode === 'lcd-grid' && <div className="lcd-grid-overlay"></div>}
                  {settings.showFpsCounter && (
                    <div className="fps-counter-overlay">
                      FPS: {currentFps}
                    </div>
                  )}

                  {showSettings && (
                    <div 
                      className={`screen-settings-overlay ${settingsInteractable ? 'interactable' : 'locked'}`}
                      style={{ pointerEvents: settingsInteractable ? 'auto' : 'none' }}
                      onTouchStart={(e) => e.stopPropagation()} 
                      onTouchMove={(e) => e.stopPropagation()}
                      onContextMenu={(e) => e.stopPropagation()}
                    >
                      <div className="screen-settings-header">
                        <span>SYSTEM SETTINGS</span>
                        <button className="screen-settings-close" onClick={handleCloseSettings}>
                          <X size={14} />
                        </button>
                      </div>
                      <div className="screen-settings-body">
                        <div className="setting-row">
                          <label>VOLUME</label>
                          <div className="setting-input-group">
                            <input 
                              type="range" 
                              min="0" 
                              max="1" 
                              step="0.1" 
                              value={settings.volume} 
                              onChange={(e) => handleSettingChange('volume', parseFloat(e.target.value))} 
                            />
                            <span className="value-label">{Math.round(settings.volume * 100)}%</span>
                          </div>
                        </div>

                        <div className="setting-row">
                          <label>SPEED</label>
                          <select 
                            value={settings.fastForward} 
                            onChange={(e) => handleSettingChange('fastForward', e.target.value)}
                          >
                            <option value="1">1x (Normal)</option>
                            <option value="2">2x</option>
                            <option value="3">3x</option>
                            <option value="4">4x</option>
                            <option value="5">5x</option>
                          </select>
                        </div>

                        <div className="setting-row">
                          <label>SCREEN SIZE</label>
                          <select 
                            value={settings.screenScale || 3} 
                            onChange={(e) => handleSettingChange('screenScale', parseInt(e.target.value))}
                          >
                            <option value="1">1x (240x160)</option>
                            <option value="2">2x (480x320)</option>
                            <option value="3">3x (720x480)</option>
                            <option value="4">4x (960x640)</option>
                            <option value="5">5x (1200x800)</option>
                            <option value="6">6x (1440x960)</option>
                            <option value="7">7x (1680x1120)</option>
                            <option value="8">8x (1920x1280)</option>
                            <option value="9">9x (2160x1440)</option>
                            <option value="10">10x (2400x1600)</option>
                          </select>
                        </div>

                        <div className="setting-row">
                          <label>FRAME SKIP</label>
                          <select 
                            value={settings.frameSkip} 
                            onChange={(e) => handleSettingChange('frameSkip', e.target.value)}
                          >
                            <option value="0">0 (None)</option>
                            <option value="1">1 Frame</option>
                            <option value="2">2 Frames</option>
                          </select>
                        </div>

                        <div className="setting-row">
                          <label>VIDEO FILTER</label>
                          <select 
                            value={videoMode} 
                            onChange={(e) => {
                              setVideoMode(e.target.value);
                              localStorage.setItem('gba-video-mode', e.target.value);
                            }}
                          >
                            <option value="none">None (Sharp Pixels)</option>
                            <option value="amd-fsr">AMD Super Resolution 2.0</option>
                            <option value="hq-crisp">HQ (Crisp Colors)</option>
                            <option value="hq-smooth">HQ (Balanced Colors)</option>
                            <option value="hq-vibrant">HQ (Vibrant Pops)</option>
                            <option value="hq-soft">HQ (Soft Colors)</option>
                            <option value="smooth">Bilinear (Smooth)</option>
                            <option value="lcd-grid">LCD Subpixel Grid</option>
                          </select>
                        </div>

                        <div className="setting-row checkbox-row" style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: '0.8rem' }}>
                          <label className="checkbox-label">
                            <input 
                              type="checkbox" 
                              checked={settings.autoMuteOnFastForward} 
                              onChange={(e) => handleSettingChange('autoMuteOnFastForward', e.target.checked)} 
                            />
                            Auto Mute
                          </label>
                          <span>&nbsp;&nbsp;</span>
                          <label className="checkbox-label">
                            <input 
                              type="checkbox" 
                              checked={settings.showFpsCounter} 
                              onChange={(e) => handleSettingChange('showFpsCounter', e.target.checked)} 
                            />
                            Show FPS
                          </label>
                          <span>&nbsp;&nbsp;</span>
                          <label className="checkbox-label">
                            <input 
                              type="checkbox" 
                              checked={settings.fullscreenMode} 
                              onChange={(e) => handleSettingChange('fullscreenMode', e.target.checked)} 
                            />
                            FULLSCREEN
                          </label>
                        </div>

                        <div className="setting-row">
                          <label>DPAD SIZE</label>
                          <div className="setting-input-group">
                            <input 
                              type="range" 
                              min="0.7" 
                              max="2" 
                              step="0.05"
                              value={settings.dpadScale ?? 1.2} 
                              onChange={(e) => handleSettingChange('dpadScale', parseFloat(e.target.value))} 
                            />
                            <span className="value-label">{Math.round((settings.dpadScale ?? 1.2) * 100)}%</span>
                          </div>
                        </div>

                        <div className="setting-row">
                          <label>BUTTON SIZE</label>
                          <div className="setting-input-group">
                            <input 
                              type="range" 
                              min="0.7" 
                              max="2" 
                              step="0.05"
                              value={settings.btnScale ?? 1.2} 
                              onChange={(e) => handleSettingChange('btnScale', parseFloat(e.target.value))} 
                            />
                            <span className="value-label">{Math.round((settings.btnScale ?? 1.2) * 100)}%</span>
                          </div>
                        </div>

                        <div className="setting-row">
                          <label>L/R BUMPER SIZE</label>
                          <div className="setting-input-group">
                            <input 
                              type="range" 
                              min="0.7" 
                              max="2" 
                              step="0.05"
                              value={settings.lrScale ?? 1.2} 
                              onChange={(e) => handleSettingChange('lrScale', parseFloat(e.target.value))} 
                            />
                            <span className="value-label">{Math.round((settings.lrScale ?? 1.2) * 100)}%</span>
                          </div>
                        </div>

                        <div className="setting-row">
                          <label>SYS BUTTON SIZE</label>
                          <div className="setting-input-group">
                            <input 
                              type="range" 
                              min="0.7" 
                              max="2" 
                              step="0.05"
                              value={settings.sysBtnScale ?? 1.0} 
                              onChange={(e) => handleSettingChange('sysBtnScale', parseFloat(e.target.value))} 
                            />
                            <span className="value-label">{Math.round((settings.sysBtnScale ?? 1.0) * 100)}%</span>
                          </div>
                        </div>

                        <div className="setting-row">
                          <label>CONSOLE THEME</label>
                          <select 
                            value={settings.theme ?? 'indigo'} 
                            onChange={(e) => handleSettingChange('theme', e.target.value)}
                          >
                            <option value="indigo">Indigo (Classic)</option>
                            <option value="glacier">Glacier (Clear Blue)</option>
                            <option value="spice-orange">Spice Orange</option>
                            <option value="charcoal">Charcoal Black</option>
                            <option value="platinum">Platinum Silver</option>
                            <option value="fuchsia">Fuchsia (Clear Pink)</option>
                            <option value="midnight-blue">Midnight Blue (Clear)</option>
                            <option value="pink">Pink Edition</option>
                            <option value="gold">Gold Edition</option>
                            <option value="famicom">Famicom 20th Anniversary</option>
                            <option value="nes">NES Classic Edition</option>
                            <option value="pikachu">Pikachu Yellow</option>
                            <option value="charizard">Charizard Orange</option>
                            <option value="celebi">Celebi Green</option>
                          </select>
                        </div>

                        <div className="setting-row">
                          <label>SAVE MANAGEMENT</label>
                          <div className="save-actions-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                            <button className="save-action-btn" onClick={handleExportSave}>
                              EXPORT SAVE (.SAV)
                            </button>
                            <button className="save-action-btn" onClick={handleExportState}>
                              EXPORT STATE (.SS1)
                            </button>
                            <button className="save-action-btn" onClick={() => document.getElementById('save-import-file').click()}>
                              IMPORT SAVE (.SAV / .SSX)
                            </button>
                            <input 
                              type="file" 
                              id="save-import-file" 
                              accept=".sav" 
                              style={{ display: 'none' }} 
                              onChange={handleImportSave} 
                            />
                            <button className="save-action-btn" onClick={() => { setIsEditLayoutMode(true); setShowTouchControls(true); setShowSettings(false); }} style={{ marginTop: '0.4rem', background: 'var(--gba-indigo-light)', color: '#fff' }}>
                              EDIT CONTROLS LAYOUT
                            </button>
                            <button className="save-action-btn danger-btn" onClick={handleFactoryReset} style={{ marginTop: '0.4rem' }}>
                              FACTORY RESET APP
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

              </div>
            </div>

            {/* System buttons + L/R bumpers on the same line (centered below screen lens) */}
            {showTouchControls && !(isEditLayoutMode || Object.keys(settings.customLayouts || {}).length > 0) && (
              <div className="menu-buttons-container hide-on-mobile-landscape">
                <button className="bumper-btn bumper-l" data-gba-btn="L">L</button>
                
                <div className="sys-btn-wrapper">
                  <button className="sys-btn select-btn" data-gba-btn="Select"></button>
                  <span className="sys-btn-label">SELECT</span>
                </div>

                <div className="sys-btn-wrapper">
                  <button className="sys-btn menu-btn" data-gba-btn="Menu" onClick={handleOpenSettings}></button>
                  <span className="sys-btn-label">MENU</span>
                </div>

                <div className="sys-btn-wrapper">
                  <button className="sys-btn start-btn" data-gba-btn="Start"></button>
                  <span className="sys-btn-label">START</span>
                </div>

                <button className="bumper-btn bumper-r" data-gba-btn="R">R</button>
              </div>
            )}
          </div>

          {/* Right Wing (A/B buttons + speaker) */}
          {showTouchControls && !(isEditLayoutMode || Object.keys(settings.customLayouts || {}).length > 0) && (
            <div className="console-wing wing-right">
              <button className="bumper-btn bumper-r mobile-landscape-only" data-gba-btn="R" style={{ display: 'none' }}>R</button>
              <div className="right-controls" style={{ margin: '1rem 0', minHeight: '110px' }}>
                <div className="action-buttons">
                  <div className="action-btn-wrapper b-btn-wrapper">
                    <button className="action-btn btn-b" data-gba-btn="B">B</button>
                  </div>
                  <div className="action-btn-wrapper a-btn-wrapper">
                    <button className="action-btn btn-a" data-gba-btn="A">A</button>
                  </div>
                </div>
              </div>
              <div className="mobile-landscape-only" style={{ display: 'none', gap: '1.5rem', alignItems: 'center', marginTop: '3.5rem' }}>
                <div className="sys-btn-wrapper">
                  <button className="sys-btn menu-btn" data-gba-btn="Menu" onClick={handleOpenSettings}></button>
                  <span className="sys-btn-label">MENU</span>
                </div>
                <div className="sys-btn-wrapper">
                  <button className="sys-btn start-btn" data-gba-btn="Start"></button>
                  <span className="sys-btn-label">START</span>
                </div>
              </div>
              <div className="speaker-grille hide-on-mobile-landscape">
                <div className="grille-hole"></div>
                <div className="grille-hole"></div>
                <div className="grille-hole"></div>
                <div className="grille-hole"></div>
                <div className="grille-hole"></div>
                <div className="grille-hole"></div>
              </div>
            </div>
          )}
        </div>

      {!showTouchControls && romLoaded && (
        <div className="keyboard-instructions">
          <div className="key-item"><span>D-PAD</span><strong>Arrows</strong></div>
          <div className="key-item"><span>A</span><strong>Z</strong></div>
          <div className="key-item"><span>B</span><strong>X</strong></div>
          <div className="key-item"><span>L</span><strong>Q</strong></div>
          <div className="key-item"><span>R</span><strong>W</strong></div>
          <div className="key-item"><span>START</span><strong>Enter</strong></div>
          <div className="key-item"><span>SELECT</span><strong>Shift</strong></div>
        </div>
      )}

    </div>
  );
}

