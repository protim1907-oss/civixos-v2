"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, MicOff } from "lucide-react";

// Minimal typings for the Web Speech API (not in the standard TS lib).
type SpeechResultAlt = { transcript: string };
type SpeechResult = { isFinal: boolean; 0: SpeechResultAlt };
type SpeechResultList = { length: number } & Record<number, SpeechResult>;
type SpeechEvent = { resultIndex: number; results: SpeechResultList };
type SpeechErrEvent = { error: string };
type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: SpeechEvent) => void) | null;
  onerror: ((e: SpeechErrEvent) => void) | null;
  onend: (() => void) | null;
};
type SpeechCtor = new () => SpeechRecognitionLike;

function getSpeechCtor(): SpeechCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechCtor;
    webkitSpeechRecognition?: SpeechCtor;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

// A mic toggle that dictates speech into a text field via the browser's built-in
// speech recognition. Renders nothing on browsers without support. `onAppend`
// receives finalized transcript chunks as the user speaks.
export default function DictationButton({
  onAppend,
  className = "",
}: {
  onAppend: (text: string) => void;
  className?: string;
}) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState("");
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const shouldListenRef = useRef(false);
  const onAppendRef = useRef(onAppend);
  onAppendRef.current = onAppend;

  useEffect(() => {
    setSupported(Boolean(getSpeechCtor()));
  }, []);

  const stop = useCallback(() => {
    shouldListenRef.current = false;
    setListening(false);
    recognitionRef.current?.stop();
  }, []);

  const start = useCallback(() => {
    const Ctor = getSpeechCtor();
    if (!Ctor) return;
    setError("");
    const rec = new Ctor();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";

    rec.onresult = (e) => {
      let finalText = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const result = e.results[i];
        if (result.isFinal) finalText += result[0].transcript;
      }
      const trimmed = finalText.trim();
      if (trimmed) onAppendRef.current(trimmed);
    };

    rec.onerror = (e) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        setError("Microphone access is blocked. Allow it in your browser to dictate.");
        shouldListenRef.current = false;
        setListening(false);
      }
      // Transient errors (no-speech, aborted, network) fall through to onend,
      // which restarts while the user still wants to dictate.
    };

    rec.onend = () => {
      if (shouldListenRef.current) {
        try {
          rec.start();
        } catch {
          /* already started — ignore */
        }
      } else {
        setListening(false);
      }
    };

    recognitionRef.current = rec;
    shouldListenRef.current = true;
    try {
      rec.start();
      setListening(true);
    } catch {
      /* start can throw if called twice quickly — ignore */
    }
  }, []);

  // Clean up on unmount.
  useEffect(() => {
    return () => {
      shouldListenRef.current = false;
      recognitionRef.current?.abort();
    };
  }, []);

  if (!supported) return null;

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => (listening ? stop() : start())}
        aria-pressed={listening}
        className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
          listening
            ? "bg-red-600 text-white hover:bg-red-700"
            : "bg-slate-900 text-white hover:bg-slate-800"
        }`}
      >
        {listening ? (
          <>
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-white" />
            </span>
            Listening… tap to stop
          </>
        ) : (
          <>
            <Mic className="h-4 w-4" />
            Dictate
          </>
        )}
      </button>
      {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
