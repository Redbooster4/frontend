import React, { useRef, useState, useEffect } from "react";
import {io} from "socket.io-client";
export default function DrawingApp() 
{
  const containerRef = useRef(null);
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef({x:0,y:0});

  const [color, setColor] = useState("#000000");
  const [brushSize, setBrushSize] = useState(6);
  const [isEraser, setIsEraser] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  //FOR SOCKET.IO
    const [isDrawing, setIsDrawing] = useState(false);
    const [socket, setSocket] = useState(null);
    const canvasRef = useRef(null);
    const ctxRef = useRef(null);

  const resizeCanvas=()=>{
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio||1;
    const width = Math.floor(rect.width);
    const height = Math.floor(rect.height||480);

    canvas.width = Math.max(1, width*dpr);
    canvas.height = Math.max(1, height*dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (historyIndex>=0 && history[historyIndex]) {
      const img = new Image();
      img.onload = ()=>{
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
      };
      img.src = history[historyIndex];
    }
  };

  useEffect(()=>{
    resizeCanvas();
    const onResize = () => resizeCanvas();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historyIndex]);

  // helpers to get coordinates relative to canvas CSS pixels
  const getPoint = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    // For pointer events use clientX/Y; for touch, use first touch
    let clientX, clientY;
    if (e.touches && e.touches[0]) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const beginStroke = (point) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    isDrawingRef.current = true;
    lastPointRef.current = point;

    ctx.beginPath();
    ctx.moveTo(point.x, point.y);
  };

  const drawLineTo = (point) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    ctx.lineWidth = brushSize;
    ctx.globalCompositeOperation = isEraser?"destination-out":"source-over";
    ctx.strokeStyle = color;

    ctx.lineTo(point.x, point.y);
    ctx.stroke();
    lastPointRef.current = point;
  };

  const endStroke = () => {
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    const dataURL = canvas.toDataURL("image/png", 1.0);

    // keep history and cap it to 50 states to avoid memory bloat
    setHistory((prev) => {
      const newHist = prev.slice(0, historyIndex + 1);
      newHist.push(dataURL);
      if (newHist.length > 50) newHist.shift();
      return newHist;
    });
    setHistoryIndex((prevIndex) => Math.min(prevIndex + 1, 49));

    isDrawingRef.current = false;
  };

  // Pointer event handlers (works for mouse and touch if pointer events supported)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const pointerDown = (e) => {
      // prevent scrolling on touch
      if (e.cancelable) e.preventDefault();
      const pt = getPoint(e);
      beginStroke(pt);
    };

    const pointerMove = (e) => {
      if (!isDrawingRef.current) return;
      const pt = getPoint(e);
      drawLineTo(pt);
    };

    const pointerUp = () => {
      endStroke();
    };

    // Use pointer events if available
    canvas.addEventListener("pointerdown", pointerDown);
    window.addEventListener("pointermove", pointerMove);
    window.addEventListener("pointerup", pointerUp);

    // Fallback for older browsers: touch events
    canvas.addEventListener("touchstart", pointerDown, { passive: false });
    window.addEventListener("touchmove", pointerMove, { passive: false });
    window.addEventListener("touchend", pointerUp);

    // Mouse events fallback
    canvas.addEventListener("mousedown", pointerDown);
    window.addEventListener("mousemove", pointerMove);
    window.addEventListener("mouseup", pointerUp);

    return () => {
      canvas.removeEventListener("pointerdown", pointerDown);
      window.removeEventListener("pointermove", pointerMove);
      window.removeEventListener("pointerup", pointerUp);

      canvas.removeEventListener("touchstart", pointerDown);
      window.removeEventListener("touchmove", pointerMove);
      window.removeEventListener("touchend", pointerUp);

      canvas.removeEventListener("mousedown", pointerDown);
      window.removeEventListener("mousemove", pointerMove);
      window.removeEventListener("mouseup", pointerUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [color, brushSize, isEraser, historyIndex]);

  // Undo / Redo functions
  const undo = () => {
    if (historyIndex <= 0) return;
    const newIndex = historyIndex - 1;
    setHistoryIndex(newIndex);
    restoreFromHistory(newIndex);
  };

  const redo = () => {
    if (historyIndex >= history.length - 1) return;
    const newIndex = historyIndex + 1;
    setHistoryIndex(newIndex);
    restoreFromHistory(newIndex);
  };

  const restoreFromHistory = (index) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const cssW = canvas.width / (window.devicePixelRatio || 1);
    const cssH = canvas.height / (window.devicePixelRatio || 1);

    ctx.clearRect(0, 0, cssW, cssH);
    if (!history[index]) return;
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0, cssW, cssH);
    };
    img.src = history[index];
  };

  // Clear canvas
  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const cssW = canvas.width / (window.devicePixelRatio || 1);
    const cssH = canvas.height / (window.devicePixelRatio || 1);
    ctx.clearRect(0, 0, cssW, cssH);

    // push clear state into history
    const dataURL = canvas.toDataURL("image/png", 1.0);
    setHistory((prev) => {
      const newHist = prev.slice(0, historyIndex + 1);
      newHist.push(dataURL);
      if (newHist.length > 50) newHist.shift();
      return newHist;
    });
    setHistoryIndex((prevIndex) => Math.min(prevIndex + 1, 49));
  };

  // Save as PNG
  const saveImage = () => {
    const canvas = canvasRef.current;
    const dataURL = canvas.toDataURL("image/png", 1.0);
    const link = document.createElement("a");
    link.href = dataURL;
    link.download = `drawing_${new Date().toISOString().replace(/[:.]/g, "-")}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Toggle eraser
  const toggleEraser = () => setIsEraser((v) => !v);

  // When user changes color while eraser on, turn eraser off
  useEffect(() => {
    if (isEraser) setIsEraser(false);
  }, [color, isEraser]);

  //SOCKETS PART
  useEffect(()=>{
    const newSocket = io('http://localhost:5000');
    setSocket(newSocket);
    const canvas = canvasRef.current;
    if(canvas)
    {
        canvas.width = window.innerWidth * 2;
        canvas.height = window.innerHeight * 2;
        canvas.style.width = `${window.innerWidth}px`;
        canvas.style.height = `${window.innerHeight}px`;
  
        const ctx=canvas.getContext('2d');
        ctx.scale(2,2);
        ctx.lineCap = 'round';
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 5;
        ctxRef.current = ctx;
  
        newSocket.on('drawing',(data) =>{
        const { offsetX, offsetY, isDrawing: receivedIsDrawing } = data;
        const ctx = ctxRef.current;
  
        if(receivedIsDrawing){
            ctx.lineTo(offsetX, offsetY);
            ctx.stroke();
        }
        else{
            ctx.beginPath();
            ctx.moveTo(offsetX, offsetY);
        }
        });
        return () => {
            if(newSocket) newSocket.disconnect();
        }
    }},[]);

  const startDrawing = ({ nativeEvent }) => {
      const {offsetX,offsetY} = nativeEvent;
      ctxRef.current.beginPath();
      ctxRef.current.moveTo(offsetX,offsetY);
      setIsDrawing(true);
      if(socket) socket.emit('drawing',{offsetX,offsetY,isDrawing:false});
    };
    const draw = ({ nativeEvent }) => {
      if(!isDrawing) return;
      const {offsetX,offsetY} = nativeEvent;
      ctxRef.current.lineTo(offsetX,offsetY);
      ctxRef.current.stroke();
      socket.emit('drawing',{offsetX,offsetY,isDrawing:true});
    };
    const stopDraw = ()=> {
      ctxRef.current.closePath();
      setIsDrawing(false);
    };

  return (
    <div className="flex flex-col h-full min-h-[480px] w-full max-w-4xl mx-auto p-4">
  {/* Toolbar */}
  <div className="mb-3 flex flex-wrap justify-center gap-3 items-center">
    {/*Color Part*/}
    <div className="flex items-center gap-2">
      <label className="text-sm font-medium">Color</label>
      <input
        aria-label="Brush color"
        type="color"
        value={color}
        onChange={(e) => setColor(e.target.value)}
        className="w-10 h-8 rounded cursor-pointer border"
      />
    </div>

    {/* Brush Part */}
    <div className="flex items-center gap-2">
      <label className="text-sm font-medium">Brush</label>
      <input
        aria-label="Brush size"
        type="range"
        min={1}
        max={80}
        value={brushSize}
        onChange={(e) => setBrushSize(Number(e.target.value))}
        className="w-32 accent-blue-500 cursor-pointer"/>
      <span className="w-12 text-sm text-right">{brushSize}px</span>
    </div>

    <div className="flex gap-2">
      <button
        className={`px-4 py-1 rounded-md border shadow-sm transition ${
          isEraser
            ? "bg-gray-300 text-gray-900"
            : "bg-white hover:bg-gray-100"}`}

        onClick={toggleEraser}
        title="Toggle eraser">
        Eraser
      </button>
      <button
        className="px-4 py-1 rounded-md border shadow-sm bg-white hover:bg-gray-100"
        onClick={undo}
        title="Undo">
      Undo
      </button>
      <button
        className="px-4 py-1 rounded-md border shadow-sm bg-white hover:bg-gray-100"
        onClick={redo}
        title="Redo">
      Redo
      </button>
      <button
        className="px-4 py-1 rounded-md border shadow-sm bg-white hover:bg-gray-100"
        onClick={clearCanvas}
        title="Clear canvas">
        Clear all
      </button>
      <button
        className="px-4 py-1 rounded-md border shadow-sm bg-green-500 text-white hover:bg-green-600 transition"
        onClick={saveImage}
        title="Save as PNG">
      Save PNG
      </button>
    </div>
  </div>

  <div
    ref={containerRef}
    className="flex-1 border rounded-md overflow-hidden bg-white shadow-lg"
    style={{ minHeight: 360 }}>
    <canvas
      ref={canvasRef}
      onMouseDown={startDrawing}
      onMouseMove={draw}
      onMouseUp={stopDraw}
      onTouchStart={startDrawing}
      onTouchMove={draw}
      onMouseLeave={stopDraw}
      onTouchEnd={stopDraw}

      className="w-full h-full"
      style={{ 
        display: "block", 
        background: "transparent", 
        border: '1px solid black', 
        borderRadius: '8px', 
        width: '100%',
        height: '100%'
      }}
    />
  </div>
</div>
  );
}
