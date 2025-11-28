"use client";

import React from "react";

export type Message = {
  role: "user" | "assistant";
  content: string;
};

interface ChatMessagesProps {
  messages: Message[];
}

export default function ChatMessages({ messages }: ChatMessagesProps) {
  return (
    <div className="flex flex-col space-y-2 p-4 overflow-y-auto h-[70vh] border rounded-lg bg-gray-50">
      {messages.length === 0 && (
        <p className="text-gray-400 text-center mt-10">
          Escribe un mensaje para comenzar la conversación.
        </p>
      )}

      {messages.map((msg, i) => (
        <div
          key={i}
          className={`p-3 rounded-xl max-w-[80%] ${
            msg.role === "user"
              ? "bg-blue-600 text-white self-end"
              : "bg-gray-200 text-black self-start"
          }`}
        >
          {msg.content}
        </div>
      ))}
    </div>
  );
}
