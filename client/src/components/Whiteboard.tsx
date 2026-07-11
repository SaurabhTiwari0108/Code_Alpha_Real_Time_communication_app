import React, { useEffect, useRef, useState, useContext } from 'react';
import { SocketContext } from '../context/SocketContext';
import { Trash2, PenTool, Eraser } from 'lucide-react';

interface DrawData {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  color: string;
  lineWidth: number;
}

const Whiteboard: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { socket } = useContext(SocketContext);
  
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#3b82f6');
  const [lineWidth, setLineWidth] = useState(3);
  const [isEraser, setIsEraser] = useState(false);

  const currentPos = useRef({ x: 0, y: 0 });

  // Handle resizing
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const resizeCanvas = () => {
      // Save canvas content
      const tempCanvas = document.createElement('canvas');
      const tempCtx = tempCanvas.getContext('2d');
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;
      if (tempCtx) tempCtx.drawImage(canvas, 0, 0);

      // Resize
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;

      // Restore
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.drawImage(tempCanvas, 0, 0);
    };

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas(); // initial size

    return () => window.removeEventListener('resize', resizeCanvas);
  }, []);

  // Handle socket events
  useEffect(() => {
    if (!socket) return;

    const onDraw = (data: DrawData) => {
      drawLine(data.x0, data.y0, data.x1, data.y1, data.color, data.lineWidth, false);
    };

    const onClear = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    };

    socket.on('draw', onDraw);
    socket.on('clear-board', onClear);

    return () => {
      socket.off('draw', onDraw);
      socket.off('clear-board', onClear);
    };
  }, [socket]);

  const drawLine = (
    x0: number, y0: number, x1: number, y1: number,
    color: string, lineWidth: number, emit: boolean
  ) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
    ctx.closePath();

    if (!emit || !socket) return;

    const w = canvas.width;
    const h = canvas.height;

    // Send relative coordinates so it works on different screen sizes
    socket.emit('draw', {
      x0: x0 / w,
      y0: y0 / h,
      x1: x1 / w,
      y1: y1 / h,
      color,
      lineWidth,
    });
  };

  // Wrapper for socket draw which uses relative coords
  useEffect(() => {
    if (!socket) return;
    const onDrawRelative = (data: DrawData) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      drawLine(
        data.x0 * canvas.width,
        data.y0 * canvas.height,
        data.x1 * canvas.width,
        data.y1 * canvas.height,
        data.color,
        data.lineWidth,
        false
      );
    };
    
    socket.off('draw'); // remove old listener
    socket.on('draw', onDrawRelative);
    
    return () => {
      socket.off('draw', onDrawRelative);
    };
  }, [socket]);

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    if (e.type.includes('touch')) {
      const touch = (e as React.TouchEvent).touches[0];
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top
      };
    } else {
      const mouse = e as React.MouseEvent;
      return {
        x: mouse.clientX - rect.left,
        y: mouse.clientY - rect.top
      };
    }
  };

  const onMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setIsDrawing(true);
    currentPos.current = getCoordinates(e, canvas);
  };

  const onMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const newPos = getCoordinates(e, canvas);
    const activeColor = isEraser ? '#111827' : color; // Match bg-dark-900 for eraser
    const activeWidth = isEraser ? 20 : lineWidth;

    drawLine(
      currentPos.current.x,
      currentPos.current.y,
      newPos.x,
      newPos.y,
      activeColor,
      activeWidth,
      true
    );
    
    currentPos.current = newPos;
  };

  const onMouseUp = () => {
    setIsDrawing(false);
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (socket) socket.emit('clear-board');
  };

  return (
    <div className="flex flex-col h-full bg-dark-900 rounded-2xl border border-gray-700 overflow-hidden relative">
      
      {/* Toolbar */}
      <div className="absolute top-4 left-4 bg-dark-800/90 backdrop-blur-md p-2 rounded-xl border border-gray-600 flex items-center space-x-2 z-10 shadow-xl">
        <button
          onClick={() => setIsEraser(false)}
          className={`p-2 rounded-lg transition-colors ${!isEraser ? 'bg-primary-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-700'}`}
          title="Pen"
        >
          <PenTool className="w-5 h-5" />
        </button>
        <button
          onClick={() => setIsEraser(true)}
          className={`p-2 rounded-lg transition-colors ${isEraser ? 'bg-primary-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-700'}`}
          title="Eraser"
        >
          <Eraser className="w-5 h-5" />
        </button>
        
        <div className="w-px h-6 bg-gray-600 mx-2"></div>
        
        <input 
          type="color" 
          value={color}
          onChange={(e) => { setColor(e.target.value); setIsEraser(false); }}
          className="w-8 h-8 rounded cursor-pointer border-0 p-0 bg-transparent"
          title="Color"
        />
        
        <input 
          type="range" 
          min="1" 
          max="20" 
          value={lineWidth}
          onChange={(e) => setLineWidth(Number(e.target.value))}
          className="w-24 accent-primary-500 ml-2"
          title="Line Width"
        />

        <div className="w-px h-6 bg-gray-600 mx-2"></div>

        <button
          onClick={handleClear}
          className="p-2 rounded-lg text-red-400 hover:text-red-300 hover:bg-gray-700 transition-colors"
          title="Clear Board"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>

      {/* Canvas Container */}
      <div 
        ref={containerRef}
        className="flex-1 w-full h-full cursor-crosshair touch-none bg-dark-900"
      >
        <canvas
          ref={canvasRef}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseOut={onMouseUp}
          onTouchStart={onMouseDown}
          onTouchMove={onMouseMove}
          onTouchEnd={onMouseUp}
          onTouchCancel={onMouseUp}
        />
      </div>
    </div>
  );
};

export default Whiteboard;
