import React, { useState, useRef, ReactNode } from 'react';
import ReactDOM from 'react-dom';

interface TooltipProps {
  children: ReactNode;
  content: ReactNode;
  position?: 'top' | 'right' | 'bottom' | 'left';
}

const Tooltip: React.FC<TooltipProps> = ({ children, content, position = 'right' }) => {
  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);

  const handleMouseEnter = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      let top = 0, left = 0;
      
      switch (position) {
        case 'right':
          top = rect.top + window.scrollY + rect.height / 2;
          left = rect.right + window.scrollX + 10;
          break;
        // Default to right for now
        default:
          top = rect.top + window.scrollY + rect.height / 2;
          left = rect.right + window.scrollX + 10;
      }

      setCoords({ top, left });
      setVisible(true);
    }
  };

  const handleMouseLeave = () => {
    setVisible(false);
  };

  const tooltipContent = visible && (
    ReactDOM.createPortal(
      <div 
        className="fixed z-[100] p-3 bg-black text-white text-xs rounded-lg shadow-lg max-w-xs border border-gray-700 animate-fadeIn"
        style={{ 
          top: `${coords.top}px`, 
          left: `${coords.left}px`,
          transform: 'translateY(-50%)' 
        }}
      >
        {content}
      </div>,
      document.body
    )
  );

  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="inline-flex items-center justify-center"
      >
        {children}
      </div>
      {tooltipContent}
    </>
  );
};

export default Tooltip;
