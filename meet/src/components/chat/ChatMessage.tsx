import React from 'react';
import { ChatMessage as ChatMessageType } from '../../types/meeting';

interface ChatMessageProps {
  message: ChatMessageType;
  isSelf?: boolean;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message, isSelf = false }) => {
  const formattedTime = new Date(message.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className={`flex flex-col gap-1 ${isSelf ? 'items-end' : 'items-start'}`}>
      <div className="flex items-center gap-2 px-1">
        <span className="text-xs font-semibold text-gray-300">
          {isSelf ? 'Bạn' : message.senderName}
        </span>
        <span className="text-[10px] text-gray-500">{formattedTime}</span>
      </div>

      <div
        className={`px-3.5 py-2.5 rounded-2xl max-w-[85%] text-sm break-words shadow-sm ${
          isSelf
            ? 'bg-blue-600 text-white rounded-tr-xs'
            : 'bg-[#282a2d] text-gray-100 border border-gray-700/60 rounded-tl-xs'
        }`}
      >
        {message.text}
      </div>
    </div>
  );
};
