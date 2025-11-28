"use client";

import React, { useReducer, useRef, useEffect } from "react";
import ChatMessages, { Message } from "./components/ChatMessages";
import ChatInput from "./components/ChatInput";
import Loader from "./components/Loader";

// -----------------------------
// Estado y acciones
// -----------------------------
type ChatState = {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
};

type ChatAction =
  | { type: "ADD_USER_MESSAGE"; payload: string }
  | { type: "ADD_ASSISTANT_MESSAGE"; payload: string }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_ERROR"; payload: string | null }
  | { type: "RESET" }
  | { type: "SET_MESSAGES"; payload: Message[] };

// -----------------------------
// Reducer
// -----------------------------
function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case "ADD_USER_MESSAGE":
      return { ...state, messages: [...state.messages, { role: "user", content: action.payload }] };
    case "ADD_ASSISTANT_MESSAGE":
      const lastMsg = state.messages[state.messages.length - 1];
      if (lastMsg?.role === "assistant") {
        const updatedMessages = [...state.messages];
        updatedMessages[updatedMessages.length - 1] = {
          role: "assistant",
          content: action.payload,
        };
        return { ...state, messages: updatedMessages };
      }
      return { ...state, messages: [...state.messages, { role: "assistant", content: action.payload }] };
    case "SET_LOADING":
      return { ...state, isLoading: action.payload };
    case "SET_ERROR":
      return { ...state, error: action.payload };
    case "RESET":
      return { messages: [], isLoading: false, error: null };
    case "SET_MESSAGES":
      return { ...state, messages: action.payload };
    default:
      return state;
  }
}

// -----------------------------
// Componente principal
// -----------------------------
export default function ChatPage() {
  const [state, dispatch] = useReducer(chatReducer, {
    messages: [],
    isLoading: false,
    error: null,
  });

  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // -----------------------------
  // Cargar mensajes desde sessionStorage al inicio
  // -----------------------------
  useEffect(() => {
    const saved = sessionStorage.getItem("chatMessages");
    if (saved) {
      try {
        const parsed: Message[] = JSON.parse(saved);
        dispatch({ type: "SET_MESSAGES", payload: parsed });
      } catch {
        console.warn("No se pudo cargar la conversación guardada");
      }
    }
  }, []);

  // -----------------------------
  // Guardar mensajes en sessionStorage cuando cambien
  // -----------------------------
  useEffect(() => {
    sessionStorage.setItem("chatMessages", JSON.stringify(state.messages));
  }, [state.messages]);

  // -----------------------------
  // Scroll automático al final
  // -----------------------------
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [state.messages, state.isLoading]);

  // -----------------------------
  // Enviar mensaje
  // -----------------------------
  const sendMessage = async (userInput: string) => {
    dispatch({ type: "SET_ERROR", payload: null });
    dispatch({ type: "SET_LOADING", payload: true });
    dispatch({ type: "ADD_USER_MESSAGE", payload: userInput });

    const newMessages = [...state.messages, { role: "user", content: userInput }];

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages }),
      });

      if (!response.ok || !response.body) {
        throw new Error("Error en la respuesta del servidor");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantReply = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        assistantReply += decoder.decode(value, { stream: true });
        dispatch({ type: "ADD_ASSISTANT_MESSAGE", payload: assistantReply });
      }
    } catch (err) {
      console.error(err);
      dispatch({
        type: "SET_ERROR",
        payload: "Ocurrió un error al conectarse con el servidor o el mensaje fue interrumpido.",
      });
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  };

  return (
    <main className="flex flex-col max-w-3xl mx-auto mt-10 border rounded-lg shadow-sm">
      <h1 className="text-2xl font-bold text-center py-4 border-b">
        Chat con IA (OpenRouter)
      </h1>

      <div className="flex justify-end p-4 border-b">
        <button
          className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600"
          onClick={() => {
            dispatch({ type: "RESET" });
            sessionStorage.removeItem("chatMessages");
          }}
        >
          Nuevo Chat
        </button>
      </div>


      {/* Zona de mensajes */}
      <ChatMessages messages={state.messages} />

      {/* Scroll al final */}
      <div ref={chatEndRef} />

      {/* Loader */}
      {state.isLoading && <Loader />}

      {/* Error */}
      {state.error && (
        <p className="text-red-500 text-center p-2 text-sm">{state.error}</p>
      )}

      {/* Input */}
      <ChatInput onSend={sendMessage} disabled={state.isLoading} />
    </main>
  );
}
