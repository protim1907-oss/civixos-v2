"use client";

import { useEffect, useRef, useState } from "react";
import { Mic } from "lucide-react";

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

// ---------------------------------------------------------------------------
// Shared dictation manager. The browser allows only ONE active microphone /
// speech recognition at a time, so a single recognition instance is shared by
// every DictationButton on the page. Starting a button just makes it the
// current target; results route to whichever field is active. Switching fields
// never restarts the mic, so buttons can't fight over it.
// ---------------------------------------------------------------------------
type Target = {
  onAppend: (text: string) => void;
  setListening: (v: boolean) => void;
  setError: (v: string) => void;
};

let recognition: SpeechRecognitionLike | null = null;
let currentTarget: Target | null = null;
let shouldListen = false;

function ensureRecognition(): SpeechRecognitionLike | null {
  if (recognition) return recognition;
  const Ctor = getSpeechCtor();
  if (!Ctor) return null;
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
    if (trimmed && currentTarget) currentTarget.onAppend(trimmed);
  };

  rec.onerror = (e) => {
    if (e.error === "not-allowed" || e.error === "service-not-allowed") {
      shouldListen = false;
      currentTarget?.setError(
        "Microphone access is blocked. Click the mic/lock icon in your browser's address bar, allow the microphone, then reload."
      );
      currentTarget?.setListening(false);
    }
    // Transient errors (no-speech, aborted, network) fall through to onend.
  };

  rec.onend = () => {
    if (shouldListen) {
      try {
        rec.start();
      } catch {
        /* already started — ignore */
      }
    } else {
      currentTarget?.setListening(false);
    }
  };

  recognition = rec;
  return rec;
}

function startDictation(target: Target) {
  const rec = ensureRecognition();
  if (!rec) return;
  // Hand the mic to this field; the previously active field stops listening.
  if (currentTarget && currentTarget !== target) currentTarget.setListening(false);
  currentTarget = target;
  target.setError("");
  shouldListen = true;
  target.setListening(true);
  try {
    rec.start();
  } catch {
    // Already running — that's fine: results now route to the new target.
  }
}

function stopDictation(target: Target) {
  shouldListen = false;
  if (currentTarget === target) currentTarget = null;
  target.setListening(false);
  try {
    recognition?.stop();
  } catch {
    /* ignore */
  }
}

// A mic toggle that dictates speech into a text field. Renders nothing on
// browsers without support. `onAppend` receives finalized transcript chunks.
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
  const onAppendRef = useRef(onAppend);
  onAppendRef.current = onAppend;

  useEffect(() => {
    setSupported(Boolean(getSpeechCtor()));
  }, []);

  // A stable target object for this instance (identity used by the manager).
  const targetRef = useRef<Target | null>(null);
  if (!targetRef.current) {
    targetRef.current = {
      onAppend: (t) => onAppendRef.current(t),
      setListening,
      setError,
    };
  }

  useEffect(() => {
    const target = targetRef.current;
    return () => {
      if (target && currentTarget === target) stopDictation(target);
    };
  }, []);

  if (!supported) return null;

  const target = targetRef.current;
  const toggle = () => {
    if (!target) return;
    if (listening) stopDictation(target);
    else startDictation(target);
  };

  return (
    <div className={className}>
      <button
        type="button"
        onClick={toggle}
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
      {error ? <p className="mt-1 max-w-xs text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
