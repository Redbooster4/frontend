// App.jsx
import React from "react";
import DrawingApp from "./DrawingApp"; // adjust path if needed
import DoodleGenerator from "./DoodleGenerator";

function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-100 to-gray-200 flex items-center justify-center p-6">
      <div className="w-full max-w-5xl bg-white shadow-2xl rounded-2xl p-6 border border-gray-200">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-6 tracking-tight">
          AI - powered Drawing App
        </h1>
        <DoodleGenerator/>
        <DrawingApp />
      </div>
    </div>
  );
}

export default App;
