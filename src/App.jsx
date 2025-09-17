import React from "react";
import DrawingApp from "./DrawingApp";
import DoodleGenerator from "./DoodleGenerator";
import AISidebar from "./AI_sidebar";

function App(){
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-100 to-gray-200 p-4">
      <div className="w-full max-w-7xl mx-auto mb-6">
        <div className="bg-white shadow-xl rounded-2xl p-6 border border-gray-200">
          <h1 className="text-3xl font-bold text-center text-gray-800 mb-4 tracking-tight">
            AI - powered Drawing App
          </h1>
          <DoodleGenerator />
        </div>
      </div>
      <div className="w-full max-w-7xl mx-auto">
        <div className="bg-white shadow-xl rounded-2xl overflow-hidden border border-gray-200 flex" style={{ height: '80vh' }}>
          <div className="flex-1">
            <DrawingApp />
          </div>
          <div className="w-1/4 p-4 bg-gray-100 border-l border-gray-200">
            <AISidebar />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;