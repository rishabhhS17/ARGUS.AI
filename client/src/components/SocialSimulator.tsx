import React, { useState, useEffect } from 'react';
import { processMediaOnClient, API_URL } from '../services/gemini'; // [FIXED: Import API_URL]
import { Image, X, Loader2, Globe, ShieldAlert, Activity, MapPin } from 'lucide-react';
import { getSocket } from "../services/socket";



export default function SocialSimulator() {
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [status, setStatus] = useState('IDLE');
  const [advisories, setAdvisories] = useState<any[]>([]);

  useEffect(() => {
  const socket = getSocket();

  fetch(`${API_URL}/api/data`)
    .then(res => res.json())
    .then(data => setAdvisories(data.advisories || []));

  socket.on("advisory_posted", (newAdvisory) => {
    setAdvisories(prev => [newAdvisory, ...prev]);
  });

  socket.on("advisories_cleared", () => setAdvisories([]));

  return () => {
    socket.off("advisory_posted");
    socket.off("advisories_cleared");
  };
}, []);


  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setFile(selected);
      setPreview(URL.createObjectURL(selected));
    }
  };
  const clearFile = () => { setFile(null); setPreview(null); };
  
  const handlePost = async () => {
    if (!text && !file) return;
    setStatus('PROCESSING');
    try {
      const aiData = await processMediaOnClient(text, file);
      setStatus('PUBLISHING');
      
      // [FIXED: Use API_URL]
      await fetch(`${API_URL}/api/incident`, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify(aiData) 
      });
      
      setStatus('SENT');
      setTimeout(() => { setText(''); clearFile(); setStatus('IDLE'); }, 2000);
    } catch (e) {
      console.error(e); setStatus('ERROR'); setTimeout(() => setStatus('IDLE'), 3000);
    }
  };

  return (
    <div className="h-full bg-black flex flex-col items-center overflow-hidden">
      
      {/* HEADER */}
      <div className="w-full bg-slate-900 border-b border-slate-800 p-4 text-center shrink-0">
         <h2 className="text-white font-bold flex items-center justify-center gap-2">
            <Activity className="text-blue-500" /> SOCIAL FEED SIMULATOR
         </h2>
         <p className="text-xs text-slate-500 font-mono mt-1">
            MOCK-UP: INJECT CROWDSOURCED INTEL INTO ARGUS
         </p>
      </div>

      <div className="w-full max-w-[600px] border-x border-slate-800 flex-1 overflow-y-auto">
        
        {/* COMPOSER */}
        <div className="p-4 border-b border-slate-800 flex gap-4">
          <div className="shrink-0">
             <div className="w-10 h-10 rounded-full bg-slate-700 overflow-hidden">
                <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" alt="User" />
             </div>
          </div>
          
          <div className="flex-1">
             <div className="mb-3">
               <textarea 
                 className="w-full bg-transparent text-xl text-white placeholder-slate-500 outline-none resize-none min-h-[80px]"
                 placeholder="What is happening?!"
                 value={text}
                 onChange={(e) => setText(e.target.value)}
               />
             </div>
             {preview && (
               <div className="relative mb-4 group">
                 <img src={preview} alt="Upload preview" className="rounded-2xl w-full max-h-[400px] object-cover border border-slate-800" />
                 <button onClick={clearFile} className="absolute top-2 right-2 p-1 bg-black/70 rounded-full text-white hover:bg-black/90 transition backdrop-blur-sm"><X className="w-5 h-5" /></button>
               </div>
             )}
             <div className="flex items-center justify-between pt-2 border-t border-slate-800/50">
                <div className="flex gap-2 text-sky-500">
                   <label className="p-2 hover:bg-sky-500/10 rounded-full cursor-pointer transition">
                      <Image className="w-5 h-5" />
                      <input type="file" className="hidden" accept="image/*,video/*" onChange={handleFileSelect} />
                   </label>
                   <button className="p-2 hover:bg-sky-500/10 rounded-full transition disabled:opacity-50"><Globe className="w-5 h-5" /></button>
                   <button className="p-2 hover:bg-sky-500/10 rounded-full transition disabled:opacity-50"><MapPin className="w-5 h-5" /></button>
                </div>
                <button onClick={handlePost} disabled={(!text && !file) || status !== 'IDLE'} className="bg-sky-500 hover:bg-sky-600 disabled:opacity-50 disabled:hover:bg-sky-500 text-white font-bold px-5 py-2 rounded-full transition-all flex items-center gap-2">
                  {status === 'PROCESSING' || status === 'PUBLISHING' ? <><Loader2 className="w-4 h-4 animate-spin" /> Posting</> : status === 'SENT' ? "Posted" : "Post"}
                </button>
             </div>
          </div>
        </div>

        {/* FEED */}
        <div className="divide-y divide-slate-800">
           {advisories.map((advisory: any) => (
             <div key={advisory._id} className="p-4 bg-red-900/10 hover:bg-red-900/20 transition cursor-pointer flex gap-4 border-l-4 border-red-500 animate-in slide-in-from-top-4">
                <div className="w-10 h-10 rounded-full bg-slate-800 overflow-hidden shrink-0 flex items-center justify-center border border-red-500"><ShieldAlert className="text-red-500 w-6 h-6" /></div>
                <div>
                   <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
                      <span className="font-bold text-white text-base flex items-center gap-1">{advisory.author} <span className="bg-slate-700 text-[10px] px-1 rounded text-slate-300">OFFICIAL</span></span>
                      <span>@city_help • Just now</span>
                   </div>
                   <p className="text-white mb-2 text-lg leading-snug">{advisory.message}</p>
                </div>
             </div>
           ))}
           <div className="p-4 hover:bg-white/[0.03] transition cursor-pointer flex gap-4">
              <div className="w-10 h-10 rounded-full bg-slate-700 overflow-hidden shrink-0"><img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka" alt="User" /></div>
              <div>
                 <div className="flex items-center gap-2 text-slate-500 text-sm mb-1"><span className="font-bold text-white text-base">Sarah Jenkins</span><span>@sarah_j • 2h</span></div>
                 <p className="text-white mb-2">Just saw a huge smoke plume near the downtown bridge. Hope everyone is safe! 🚒 #city #alert</p>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}