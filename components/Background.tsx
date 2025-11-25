import React from 'react';

const Background = () => {
  return (
    <div className="fixed inset-0 z-[-1] overflow-hidden pointer-events-none">
      {/* Top Left Gradient - Blue/Purple */}
      <div className="absolute top-[-20%] left-[-10%] w-[800px] h-[800px] bg-blue-600/10 rounded-full blur-[120px] mix-blend-screen animate-pulse-slow"></div>
      
      {/* Center Right Gradient - Purple/Pink */}
      <div className="absolute top-[20%] right-[-10%] w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[100px] mix-blend-screen animate-pulse-slow" style={{ animationDelay: '2s' }}></div>
      
      {/* Bottom Center - Subtle Cyan */}
      <div className="absolute bottom-[-20%] left-[30%] w-[900px] h-[500px] bg-cyan-900/10 rounded-full blur-[130px] mix-blend-screen"></div>
      
      {/* Noise Overlay (Optional for texture) */}
      <div className="absolute inset-0 opacity-[0.03] bg-[url('https://grainy-gradients.vercel.app/noise.svg')]"></div>
    </div>
  );
};

export default Background;
