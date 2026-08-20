import React from "react";

export default function MacbookMockup() {
  return (
    <div className="relative mx-auto w-full max-w-[580px] px-4 py-8">
      {/* Ambient shadow and glow behind the entire laptop */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-tr from-blue-500/10 via-transparent to-indigo-500/10 blur-3xl rounded-full" />

      {/* Outer wrapper to handle perspective tilt on hover */}
      <div className="group relative transition-all duration-700 ease-out [perspective:1000px] hover:[transform:rotateX(2deg)_translateY(-8px)]">
        
        {/* Screen Display Container */}
        <div className="relative mx-auto aspect-[16/10] w-[92%] overflow-hidden rounded-t-[1.2rem] border-[8px] border-[#1e1e22] bg-[#020617] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.8)]">
          
          {/* Webcam Notch */}
          <div className="absolute top-0 left-1/2 z-30 h-3 w-20 -translate-x-1/2 rounded-b-md bg-[#1e1e22] flex items-center justify-center gap-1.5 px-3">
            <span className="h-1 w-1 rounded-full bg-blue-500/80" /> {/* Camera lens */}
            <span className="h-0.5 w-0.5 rounded-full bg-green-500/60" /> {/* Indicator LED */}
          </div>

          {/* Screen Content - Interactive Mock Dashboard/IDE */}
          <div className="relative h-full w-full bg-[#030712] font-mono text-[10px] sm:text-[11px] text-slate-300 select-none flex flex-col">
            
            {/* Window Title Bar / IDE Header */}
            <div className="flex items-center justify-between border-b border-white/5 bg-slate-950/80 px-3 py-2">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#ef4444]" />
                <span className="h-2 w-2 rounded-full bg-[#eab308]" />
                <span className="h-2 w-2 rounded-full bg-[#22c55e]" />
                <span className="ml-2 text-[9px] text-slate-500 font-semibold tracking-wide">freelnova-matching.js</span>
              </div>
              <div className="text-[9px] text-slate-500">production-v2.0</div>
            </div>

            {/* Editor Workspace Split View */}
            <div className="flex flex-1 overflow-hidden">
              
              {/* Left sidebar: File Tree */}
              <div className="w-[18%] border-r border-white/5 bg-[#090d16] p-2 flex flex-col gap-1 text-slate-500">
                <div className="text-white/60 font-semibold text-[8px] uppercase tracking-wider mb-1.5">Project</div>
                <div className="text-emerald-400 flex items-center gap-1">📁 src</div>
                <div className="pl-3 text-slate-400 flex items-center gap-1">📁 services</div>
                <div className="pl-5 text-indigo-400">📄 ai.service.js</div>
                <div className="pl-3 text-slate-400 flex items-center gap-1">📁 pages</div>
                <div className="pl-5 text-slate-400">📄 Home.jsx</div>
                <div className="pl-5 text-slate-400">📄 Profile.jsx</div>
                <div className="pl-3 text-slate-500">📄 package.json</div>
              </div>

              {/* Center Area: Code Editor */}
              <div className="flex-1 p-3 bg-[#030712] overflow-hidden flex flex-col justify-between leading-normal">
                <div>
                  <span className="text-pink-500">import</span> {"{"} matchTalent {"}"} <span className="text-pink-500">from</span> <span className="text-emerald-400">"@freelnova/ai"</span>;
                  <br />
                  <br />
                  <span className="text-blue-400">const</span> <span className="text-yellow-400">projectRequirements</span> = {"{"}
                  <div className="pl-4">
                    role: <span className="text-emerald-400">"Full Stack Architect"</span>,
                    <br />
                    skills: [<span className="text-emerald-400">"React"</span>, <span className="text-emerald-400">"Node.js"</span>, <span className="text-emerald-400">"AI"</span>],
                    <br />
                    timeline: <span className="text-emerald-400">"Immediate"</span>
                  </div>
                  {"};"}
                  <br />
                  <br />
                  <span className="text-slate-500">// Initialize instant expert vetting matches</span>
                  <br />
                  <span className="text-blue-400">async function</span> <span className="text-yellow-400">findBestTalent</span>() {"{"}
                  <div className="pl-4">
                    <span className="text-blue-400">const</span> matches = <span className="text-pink-500">await</span> <span className="text-cyan-400">matchTalent</span>(req);
                    <br />
                    console.<span className="text-yellow-400">log</span>(<span className="text-emerald-400">"Matching candidates found:"</span>, matches.length);
                    <br />
                    <span className="text-pink-500">return</span> matches;
                  </div>
                  {"}"}
                </div>

                {/* Simulated Terminal Pane inside IDE */}
                <div className="mt-2 border-t border-white/5 pt-2 flex flex-col gap-0.5 text-[8px] sm:text-[9px]">
                  <div className="text-slate-500">Terminal - npm run dev</div>
                  <div className="text-emerald-400 font-semibold flex items-center gap-1">
                    <span>✓</span> Vite dev server running at http://localhost:5173
                  </div>
                  <div className="text-slate-400">
                    [HMR] update: components/Globe.jsx, components/MacbookMockup.jsx
                  </div>
                </div>
              </div>
            </div>

            {/* Screen Glass Reflection overlay */}
            <div className="absolute inset-0 pointer-events-none bg-gradient-to-tr from-transparent via-white/5 to-white/10 opacity-60 mix-blend-overlay" />
          </div>
        </div>

        {/* Keyboard Base (Top of Lower Half) */}
        <div className="relative mx-auto h-[10px] w-full rounded-b-sm border-t border-white/20 bg-gradient-to-b from-[#2e3138] to-[#15171a] shadow-[0_10px_20px_rgba(0,0,0,0.5)] z-20">
          {/* Groove notch for screen opening */}
          <div className="absolute top-0 left-1/2 h-[3px] w-14 -translate-x-1/2 rounded-b-sm bg-[#090a0c]" />
        </div>

        {/* Keyboard Base Plate (Bottom Lip of Lower Half) */}
        <div className="relative mx-auto h-[4px] w-[97%] rounded-b-md bg-[#0f1013] shadow-[0_12px_24px_rgba(0,0,0,0.7)] z-10" />

        {/* Dynamic keyboard reflection / neon glow underneath the base */}
        <div className="absolute -bottom-1 left-1/2 -z-10 h-[8px] w-[94%] -translate-x-1/2 bg-blue-500/30 blur-md rounded-full transition-opacity group-hover:bg-indigo-500/40" />
      </div>
    </div>
  );
}
