import React from 'react';

export default function FpsCounter({ currentFps }) {
  return (
    <div className="fps-counter-overlay">
      FPS: {currentFps}
    </div>
  );
}
