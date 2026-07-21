import React from 'react';
import DraggableControl from './DraggableControl';

export default function CustomControlsOverlay({ 
  isEditMode, 
  settings, 
  onPositionChange, 
  handleOpenSettings,
  getLayoutId
}) {
  const defaults = {
    'dpad': { x: 20, y: 70 },
    'ab': { x: 80, y: 70 },
    'l': { x: 10, y: 20 },
    'r': { x: 90, y: 20 },
    'select': { x: 30, y: 90 },
    'menu': { x: 50, y: 90 },
    'start': { x: 70, y: 90 },
  };

  const getPos = (id) => settings.customLayouts?.[getLayoutId(id)] || defaults[id];

  return (
    <>
      <DraggableControl id={getLayoutId('dpad')} position={getPos('dpad')} onPositionChange={onPositionChange} isEditMode={isEditMode}>
        <div className="dpad">
          <button className="dpad-btn dpad-up" data-gba-btn="Up"></button>
          <button className="dpad-btn dpad-down" data-gba-btn="Down"></button>
          <button className="dpad-btn dpad-left" data-gba-btn="Left"></button>
          <button className="dpad-btn dpad-right" data-gba-btn="Right"></button>
          <div className="dpad-btn dpad-center"></div>
        </div>
      </DraggableControl>

      <DraggableControl id={getLayoutId('ab')} position={getPos('ab')} onPositionChange={onPositionChange} isEditMode={isEditMode}>
        <div className="action-buttons">
          <div className="action-btn-wrapper b-btn-wrapper">
            <button className="action-btn btn-b" data-gba-btn="B">B</button>
          </div>
          <div className="action-btn-wrapper a-btn-wrapper">
            <button className="action-btn btn-a" data-gba-btn="A">A</button>
          </div>
        </div>
      </DraggableControl>

      <DraggableControl id={getLayoutId('l')} position={getPos('l')} onPositionChange={onPositionChange} isEditMode={isEditMode}>
        <button className="bumper-btn bumper-l" data-gba-btn="L" style={{ pointerEvents: 'auto' }}>L</button>
      </DraggableControl>

      <DraggableControl id={getLayoutId('r')} position={getPos('r')} onPositionChange={onPositionChange} isEditMode={isEditMode}>
        <button className="bumper-btn bumper-r" data-gba-btn="R" style={{ pointerEvents: 'auto' }}>R</button>
      </DraggableControl>

      <DraggableControl id={getLayoutId('select')} position={getPos('select')} onPositionChange={onPositionChange} isEditMode={isEditMode}>
        <div className="sys-btn-wrapper" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <button className="sys-btn select-btn" data-gba-btn="Select"></button>
          <span className="sys-btn-label">SELECT</span>
        </div>
      </DraggableControl>

      <DraggableControl id={getLayoutId('menu')} position={getPos('menu')} onPositionChange={onPositionChange} isEditMode={isEditMode}>
        <div className="sys-btn-wrapper" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <button className="sys-btn menu-btn" data-gba-btn="Menu" onClick={handleOpenSettings}></button>
          <span className="sys-btn-label">MENU</span>
        </div>
      </DraggableControl>

      <DraggableControl id={getLayoutId('start')} position={getPos('start')} onPositionChange={onPositionChange} isEditMode={isEditMode}>
        <div className="sys-btn-wrapper" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <button className="sys-btn start-btn" data-gba-btn="Start"></button>
          <span className="sys-btn-label">START</span>
        </div>
      </DraggableControl>
    </>
  );
}
