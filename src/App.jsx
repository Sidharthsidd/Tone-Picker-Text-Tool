import React, { useEffect, useReducer, useState } from "react";
import { motion } from "framer-motion";

// ----------------------
// Utilities
// ----------------------
const LS_KEYS = {
  TEXT: "mistral:tone:text",
  HIST: "mistral:tone:history",
  REDO: "mistral:tone:redo",
};

function loadLS(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function saveLS(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

// ----------------------
// History reducer
// ----------------------
const initialHistoryState = (initialText = "") => ({
  current: initialText,
  past: loadLS(LS_KEYS.HIST, []),
  future: loadLS(LS_KEYS.REDO, []),
});

function historyReducer(state, action) {
  switch (action.type) {
    case "SET": {
      if (action.value === state.current) return state;
      const past = [...state.past, state.current].slice(-200);
      return { current: action.value, past, future: [] };
    }
    case "DIRECT_SET": {
      return { ...state, current: action.value };
    }
    case "UNDO": {
      if (state.past.length === 0) return state;
      const prev = state.past[state.past.length - 1];
      const past = state.past.slice(0, -1);
      const future = [state.current, ...state.future].slice(0, 200);
      return { current: prev, past, future };
    }
    case "REDO": {
      if (state.future.length === 0) return state;
      const [next, ...rest] = state.future;
      const past = [...state.past, state.current].slice(-200);
      return { current: next, past, future: rest };
    }
    case "RESET": {
      return { current: "", past: [], future: [] };
    }
    default:
      return state;
  }
}

// ----------------------
// UI Helpers
// ----------------------
function Spinner() {
  return (
    <div className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
  );
}

function ErrorBanner({ message, onClose }) {
  if (!message) return null;
  return (
    <div className="rounded-xl border border-red-300 bg-red-50 text-red-800 p-3 flex items-start gap-3">
      <div className="mt-0.5">⚠️</div>
      <div className="flex-1 whitespace-pre-wrap text-sm">{message}</div>
      <button
        onClick={onClose}
        className="px-2 py-0.5 text-sm rounded-lg hover:bg-red-100"
      >
        Dismiss
      </button>
    </div>
  );
}

const quadrants = [
  { id: "formal_concise", formality: "formal", verbosity: "concise" },
  { id: "formal_elaborate", formality: "formal", verbosity: "elaborate" },
  { id: "casual_concise", formality: "casual", verbosity: "concise" },
  { id: "casual_elaborate", formality: "casual", verbosity: "elaborate" },
];

// ----------------------
// App Component
// ----------------------
export default function App() {
  const [state, dispatch] = useReducer(
    historyReducer,
    undefined,
    () => initialHistoryState(loadLS(LS_KEYS.TEXT, ""))
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    saveLS(LS_KEYS.TEXT, state.current);
    saveLS(LS_KEYS.HIST, state.past);
    saveLS(LS_KEYS.REDO, state.future);
  }, [state]);

  const canUndo = state.past.length > 0;
  const canRedo = state.future.length > 0;

  async function adjustTone({ formality, verbosity }) {
    if (!state.current.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("http://localhost:5000/api/adjust-tone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: state.current,
          tone: { formality, verbosity },
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Request failed (${res.status})`);
      }
      const data = await res.json();
      const next =
        data && data.result ? String(data.result) : state.current;
      dispatch({ type: "SET", value: next });
    } catch (e) {
      setError(e.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="h-screen w-screen flex flex-col md:flex-row bg-white text-gray-900">
      {/* Left: Editor */}
      <div className="flex-1 p-4 md:p-6">
        <div className="mx-auto h-full max-w-3xl flex flex-col">
          <div className="flex items-center justify-between gap-2 mb-3">
            <h1 className="text-xl md:text-2xl font-semibold">
              Mistral Tone Tweaker
            </h1>
            <div className="flex items-center gap-2">
              <button
                onClick={() => dispatch({ type: "UNDO" })}
                disabled={!canUndo || loading}
                className="rounded px-3 py-1 border shadow-sm disabled:opacity-40"
              >
                ⤺ Undo
              </button>
              <button
                onClick={() => dispatch({ type: "REDO" })}
                disabled={!canRedo || loading}
                className="rounded px-3 py-1 border shadow-sm disabled:opacity-40"
              >
                ⤻ Redo
              </button>
              <button
                onClick={() => dispatch({ type: "RESET" })}
                disabled={loading}
                className="rounded px-3 py-1 border shadow-sm disabled:opacity-40"
              >
                Reset
              </button>
            </div>
          </div>

          <div className="relative flex-1">
            <textarea
              className="w-full h-full resize-none rounded border p-4"
              placeholder="Type or paste your text here…"
              value={state.current}
              onChange={(e) =>
                dispatch({ type: "DIRECT_SET", value: e.target.value })
              }
              disabled={loading}
            />
            {loading && (
              <div className="absolute inset-0 bg-white/70 grid place-items-center">
                <div className="flex items-center gap-3 text-sm">
                  <Spinner />
                  <span>Rewriting…</span>
                </div>
              </div>
            )}
          </div>

          <div className="mt-3">
            <ErrorBanner message={error} onClose={() => setError("")} />
          </div>
        </div>
      </div>

      {/* Right: Tone Picker */}
      <div className="md:w-[420px] w-full border-t md:border-t-0 md:border-l p-4 md:p-6 bg-gray-50">
        <h2 className="text-base font-medium mb-2">Tone Picker</h2>
        <div className="grid grid-cols-2 grid-rows-2 gap-3">
          {quadrants.map((q) => (
            <motion.button
              key={q.id}
              whileTap={{ scale: 0.95 }}
              disabled={loading}
              onClick={() =>
                adjustTone({ formality: q.formality, verbosity: q.verbosity })
              }
              className="rounded border bg-white p-4 text-sm shadow-sm hover:shadow disabled:opacity-50"
            >
              <div className="font-medium">{q.formality}</div>
              <div className="text-gray-500 text-xs">{q.verbosity}</div>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}
