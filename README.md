Frontend (React + Tailwind + Framer Motion)

Text Editor → Editable text area with live updates

Tone Picker (2×2 matrix) → Adjusts tone along two axes:

Formal ↔ Casual

Concise ↔ Elaborate

Undo / Redo → Tracks and reverts changes to text tone

Reset Button → Restores original input

LocalStorage Persistence → Saves text and history across refreshes

Responsive UI → Clean layout with animations and visual feedback

Error & Loading States → Spinner overlay + error banner

🔹 Backend (Node.js + Express)

Secure API proxy to Mistral AI

Environment variables managed with .env (API key not exposed to frontend)

Request validation & error handling

CORS enabled for local dev

Ready for caching or auth middleware if extended

⚙️ Tech Stack

Frontend: React, TailwindCSS, Framer Motion
Backend: Node.js, Express, dotenv
AI API: Mistral Small (mistral-small-latest)
State Management: React Reducer (for undo/redo)
