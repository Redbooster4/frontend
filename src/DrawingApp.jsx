import React,{ useRef, useState, useEffect } from "react";
import{ io } from "socket.io-client";

export default function DrawingApp()
{
  // All state and refs
  const containerRef=useRef(null);
  const canvasRef=useRef(null);
  const ctxRef=useRef(null);
  const lastPointRef=useRef(null);
  const isDrawingRef=useRef(false);
  const socketRef=useRef(null);

  const [color, setColor]=useState("#000000");
  const [brushSize, setBrushSize]=useState(6);
  const [isEraser, setIsEraser]=useState(false);
  const [history, setHistory]=useState([]);
  const [historyIndex, setHistoryIndex]=useState(-1);
  const [brushType, setBrushType]=useState('normal');
  const [isDarkMode, setIsDarkMode]=useState(false);

  useEffect(() =>{
    const newSocket=io('http://localhost:3001');
    socketRef.current=newSocket;
    const canvas=canvasRef.current;
    if (canvas)
   {
      const container=containerRef.current;
      const rect=container.getBoundingClientRect();
      const dpr=window.devicePixelRatio || 1;
      canvas.width=Math.max(1, rect.width * dpr);
      canvas.height=Math.max(1, rect.height * dpr);
      canvas.style.width=`${rect.width}px`;
      canvas.style.height=`${rect.height}px`;

      const ctx=canvas.getContext("2d");
      ctx.scale(dpr, dpr);
      ctx.lineCap="round";
      ctx.lineJoin="round";
      ctxRef.current=ctx;
   }
    newSocket.on('drawing', (data) =>{
      console.log(data);
      const{prevPoint, currentPoint, color, brushSize, brushType, isEraser}=data;
      const ctx=ctxRef.current;
      if (!ctx||!currentPoint) return;
      ctx.globalCompositeOperation=isEraser?"destination-out":"source-over";
      ctx.strokeStyle=color;
      ctx.lineWidth=brushSize;
      
      if (!prevPoint) 
     {
        ctx.beginPath();
        ctx.moveTo(currentPoint.x, currentPoint.y);
      }
      else{
        applyBrushType(ctx, brushType, prevPoint, currentPoint, brushSize, color);
      }
    });

    return () =>{
      if (newSocket) newSocket.disconnect();
    };
  }, []);

  const applyBrushType=(ctx, brushType, prevPoint, currentPoint, brushSize, color) =>{
    switch (brushType) 
    {
      case 'normal':{
        ctx.beginPath();
        ctx.moveTo(prevPoint.x, prevPoint.y);
        ctx.lineTo(currentPoint.x, currentPoint.y);
        ctx.stroke();
        break; }
      case 'spray':{
        const density=brushSize;
        ctx.fillStyle=color;
        for (let i=0; i < density; i++){
          const offsetX=(Math.random() - 0.5) * brushSize;
          const offsetY=(Math.random() - 0.5) * brushSize;
          ctx.beginPath();
          ctx.arc(currentPoint.x + offsetX, currentPoint.y + offsetY, 1, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      }
      case 'calligraphy':{
        const dx=currentPoint.x - prevPoint.x;
        const dy=currentPoint.y - prevPoint.y;
        const speed=Math.sqrt(dx * dx + dy * dy);
        ctx.lineWidth=brushSize * (1 - Math.min(speed / 20, 0.8));
        ctx.beginPath();
        ctx.moveTo(prevPoint.x, prevPoint.y);
        ctx.lineTo(currentPoint.x, currentPoint.y);
        ctx.stroke();
        break;
      }
      case 'glow':{
        ctx.shadowColor=color;
        ctx.shadowBlur=brushSize;
        ctx.lineWidth=brushSize / 2;
        ctx.beginPath();
        ctx.moveTo(prevPoint.x, prevPoint.y);
        ctx.lineTo(currentPoint.x, currentPoint.y);
        ctx.stroke();
        ctx.shadowBlur=0;
        break;
      }
    }
  };

  const getPoint=(e) =>{
    const canvas=canvasRef.current;
    const rect=canvas.getBoundingClientRect();
    let clientX, clientY;
    if (e.touches && e.touches[0])
   {
      clientX=e.touches[0].clientX;
      clientY=e.touches[0].clientY;
    } 
    else{
      clientX=e.clientX;
      clientY=e.clientY;
    }
    return{x: clientX - rect.left, y: clientY - rect.top};
  };

  const startDrawing=(e) =>{
    if(e.cancelable) e.preventDefault();
    const point=getPoint(e);
    isDrawingRef.current=true;
    lastPointRef.current=point;

    const ctx=ctxRef.current;
    ctx.beginPath();
    ctx.moveTo(point.x, point.y);
    if(socketRef.current) 
   {
      socketRef.current.emit('drawing',{
        prevPoint: null,
        currentPoint: point,
        color, brushSize, brushType, isEraser
      });
    }
  };

  const draw=(e) =>{
    if(!isDrawingRef.current) return;
    const point=getPoint(e);
    const lastPoint=lastPointRef.current;
    
    const ctx=ctxRef.current;
    ctx.lineWidth=brushSize;
    ctx.globalCompositeOperation=isEraser?"destination-out":"source-over";
    ctx.strokeStyle=color;
    
    if(lastPoint){
      applyBrushType(ctx, brushType, lastPoint, point, brushSize, color);
    }
    
    if(socketRef.current && lastPoint)
    {
      socketRef.current.emit('drawing',{
        prevPoint: lastPoint,
        currentPoint: point,
        color, brushSize, brushType, isEraser
      });
    }
    lastPointRef.current=point;
  };

  const stopDrawing=() =>{
    if(!isDrawingRef.current) return;
    isDrawingRef.current=false;
    ctxRef.current.closePath();
    
    const canvas=canvasRef.current;
    const dataURL=canvas.toDataURL("image/png", 1.0);
    setHistory((prev) =>{
      const newHist=prev.slice(0, historyIndex + 1);
      newHist.push(dataURL);
      if (newHist.length > 50) newHist.shift();
      return newHist;
    });
    setHistoryIndex((prevIndex) => Math.min(prevIndex + 1, 49));
  };

  const undo=() =>{
    if (historyIndex <= 0) return;
    const newIndex=historyIndex - 1;
    setHistoryIndex(newIndex);
    restoreFromHistory(newIndex);
  };

  const redo=() =>{
    if (historyIndex >= history.length - 1) return;
    const newIndex=historyIndex + 1;
    setHistoryIndex(newIndex);
    restoreFromHistory(newIndex);
  };

  const restoreFromHistory=(index) =>{
    const canvas=canvasRef.current;
    const ctx=canvas.getContext("2d");
    const cssW=canvas.width / (window.devicePixelRatio || 1);
    const cssH=canvas.height / (window.devicePixelRatio || 1);
    ctx.clearRect(0, 0, cssW, cssH);
    if (!history[index]) return;
    const img=new Image();
    img.onload=() =>{
      ctx.drawImage(img, 0, 0, cssW, cssH);
    };
    img.src=history[index];
  };

  const clearCanvas=() =>{
    const canvas=canvasRef.current;
    const ctx=canvas.getContext("2d");
    const cssW=canvas.width / (window.devicePixelRatio || 1);
    const cssH=canvas.height / (window.devicePixelRatio || 1);
    ctx.clearRect(0, 0, cssW, cssH);
    const dataURL=canvas.toDataURL("image/png", 1.0);
    setHistory((prev) =>{
      const newHist=prev.slice(0, historyIndex + 1);
      newHist.push(dataURL);
      if (newHist.length > 50) newHist.shift();
      return newHist;
    });
    setHistoryIndex((prevIndex) => Math.min(prevIndex + 1, 49));
  };

  // Save as PNG
  const saveImage=() =>{
    const canvas=canvasRef.current;
    const dataURL=canvas.toDataURL("image/png", 1.0);
    const link=document.createElement("a");
    link.href=dataURL;
    link.download=`drawing_${new Date().toISOString().replace(/[:.]/g, "-")}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const toggleEraser=() => setIsEraser((v) => !v);
  const toggleDarkMode=() => setIsDarkMode((v) => !v);

  return(
    <div className={`flex flex-col h-full min-h-[480px] w-full max-w-4xl mx-auto p-4 transition-colors ${
      isDarkMode?"bg-gray-900":"bg-white"}`}>
      
      <div className={`mb-3 flex flex-wrap justify-center gap-3 items-center p-3 rounded-lg ${
        isDarkMode?"bg-gray-800":"bg-gray-50"
      }`}>
        
        <div className="flex items-center gap-2">
          <label className={`text-sm font-medium ${isDarkMode?"text-white":"text-gray-900"}`}>
            Color
          </label>
          <input
            aria-label="Brush color"
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="w-10 h-8 rounded cursor-pointer border"
          />
        </div>

        <div className="flex items-center gap-2">
          <label className={`text-sm font-medium ${isDarkMode?"text-white":"text-gray-900"}`}>
            Brush
          </label>
          <input
            aria-label="Brush size"
            type="range"
            min={1}
            max={80}
            value={brushSize}
            onChange={(e) => setBrushSize(Number(e.target.value))}
            className="w-32 accent-blue-500 cursor-pointer"
          />
          <span className={`w-12 text-sm text-right ${isDarkMode?"text-white":"text-gray-900"}`}>
           {brushSize}px
          </span>
        </div>

        <div className="flex gap-2">
          <button
            className={`px-4 py-1 rounded-md border shadow-sm transition ${
              isEraser
               ?isDarkMode 
                 ?"bg-gray-600 text-white border-gray-500" 
                 :"bg-gray-300 text-gray-900"
               :isDarkMode
                 ?"bg-gray-700 text-white border-gray-600 hover:bg-gray-600"
                 :"bg-white hover:bg-gray-100"
            }`}
            onClick={toggleEraser}
            title="Toggle eraser">
            Eraser
          </button>
          
          <button
            className={`px-4 py-1 rounded-md border shadow-sm transition ${
              isDarkMode
               ?"bg-gray-700 text-white border-gray-600 hover:bg-gray-600"
               :"bg-white hover:bg-gray-100"
            }`}
            onClick={undo}
            title="Undo">
            Undo
          </button>
          
          <button
            className={`px-4 py-1 rounded-md border shadow-sm transition ${
              isDarkMode
               ?"bg-gray-700 text-white border-gray-600 hover:bg-gray-600"
               :"bg-white hover:bg-gray-100"
            }`}
            onClick={redo}
            title="Redo">
            Redo
          </button>
          
          <button
            className={`px-4 py-1 rounded-md border shadow-sm transition ${
              isDarkMode
               ?"bg-gray-700 text-white border-gray-600 hover:bg-gray-600"
               :"bg-white hover:bg-gray-100"
            }`}
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

         {/* Dark Mode Toggle Button */}
          <button
            className={`px-4 py-1 rounded-md border shadow-sm transition ${
              isDarkMode
               ?"bg-gray-800 text-white border-gray-600 hover:bg-gray-700"
               :"bg-white text-gray-900 hover:bg-gray-100"
            }`}
            onClick={toggleDarkMode}
            title="Toggle dark mode">
           {isDarkMode?"🌞":"🌙"}
          </button>
        </div>
      </div>

      <div
        ref={containerRef}
        className={`flex-1 border rounded-md overflow-hidden shadow-lg ${
          isDarkMode?"bg-gray-800 border-gray-600":"bg-white"
        }`}
        style={{ minHeight: 360 }}>
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="w-full h-full"
          style={{ 
            display: "block", 
            background: isDarkMode?"#1f2937":"white", 
            border: `1px solid ${isDarkMode?"#4b5563":"black"}`, 
            borderRadius: '8px', 
            width: '100%',
            height: '100%'
          }}
        />
      </div>
      
      <div className="flex items-center gap-2 mt-3">
        <label className={`text-sm font-medium ${isDarkMode?"text-white":"text-gray-900"}`}>
          Brush: 
        </label>
        <select
          value={brushType}
          onChange={(e) => setBrushType(e.target.value)}
          className={`px-2 py-1 border rounded text-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            isDarkMode 
             ?"bg-gray-700 text-white border-gray-600" 
             :"bg-white border-gray-300"
          }`}>
          <option value="normal">Normal</option>
          <option value="spray">Spray</option>
          <option value="calligraphy">Calligraphy</option>
          <option value="glow">Glow</option>
        </select>
      </div>
    </div>
  );
};