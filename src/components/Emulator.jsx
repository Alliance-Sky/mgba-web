import React, { useEffect, useRef, useState } from 'react';
import mGBA from '@thenick775/mgba-wasm';
import { FolderOpen, Settings, X, Edit3 } from 'lucide-react';
import CustomControlsOverlay from './CustomControlsOverlay';
import SettingsOverlay from './SettingsOverlay';
import FpsCounter from './FpsCounter';
import useDebounce from '../hooks/useDebounce';

export default function Emulator() {
  const canvasRef = useRef(null);
  const romUploadRef = useRef(null);
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

  const debouncedSettings = useDebounce(settings, 300);
  useEffect(() => {
    localStorage.setItem('gba-settings', JSON.stringify(debouncedSettings));
  }, [debouncedSettings]);

  const currentOrientationSuffix = isLandscape ? 'landscape' : 'portrait';
  const hasCustomLayoutForCurrentOrientation = Object.keys(settings.customLayouts || {}).some(k => k.endsWith(currentOrientationSuffix));

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
    const handleVisibilityChange = () => {
      const emu = emulatorRef.current;
      const isLoaded = romLoadedRef.current;
      if (document.hidden) {
        if (emu && isLoaded) {
          try { emu.pauseGame(); } catch (e) {}
          try { emu.FSSync().catch(e => console.error("Visibility sync failed:", e)); } catch (e) {}
        }
      } else {
        if (emu && isLoaded && !showSettingsRef.current) {
          try { emu.resumeGame(); } catch (e) {}
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

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
  };

  const handleSettingChange = (key, value) => {
    const nextSettings = { ...settings, [key]: value };
    setSettings(nextSettings);
    
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

  // Track FPS dynamically
  useEffect(() => {
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
              },
              videoFrameEndedCallback: () => {
                frameCountRef.current++;
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
      'ArrowUp': 'Up',
      'ArrowDown': 'Down',
      'ArrowLeft': 'Left',
      'ArrowRight': 'Right',
      'KeyZ': 'A',
      'KeyX': 'B',
      'KeyQ': 'L',
      'KeyW': 'R',
      'Enter': 'Start',
      'ShiftLeft': 'Select',
      'ShiftRight': 'Select'
    };

    const handleKeyDown = (e) => {
      if (e.code === 'Escape') {
        e.preventDefault();
        if (showSettingsRef.current) {
          handleCloseSettings();
        } else {
          handleOpenSettings();
        }
        return;
      }

      const btn = KEY_MAP[e.code];
      if (btn) {
        visualPress(btn);
      }

      setShowTouchControls(false);
    };

    const handleKeyUp = (e) => {
      const btn = KEY_MAP[e.code];
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

    const extMatch = file.name.match(/\.ss\d+$/i);
    if (!extMatch) {
      alert("Please select a valid save state (.ss0, .ss1, etc) file!");
      return;
    }

    const romName = emulator.gameName ? emulator.gameName.split('/').pop() : '';
    if (!romName) {
      alert("No active game to import data for!");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        if (typeof emulator.uploadAutoSaveState === 'function') {
          await emulator.uploadAutoSaveState(emulator.autoSaveStateName, data);
          const success = emulator.loadAutoSaveState();
          if (success) {
            try { await emulator.FSSync(); } catch (e) {}
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
  };

  const handleFactoryReset = async () => {
    const confirmReset = window.confirm(
      "FACTORY RESET APP\n\n" +
      "This will permanently delete:\n" +
      "• All save states and in-game progress\n" +
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
            if (key.includes('mgba-web-cache-')) {
              await window.caches.delete(key);
            }
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

  const buttonBoundsRef = useRef(new Map());

  useEffect(() => {
    const updateBounds = () => {
      const bounds = new Map();
      document.querySelectorAll('[data-gba-btn]').forEach(el => {
        const rect = el.getBoundingClientRect();
        // Ignore hidden elements (like the landscape buttons when in portrait)
        if (rect.width > 0 && rect.height > 0) {
          bounds.set(el.getAttribute('data-gba-btn'), rect);
        }
      });
      buttonBoundsRef.current = bounds;
    };
    
    // Update after layout changes
    updateBounds();
    // setTimeout to allow the browser to paint first for accurate layout metrics
    const handleResize = () => setTimeout(updateBounds, 100);
    setTimeout(updateBounds, 100); // Also update after a slight delay on mount
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [showTouchControls, isEditLayoutMode, settings, isReady, romLoaded]);

  const handleConsoleTouch = (e) => {
    if (showSettings) return;

    let touchedMenu = false;
    const nextPressedButtons = new Set();

    for (let i = 0; i < e.touches.length; i++) {
      const touch = e.touches[i];
      let buttonName = null;
      buttonBoundsRef.current.forEach((rect, btn) => {
        if (
          touch.clientX >= rect.left &&
          touch.clientX <= rect.right &&
          touch.clientY >= rect.top &&
          touch.clientY <= rect.bottom
        ) {
          buttonName = btn;
        }
      });
      
      if (buttonName) {
        if (buttonName === 'Menu') {
          touchedMenu = true;
        } else {
          nextPressedButtons.add(buttonName);
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
          onClick={() => romUploadRef.current && romUploadRef.current.click()}
        >
          {isReady ? (
            <>
              <FolderOpen size={48} style={{ margin: '0 auto 1rem', color: 'var(--gba-theme-drop-icon, var(--gba-indigo-light))' }} />
              <p>Load Your Game Boy ROM</p>
              <span className="btn" style={{ fontSize: '1rem' }}>Drag & Drop or Browse File (.gba, .gb, .gbc, .zip)</span>
              <input 
                type="file" 
                ref={romUploadRef}
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
            const orientationSuffix = isLandscape ? 'landscape' : 'portrait';
            if (nextSettings.customLayouts) {
              Object.keys(nextSettings.customLayouts).forEach(key => {
                if (key.endsWith(orientationSuffix)) {
                  delete nextSettings.customLayouts[key];
                }
              });
            }
            setSettings(nextSettings);
            localStorage.setItem('gba-settings', JSON.stringify(nextSettings));
            setIsEditLayoutMode(false);
            if (emulator && romLoadedRef.current) {
              try { emulator.resumeGame(); } catch (e) {}
            }
          }}>RESET {isLandscape ? 'LANDSCAPE' : 'PORTRAIT'} LAYOUT</button>
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
          {showTouchControls && (isEditLayoutMode || hasCustomLayoutForCurrentOrientation) && (
            <CustomControlsOverlay
              isEditMode={isEditLayoutMode}
              settings={settings}
              onPositionChange={handleControlPositionChange}
              handleOpenSettings={handleOpenSettings}
              getLayoutId={getLayoutId}
              isLandscape={isLandscape}
            />
          )}

          {/* Left Wing (D-pad) */}
          {showTouchControls && !(isEditLayoutMode || hasCustomLayoutForCurrentOrientation) && (
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
                    <FpsCounter currentFps={currentFps} />
                  )}

                  {showSettings && (
                    <SettingsOverlay 
                      settings={settings}
                      settingsInteractable={settingsInteractable}
                      videoMode={videoMode}
                      handleCloseSettings={handleCloseSettings}
                      handleSettingChange={handleSettingChange}
                      setVideoMode={setVideoMode}
                      handleExportState={handleExportState}
                      handleImportSave={handleImportSave}
                      handleFactoryReset={handleFactoryReset}
                      setIsEditLayoutMode={setIsEditLayoutMode}
                      setShowTouchControls={setShowTouchControls}
                      setShowSettings={setShowSettings}
                    />
                  )}
                </div>

              </div>
            </div>

            {/* System buttons + L/R bumpers on the same line (centered below screen lens) */}
            {showTouchControls && !(isEditLayoutMode || hasCustomLayoutForCurrentOrientation) && (
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
          {showTouchControls && !(isEditLayoutMode || hasCustomLayoutForCurrentOrientation) && (
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

