import React, { useState, useEffect } from 'react';

function DoodleGenerator() {
  const [prompt, setPrompt] = useState('');
  const [doodleUrl, setDoodleUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState(null);

  
  
  
  useEffect(() => 
  {
    if('webkitSpeechRecognition'in window||'SpeechRecognition'in window){
      const SpeechRecognition = window.SpeechRecognition||window.webkitSpeechRecognition;
      const newRecognition = new SpeechRecognition();
      newRecognition.continuous = false;
      newRecognition.lang = 'en-US';
      
      newRecognition.onresult = (event)=>{
        const transcript = event.results[0][0].transcript;
        setPrompt(transcript);
        setIsListening(false);
        handleSubmit(null, transcript);
      };
      newRecognition.onend = ()=>{
        setIsListening(false);
      };

      newRecognition.onerror = (event)=>{
        console.error('Speech recognition error:',event.error);
        setError(`Speech recognition error: ${event.error}`);
        setIsListening(false);
      };

      setRecognition(newRecognition);
    } 
    else{
      setError('Web Speech API is not supported in this browser.');
    }
  },[]);

  const handleMicClick=()=>{
    if(recognition){
      setIsListening(true);
      setPrompt(''); 
      recognition.start();
    }
  };

  const handleSubmit = async(e, submittedPrompt=prompt)=>{
    if (e) e.preventDefault();
    if (!submittedPrompt)
    {
        setError('Please provide a prompt first.');
        return;
    }
    setIsLoading(true);
    setError(null);
    setDoodleUrl(null);
    try{
      const response = await fetch('http://localhost:5000', {
        method:'POST',
        headers:{
          'Content-Type':'application/json',
        },
        body: JSON.stringify({ prompt: submittedPrompt }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate doodle.');
      }
      const imageBlob = await response.blob();
      const url = URL.createObjectURL(imageBlob);
      setDoodleUrl(url);
    } 
    catch(e){
      console.error(e);
      setError(e.message);
    } 
    finally{
      setIsLoading(false);
    }
  };

  return(
    <div>
      <h1 style={{
        fontSize: '20px',
        fontWeight: 'bold',
        marginBottom: '20px',
        textAlign: 'center',
      }}>Voice to Doodle Feature</h1>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Tap to speak or type a prompt speak"
          disabled={isLoading||isListening}
          style={{
            width: '50%',
            padding: '10px',
            borderRadius: '5px',
            border: '1px solid #ccc',
            fontSize: '16px',
          }}
        />
        <button
          type="button" 
          onClick={handleMicClick} 
          disabled={isLoading}
          style={{
            backgroundColor: isLoading ? '#9e9e9e': isListening ? '#ff9800':'#4CAF50',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '5px',
            cursor: 'pointer',
            marginLeft: '10px',
          }}
        >
          {isLoading ? 'Generating...':isListening? 'Listening...': 'Tap to speak or type a prompt'}
        </button>
        <button 
           type="submit" 
           disabled={isLoading}
           style={{
            backgroundColor: '#2196F3',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '5px',
            cursor: 'pointer',
            marginLeft: '10px',
          }}
        >
          Generate Doodle
        </button>
      </form>
      {isLoading && <p>Generating your doodle, please wait...</p>}
      {isListening && <p>Listening for your command...</p>}
      {error && <p style={{ color: 'red' }}>Error: {error}</p>}
      {doodleUrl && (
        <div>
          <h2>Your Doodle:</h2>
          <img src={doodleUrl} alt="Generated Doodle" />
        </div>
      )}
    </div>
  );
}

export default DoodleGenerator;