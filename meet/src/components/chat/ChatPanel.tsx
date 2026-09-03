import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from './ChatMessage';
import { useMeetingStore } from '../../store/meetingStore';
import { socketService } from '../../services/socket';
import { Send, MessageSquare, X } from 'lucide-react';
import { Button } from '../ui/Button';

interface ChatPanelProps {
  onClose: () => void;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({ onClose }) => {
  const { chatMessages, addToast } = useMeetingStore();
  const [text, setText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const socket = socketService.getSocket();
  const currentUserId = socket?.id;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;

    if (socket) {
      socket.emit('chat:message', { text: text.trim() });
      setText('');
    } else {
      addToast('Không có kết nối để gửi tin nhắn', 'error');
    }
  };

  return (
    <div className="w-full md:w-80 lg:w-96 h-full bg-[#202124] border-l border-gray-800 flex flex-col z-20 shrink-0 select-none shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-blue-400" />
          <h3 className="font-semibold text-gray-100">Trò chuyện trong cuộc họp</h3>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Messages List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {chatMessages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-gray-500 text-xs space-y-2">
            <MessageSquare className="w-8 h-8 opacity-40" />
            <p>Chưa có tin nhắn nào. Hãy gửi tin nhắn đầu tiên!</p>
          </div>
        ) : (
          chatMessages.map((msg) => (
            <ChatMessage
              key={msg.id}
              message={msg}
              isSelf={msg.senderId === currentUserId}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Box */}
      <form onSubmit={handleSend} className="p-3 border-t border-gray-800 flex items-center gap-2">
        <input
          type="text"
          placeholder="Nhập tin nhắn..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="flex-1 bg-[#282a2d] text-white text-sm placeholder-gray-500 rounded-full px-4 py-2.5 border border-gray-700 focus:outline-none focus:border-blue-500"
        />
        <Button
          type="submit"
          variant="primary"
          size="icon"
          disabled={!text.trim()}
          className="p-2.5 shrink-0"
        >
          <Send className="w-4 h-4" />
        </Button>
      </form>
    </div>
  );
};
