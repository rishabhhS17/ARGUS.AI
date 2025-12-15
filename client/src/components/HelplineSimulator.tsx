import { useState } from "react";
import { processMediaOnClient, API_URL } from "../services/gemini"; // [FIXED: Import API_URL]
import { Mic, Radio } from "lucide-react";

export default function HelplineSimulator() {
  const [isRecording, setIsRecording] = useState(false);
  const [recorder, setRecorder] = useState<MediaRecorder | null>(null);
  const [status, setStatus] = useState("IDLE");

  const startRecord = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const newRecorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      newRecorder.ondataavailable = (e) => chunks.push(e.data);
      newRecorder.onstop = async () => {
        const blob = new Blob(chunks, { type: "audio/mp3" });
        const file = new File([blob], "call.mp3", { type: "audio/mp3" });
        processCall(file);
      };

      newRecorder.start();
      setRecorder(newRecorder);
      setIsRecording(true);
    } catch (err) {
      console.error("Microphone Error:", err);
      setStatus("MIC_ERROR");
    }
  };

  const stopRecord = () => {
    if (recorder) {
      recorder.stop();
      setIsRecording(false);
    }
  };

  const processCall = async (audioFile: File) => {
    setStatus("ANALYZING_VOICE");
    try {
      const aiData = await processMediaOnClient(
        "Urgent call. Extract location/severity.",
        audioFile
      );

      // [FIXED: Use API_URL]
      await fetch(`${API_URL}/api/incident`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...aiData,
          description: "[VOICE CALL] " + aiData.description,
        }),
      });

      setStatus("DISPATCHED");
      setTimeout(() => setStatus("IDLE"), 3000);
    } catch (error) {
      console.error(error);
      setStatus("ERROR");
    }
  };

  return (
    <div className="h-full bg-slate-900 flex flex-col">
      {/* HEADER */}
      <div className="w-full bg-slate-950 border-b border-slate-800 p-4 text-center">
        <h2 className="text-white font-bold flex items-center justify-center gap-2">
          <Radio className="text-red-500" /> EMERGENCY HELPLINE
        </h2>
        <p className="text-xs text-slate-500 font-mono mt-1">
          SIMULATION: INGESTING DISTRESS CALLS VIA VOICE AI
        </p>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center">
        <div
          className={`w-48 h-48 rounded-full border-4 flex items-center justify-center cursor-pointer transition-all ${
            isRecording
              ? "border-red-500 bg-red-900/20 scale-110 shadow-[0_0_50px_rgba(239,68,68,0.5)]"
              : "border-slate-700 bg-slate-800 hover:border-slate-600"
          }`}
          onMouseDown={startRecord}
          onMouseUp={stopRecord}
          onTouchStart={startRecord}
          onTouchEnd={stopRecord}
        >
          <Mic
            className={`w-20 h-20 ${
              isRecording ? "text-red-500 animate-pulse" : "text-slate-500"
            }`}
          />
        </div>
        <p className="mt-8 text-slate-400 font-mono text-center text-lg">
          {status === "IDLE" && "HOLD BUTTON TO SPEAK"}
          {status === "ANALYZING_VOICE" && (
            <span className="animate-pulse text-cyan-400">
              ANALYZING AUDIO STREAM...
            </span>
          )}
          {status === "DISPATCHED" && (
            <span className="text-green-400 font-bold">
              INCIDENT LOGGED & DISPATCHED
            </span>
          )}
          {status === "MIC_ERROR" && (
            <span className="text-red-500">MICROPHONE ACCESS DENIED</span>
          )}
          {status === "ERROR" && (
            <span className="text-red-500">SYSTEM ERROR</span>
          )}
        </p>
      </div>
    </div>
  );
}
