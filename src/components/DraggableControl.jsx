import React, { useState, useEffect, useRef } from 'react';

export default function DraggableControl({ 
  id, 
  position, 
  onPositionChange, 
  isEditMode, 
  children,
  className = ""
}) {
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef(null);
  
  // Local state for smooth dragging before committing to parent
  const [localPos, setLocalPos] = useState(position);
  const [computed, setComputed] = useState(false);

  useEffect(() => {
    if (position && !isDragging) {
      setLocalPos(position);
    }
  }, [position, isDragging]);

  React.useLayoutEffect(() => {
    if (isEditMode && !position && !computed && containerRef.current) {
      const container = containerRef.current.closest('.emulator-layout') || containerRef.current.parentElement;
      const parentRect = container.getBoundingClientRect();
      const elRect = containerRef.current.getBoundingClientRect();
      
      const cx = elRect.left + elRect.width / 2;
      const cy = elRect.top + elRect.height / 2;
      
      const newX = ((cx - parentRect.left) / parentRect.width) * 100;
      const newY = ((cy - parentRect.top) / parentRect.height) * 100;
      
      setLocalPos({ x: newX, y: newY });
      setComputed(true);
      if (onPositionChange) {
        onPositionChange(id, { x: newX, y: newY });
      }
    }
  }, [isEditMode, position, computed, id]);

  const handlePointerDown = (e) => {
    if (!isEditMode) return;
    
    // Don't drag if they didn't left click (or touch)
    if (e.button !== undefined && e.button !== 0) return;

    e.stopPropagation();
    setIsDragging(true);

    const el = containerRef.current;
    if (!el) return;
    el.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e) => {
    if (!isDragging || !isEditMode) return;
    e.stopPropagation();

    // Get the parent container's bounding rect
    const container = containerRef.current.closest('.emulator-layout') || containerRef.current.parentElement;
    const parentRect = container.getBoundingClientRect();
    
    // Calculate new position as percentage
    let newX = ((e.clientX - parentRect.left) / parentRect.width) * 100;
    let newY = ((e.clientY - parentRect.top) / parentRect.height) * 100;

    // Clamp to 0-100%
    newX = Math.max(0, Math.min(100, newX));
    newY = Math.max(0, Math.min(100, newY));

    setLocalPos({ x: newX, y: newY });
  };

  const handlePointerUp = (e) => {
    if (!isDragging || !isEditMode) return;
    e.stopPropagation();
    setIsDragging(false);
    
    const el = containerRef.current;
    if (el) {
      el.releasePointerCapture(e.pointerId);
    }
    setComputed(false); // Let it rely on customPos now
    
    // Commit position to parent
    if (onPositionChange) {
      onPositionChange(id, localPos);
    }
  };

  const handleTouch = (e) => {
    if (isEditMode) {
      e.stopPropagation();
    }
  };

  // If not in edit mode and no custom position is set, 
  // we might want to just render children normally without wrapper styling.
  // But to keep things simple, we can always render the wrapper.
  // If position is null, we can strip the absolute styling and use default layout.
  
  const hasCustomPos = position != null;
  const isReadyToAbsolute = hasCustomPos || (isEditMode && computed) || (isEditMode && localPos);
  const isActive = isEditMode || hasCustomPos;

  if (!isActive) {
    return children;
  }

  return (
    <div 
      ref={containerRef}
      className={`draggable-control ${className} ${isEditMode ? 'edit-mode' : ''} ${isDragging ? 'dragging' : ''}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onTouchStart={handleTouch}
      onTouchMove={handleTouch}
      onTouchEnd={handleTouch}
      style={{
        position: isReadyToAbsolute ? 'absolute' : 'relative',
        left: isReadyToAbsolute ? `${localPos.x}%` : 'auto',
        top: isReadyToAbsolute ? `${localPos.y}%` : 'auto',
        transform: isReadyToAbsolute ? 'translate(-50%, -50%)' : 'none',
        touchAction: isEditMode ? 'none' : 'auto',
        zIndex: isDragging ? 1000 : 100,
        cursor: isEditMode ? (isDragging ? 'grabbing' : 'grab') : 'default',
        padding: isEditMode ? '10px' : '0', // Larger hit area in edit mode
        border: isEditMode ? '2px dashed rgba(255,255,255,0.5)' : 'none',
        borderRadius: '8px',
        backgroundColor: isEditMode ? 'rgba(0,0,0,0.2)' : 'transparent',
      }}
    >
      {/* Overlay to block button clicks while dragging */}
      {isEditMode && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 10 }}></div>
      )}
      {children}
    </div>
  );
}
