"use client";

import { useState, useEffect } from 'react';

export default function Clock() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm p-3 rounded-lg shadow-lg border border-gray-700">
      <div className="flex flex-col items-start space-y-0.5">
        <div className="text-3xl font-bold text-gray-200 tracking-wider font-mono">
          {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          <span className="text-xl text-gray-400 ml-1">
            {time.getSeconds().toString().padStart(2, '0')}
          </span>
        </div>
        <div className="text-xs text-gray-400 font-medium">
          {time.toLocaleDateString(undefined, { 
            weekday: 'long', 
            month: 'short', 
            day: 'numeric' 
          })}
        </div>
      </div>
    </div>
  );
} 