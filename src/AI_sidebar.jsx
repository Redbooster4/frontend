import React, { useState } from 'react';

const AISidebar = ({ canvasRef, isDarkMode }) => {
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [generatedImage, setGeneratedImage] = useState(null);
  const [error, setError] = useState(null);
  const [mode, setMode] = useState('text-to-image');

  const getCanvasBlob = () => {
    return new Promise((resolve) => {
      const canvas = canvasRef.current;
      canvas.toBlob((blob) => 
      {
        resolve(blob);
      }, 'image/png');
    });
  };

  const handleGenerate = async () => {
    if(!prompt.trim())
    {
      setError('Please enter a prompt');
      return;
    }
    setIsLoading(true);
    setError(null);
    setGeneratedImage(null);

    try
    {
      let response;
      if(mode==='text-to-image')
      {
        response = await fetch('http://localhost:5000/generate_image', {
          method: 'POST',
          headers:{
            'Content-Type': 'application/json',},
          body: JSON.stringify({ prompt }),
        });
      } 
      else{
        const canvasBlob = await getCanvasBlob();
        const formData = new FormData();
        formData.append('image', canvasBlob, 'canvas-drawing.png');
        formData.append('prompt', prompt);
        response = await fetch('http://localhost:5000/image_to_image', {
          method: 'POST',
          body: formData,
        });
      }

      if(!response.ok) 
      {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate image');
      }

      const imageBlob = await response.blob();
      const imageUrl = URL.createObjectURL(imageBlob);
      setGeneratedImage(imageUrl);

    } 
    catch (err){
      setError(err.message);
    } finally{
      setIsLoading(false);
    }
  };

  const saveGeneratedImage = () => {
    if(!generatedImage) return;
    
    const link = document.createElement('a');
    link.href = generatedImage;
    link.download = `ai-generated-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return(
    <div className={`w-80 h-full border-l flex flex-col ${
      isDarkMode 
        ? 'bg-gray-800 border-gray-600 text-white' 
        : 'bg-white border-gray-300'}`}>
      
      <div className={`p-4 border-b ${
        isDarkMode ? 'border-gray-600' : 'border-gray-200'}`}>
        <h2 className="text-lg font-bold mb-2">AI Assistant</h2>
        <p className={`text-sm ${
          isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
          Generate images with AI
        </p>
      </div>

      <div className="p-4">
        <label className={`block text-sm font-medium mb-2 ${
          isDarkMode?'text-white':'text-gray-700'}`}>
          Generation Mode
        </label>
        <div className="flex gap-2">
          <button
            onClick={() => setMode('text-to-image')}
            className={`flex-1 px-3 py-2 text-xs rounded-md border transition ${
              mode === 'text-to-image'
                ? isDarkMode
                  ?'bg-blue-600 text-white border-blue-600'
                  :'bg-blue-500 text-white border-blue-500'
                : isDarkMode
                  ?'bg-gray-700 text-gray-300 border-gray-600 hover:bg-gray-600'
                  :'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'}`}>
                          Text to Image
          </button>
          <button
            onClick={() => setMode('image-to-image')}
            className={`flex-1 px-3 py-2 text-xs rounded-md border transition ${
              mode === 'image-to-image'
                ? isDarkMode
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-blue-500 text-white border-blue-500'
                : isDarkMode
                  ? 'bg-gray-700 text-gray-300 border-gray-600 hover:bg-gray-600'
                  : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'}`}>
            Canvas + AI
          </button>
        </div>
      </div>

      <div className="p-4">
        <label className={`block text-sm font-medium mb-2 ${
          isDarkMode ? 'text-white':'text-gray-700'}`}>
          {mode === 'text-to-image'?'Describe your image':'How to modify your drawing'}
        </label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={
            mode === 'text-to-image' 
              ?'A cute cat sitting in a garden...'
              :'Make it more colorful, add flowers...'
          }
          rows={4}
          className={`w-full px-3 py-2 text-sm border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            isDarkMode
              ?'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
              :'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
          }`}
        />
      </div>

      <div className="px-4">
        <button
          onClick={handleGenerate}
          disabled={isLoading || !prompt.trim()}
          className={`w-full py-3 px-4 rounded-md font-medium text-sm transition ${
            isLoading || !prompt.trim()
              ?isDarkMode
                ?'bg-gray-600 text-gray-400 cursor-not-allowed'
                :'bg-gray-300 text-gray-500 cursor-not-allowed'
              :'bg-blue-500 text-white hover:bg-blue-600 active:bg-blue-700'
          }`}>
          {isLoading?(
            <div className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Generating...
            </div>
          ):(
            `Generate ${mode === 'text-to-image' ? 'Image' : 'from Canvas'}`
          )}
        </button>
      </div>

      {error && (
        <div className="mx-4 mt-4 p-3 bg-red-100 border border-red-300 rounded-md">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      <div className="flex-1 p-4">
        {generatedImage && (
          <div className="space-y-3">
            <h3 className={`text-sm font-medium ${
              isDarkMode?'text-white':'text-gray-700'
            }`}>
              Generated Result
            </h3>
            <div className={`relative border rounded-lg overflow-hidden ${
              isDarkMode?'border-gray-600':'border-gray-300'
            }`}>
              <img
                src={generatedImage}
                alt="AI Generated"
                className="w-full h-auto"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={saveGeneratedImage}
                className={`flex-1 px-3 py-2 text-xs rounded-md border transition ${
                  isDarkMode
                    ? 'bg-green-600 text-white border-green-600 hover:bg-green-700'
                    : 'bg-green-500 text-white border-green-500 hover:bg-green-600'
                }`}>
                Save Image
              </button>
              <button
                onClick={() => {
                  URL.revokeObjectURL(generatedImage);
                  setGeneratedImage(null);}}
                className={`px-3 py-2 text-xs rounded-md border transition ${
                  isDarkMode
                    ? 'bg-gray-600 text-white border-gray-600 hover:bg-gray-700'
                    : 'bg-gray-500 text-white border-gray-500 hover:bg-gray-600'}`}>
                Clear
              </button>
            </div>
          </div>
        )}
      </div>

      <div className={`p-4 border-t text-xs ${
        isDarkMode 
          ? 'border-gray-600 text-gray-400' 
          : 'border-gray-200 text-gray-500'
      }`}>
        {mode === 'text-to-image' ? (
          <p>Creates new images from text descriptions</p>
        ) : (
          <p>Modifies your canvas drawing using AI</p>
        )}
      </div>
    </div>
  );
};

export default AISidebar;