import React, { useRef } from 'react';
import { X } from 'lucide-react';
import styles from './SettingsOverlay.module.css';

export default function SettingsOverlay({
  settings,
  settingsInteractable,
  videoMode,
  handleCloseSettings,
  handleSettingChange,
  setVideoMode,
  handleExportState,
  handleImportSave,
  handleFactoryReset,
  setIsEditLayoutMode,
  setShowTouchControls,
  setShowSettings
}) {
  const saveImportRef = useRef(null);

  return (
    <div 
      className={`${styles['screen-settings-overlay']} ${settingsInteractable ? styles['interactable'] : styles['locked']}`}
      style={{ pointerEvents: settingsInteractable ? 'auto' : 'none' }}
      onTouchStart={(e) => e.stopPropagation()} 
      onTouchMove={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.stopPropagation()}
    >
      <div className={styles['screen-settings-header']}>
        <span>SYSTEM SETTINGS</span>
        <button className={styles['screen-settings-close']} onClick={handleCloseSettings}>
          <X size={14} />
        </button>
      </div>
      <div className={styles['screen-settings-body']}>
        <div className={styles['setting-row']}>
          <label>VOLUME</label>
          <div className={styles['setting-input-group']}>
            <input 
              type="range" 
              min="0" 
              max="1" 
              step="0.1" 
              value={settings.volume} 
              onChange={(e) => handleSettingChange('volume', parseFloat(e.target.value))} 
            />
            <span className={styles['value-label']}>{Math.round(settings.volume * 100)}%</span>
          </div>
        </div>

        <div className={styles['setting-row']}>
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

        <div className={styles['setting-row']}>
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

        <div className={styles['setting-row']}>
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

        <div className={styles['setting-row']}>
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

        <div className={`${styles['setting-row']} ${styles['checkbox-row']}`} style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: '0.8rem' }}>
          <label className={styles['checkbox-label']}>
            <input 
              type="checkbox" 
              checked={settings.autoMuteOnFastForward} 
              onChange={(e) => handleSettingChange('autoMuteOnFastForward', e.target.checked)} 
            />
            Auto Mute
          </label>
          <span>&nbsp;&nbsp;</span>
          <label className={styles['checkbox-label']}>
            <input 
              type="checkbox" 
              checked={settings.showFpsCounter} 
              onChange={(e) => handleSettingChange('showFpsCounter', e.target.checked)} 
            />
            Show FPS
          </label>
          <span>&nbsp;&nbsp;</span>
          <label className={styles['checkbox-label']}>
            <input 
              type="checkbox" 
              checked={settings.fullscreenMode} 
              onChange={(e) => handleSettingChange('fullscreenMode', e.target.checked)} 
            />
            FULLSCREEN
          </label>
        </div>

        <div className={styles['setting-row']}>
          <label>DPAD SIZE</label>
          <div className={styles['setting-input-group']}>
            <input 
              type="range" 
              min="0.7" 
              max="2" 
              step="0.05"
              value={settings.dpadScale ?? 1.2} 
              onChange={(e) => handleSettingChange('dpadScale', parseFloat(e.target.value))} 
            />
            <span className={styles['value-label']}>{Math.round((settings.dpadScale ?? 1.2) * 100)}%</span>
          </div>
        </div>

        <div className={styles['setting-row']}>
          <label>BUTTON SIZE</label>
          <div className={styles['setting-input-group']}>
            <input 
              type="range" 
              min="0.7" 
              max="2" 
              step="0.05"
              value={settings.btnScale ?? 1.2} 
              onChange={(e) => handleSettingChange('btnScale', parseFloat(e.target.value))} 
            />
            <span className={styles['value-label']}>{Math.round((settings.btnScale ?? 1.2) * 100)}%</span>
          </div>
        </div>

        <div className={styles['setting-row']}>
          <label>L/R BUMPER SIZE</label>
          <div className={styles['setting-input-group']}>
            <input 
              type="range" 
              min="0.7" 
              max="2" 
              step="0.05"
              value={settings.lrScale ?? 1.2} 
              onChange={(e) => handleSettingChange('lrScale', parseFloat(e.target.value))} 
            />
            <span className={styles['value-label']}>{Math.round((settings.lrScale ?? 1.2) * 100)}%</span>
          </div>
        </div>

        <div className={styles['setting-row']}>
          <label>SYS BUTTON SIZE</label>
          <div className={styles['setting-input-group']}>
            <input 
              type="range" 
              min="0.7" 
              max="2" 
              step="0.05"
              value={settings.sysBtnScale ?? 1.0} 
              onChange={(e) => handleSettingChange('sysBtnScale', parseFloat(e.target.value))} 
            />
            <span className={styles['value-label']}>{Math.round((settings.sysBtnScale ?? 1.0) * 100)}%</span>
          </div>
        </div>

        <div className={styles['setting-row']}>
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

        <div className={styles['setting-row']}>
          <label>SAVE MANAGEMENT</label>
          <div className={styles['save-actions-group']} style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <button className={styles['save-action-btn']} onClick={handleExportState}>
              EXPORT SAVE STATE (.SS1)
            </button>
            <button className={styles['save-action-btn']} onClick={() => saveImportRef.current && saveImportRef.current.click()}>
              IMPORT SAVE STATE (.SS1 / .SSX)
            </button>
            <input 
              type="file" 
              ref={saveImportRef}
              accept=".ss0,.ss1,.ss2,.ss3,.ss4,.ss5,.ss6,.ss7,.ss8,.ss9" 
              style={{ display: 'none' }} 
              onChange={handleImportSave} 
            />
            <button className={styles['save-action-btn']} onClick={() => { setIsEditLayoutMode(true); setShowTouchControls(true); setShowSettings(false); }} style={{ marginTop: '0.4rem', background: 'var(--gba-indigo-light)', color: '#fff' }}>
              EDIT CONTROLS LAYOUT
            </button>
            <button className={`${styles['save-action-btn']} ${styles['danger-btn']}`} onClick={handleFactoryReset} style={{ marginTop: '0.4rem' }}>
              FACTORY RESET APP
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
