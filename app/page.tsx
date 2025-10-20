"use client";
import React, { useState, useRef } from 'react';
import { Send, Heart, AlertCircle, CheckCircle, Zap, Shield, Smile, Frown, Key } from 'lucide-react';

type GameState = 'setup' | 'menu' | 'playing' | 'result';

interface Message {
  text: string;
  isPositive: boolean;
  emoji: string;
}

export default function EmpathyDefender() {
  const [gameState, setGameState] = useState<GameState>('menu');
  const [apiKey, setApiKey] = useState(process.env.NEXT_PUBLIC_OPENAI_API_KEY || '');
  
  // Debug: Log environment variables
  console.log('🔑 API Key loaded:', apiKey ? 'Yes (hidden)' : 'No');
  console.log('🌐 Base URL:', process.env.NEXT_PUBLIC_BASE_URL);
  
  const [score, setScore] = useState(0);
  const [currentMessage, setCurrentMessage] = useState('');
  const [userInput, setUserInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ show: boolean; correct: boolean; message: string }>({ 
    show: false, 
    correct: false, 
    message: '' 
  });
  const [streak, setStreak] = useState(0);
  const [emotions, setEmotions] = useState<{ x: number; y: number; emoji: string; id: number }[]>([]);
  const [round, setRound] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Phân tích cảm xúc bằng OpenAI API
  const analyzeEmotionWithAI = async (text: string): Promise<boolean> => {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: 'Bạn là chuyên gia phân tích cảm xúc. Phân tích xem câu nói có mang tính tiêu cực, bạo lực, xúc phạm, bắt nạt hay không. Chỉ trả lời "NEGATIVE" nếu tiêu cực hoặc "POSITIVE" nếu tích cực.'
            },
            {
              role: 'user',
              content: `Phân tích câu sau: "${text}"`
            }
          ],
          temperature: 0.3,
          max_tokens: 10
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('API Error:', errorData);
        throw new Error('API request failed');
      }

      const data = await response.json();
      
      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        console.error('Invalid API response:', data);
        throw new Error('Invalid API response format');
      }
      
      const result = data.choices[0].message.content.trim().toLowerCase();
      return result.includes('negative');
    } catch (error) {
      console.error('Error calling OpenAI:', error);
      // Fallback to rule-based
      return analyzeEmotionFallback(text);
    }
  };

  // Fallback khi API lỗi - yêu cầu user thử lại
  const analyzeEmotionFallback = (text: string): boolean => {
    throw new Error('Không thể phân tích cảm xúc. Vui lòng kiểm tra kết nối API.');
  };

  // Sinh câu nói mới bằng OpenAI
  const generateMessageWithAI = async (isNegative: boolean): Promise<string> => {
    try {
      const prompt = isNegative 
        ? 'Tạo 1 câu bình luận tiêu cực, bắt nạt trên mạng xã hội bằng tiếng Việt (ngắn gọn, 10-15 từ). Chỉ trả về câu bình luận, không giải thích.'
        : 'Tạo 1 câu bình luận tích cực, động viên trên mạng xã hội bằng tiếng Việt (ngắn gọn, 10-15 từ). Chỉ trả về câu bình luận, không giải thích.';

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: 'Bạn là người tạo ví dụ cho game giáo dục về chống bắt nạt mạng.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.8,
          max_tokens: 50
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('API Error:', errorData);
        throw new Error(`API Error: ${response.status}`);
      }

      if (!response.ok) {
        const errorData = await response.json();
        console.error('API Error:', errorData);
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        console.error('Invalid API response:', data);
        throw new Error('Invalid API response format');
      }
      
      return data.choices[0].message.content.trim().replace(/['"]/g, '');
    } catch (error) {
      console.error('Error generating message:', error);
      throw new Error('Không thể tạo câu hỏi mới. Vui lòng kiểm tra API key và kết nối internet.');
    }
  };

  const getRandomMessage = async () => {
    const isNegative = Math.random() > 0.5;
    return await generateMessageWithAI(isNegative);
  };

  const startGame = async () => {
    setGameState('playing');
    setScore(0);
    setStreak(0);
    setRound(1);
    setUserInput('');
    setFeedback({ show: false, correct: false, message: '' });
    const newMessage = await getRandomMessage();
    setCurrentMessage(newMessage);
  };

  const addEmotionAnimation = (emoji: string) => {
    const newEmotion = {
      x: Math.random() * 80 + 10,
      y: 50,
      emoji: emoji,
      id: Date.now()
    };
    setEmotions(prev => [...prev, newEmotion]);
    setTimeout(() => {
      setEmotions(prev => prev.filter(e => e.id !== newEmotion.id));
    }, 2000);
  };

  const handleClassification = async (isNegative: boolean) => {
    setLoading(true);
    
    try {
      const actuallyNegative = await analyzeEmotionWithAI(currentMessage);
      const correct = isNegative === actuallyNegative;
      
      if (correct) {
        const points = 10 + streak * 5;
        setScore(prev => prev + points);
        setStreak(prev => prev + 1);
        addEmotionAnimation(isNegative ? '💔' : '💚');
        setFeedback({ 
          show: true, 
          correct: true, 
          message: `Chính xác! +${points} điểm ${streak > 0 ? `(Streak x${streak + 1})` : ''}` 
        });
      } else {
        setStreak(0);
        addEmotionAnimation('❌');
        setFeedback({ 
          show: true, 
          correct: false, 
          message: 'Chưa đúng. Hãy đọc kỹ hơn nhé!' 
        });
      }
      
      setLoading(false);
      
      setTimeout(async () => {
        setFeedback({ show: false, correct: false, message: '' });
        setRound(prev => prev + 1);
        const newMessage = await getRandomMessage();
        setCurrentMessage(newMessage);
      }, 2000);
    } catch (error) {
      setLoading(false);
      const errorMessage = error instanceof Error ? error.message : 'Lỗi không xác định';
      setFeedback({ 
        show: true, 
        correct: false, 
        message: `❌ ${errorMessage}` 
      });
      // Tự động ẩn error sau 5s
      setTimeout(() => {
        setFeedback({ show: false, correct: false, message: '' });
      }, 5000);
    }
  };

  const transformToPositive = async () => {
    if (!userInput.trim()) return;
    
    setLoading(true);
    
    try {
      const wasNegative = await analyzeEmotionWithAI(currentMessage);
      const nowPositive = !(await analyzeEmotionWithAI(userInput));
      
      if (wasNegative && nowPositive) {
        const healingPoints = 20 + streak * 10;
        setScore(prev => prev + healingPoints);
        setStreak(prev => prev + 1);
        addEmotionAnimation('✨');
        setFeedback({ 
          show: true, 
          correct: true, 
          message: `Tuyệt vời! Bạn đã chữa lành câu nói! +${healingPoints} điểm 💖` 
        });
      } else {
        setStreak(0);
        setFeedback({ 
          show: true, 
          correct: false, 
          message: 'Hãy thử biến đổi thành lời nói tích cực hơn nhé!' 
        });
      }
      
      setLoading(false);
      setUserInput('');
      
      setTimeout(async () => {
        setFeedback({ show: false, correct: false, message: '' });
        setRound(prev => prev + 1);
        const newMessage = await getRandomMessage();
        setCurrentMessage(newMessage);
      }, 2500);
    } catch (error) {
      setLoading(false);
      const errorMessage = error instanceof Error ? error.message : 'Lỗi không xác định';
      setFeedback({ 
        show: true, 
        correct: false, 
        message: `❌ ${errorMessage}` 
      });
      // Tự động ẩn error sau 5s
      setTimeout(() => {
        setFeedback({ show: false, correct: false, message: '' });
      }, 5000);
    }
  };

  // Setup Screen - API Key Input
  if (gameState === 'setup') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-900 via-purple-900 to-indigo-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <Key className="w-16 h-16 mx-auto text-pink-400 mb-4" />
          <h2 className="text-3xl font-bold text-white mb-4">Cài đặt OpenAI API</h2>
          
          <div className="bg-slate-800 bg-opacity-50 backdrop-blur rounded-lg p-6 mb-4 border border-pink-500 border-opacity-30">
            <label className="block text-left text-sm font-semibold text-gray-300 mb-2">
              🔑 Nhập OpenAI API Key:
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-proj-..."
              className="w-full bg-slate-700 text-white px-4 py-3 rounded border border-slate-600 focus:border-pink-500 focus:outline-none mb-3"
            />
            <p className="text-xs text-gray-400 text-left">
              💡 API key của bạn chỉ lưu trong session này và không được gửi đi đâu khác ngoài OpenAI
            </p>
          </div>

          <button
            onClick={() => apiKey.trim() && setGameState('menu')}
            disabled={!apiKey.trim()}
            className="w-full bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 disabled:from-slate-600 disabled:to-slate-600 text-white font-bold py-3 rounded-lg transition"
          >
            Tiếp tục →
          </button>

          <div className="mt-4 text-xs text-gray-400">
            <p>🔒 Không có OpenAI API key?</p>
            <a 
              href="https://platform.openai.com/api-keys" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-pink-400 hover:text-pink-300 underline"
            >
              Tạo tại đây (miễn phí $5 credit)
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Menu Component
  if (gameState === 'menu') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-900 via-purple-900 to-indigo-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="mb-8 animate-bounce">
            <Heart className="w-20 h-20 mx-auto text-pink-400 mb-4 fill-pink-400" />
            <h1 className="text-5xl font-bold text-white mb-2">EMPATHY DEFENDER</h1>
            <p className="text-pink-300 text-lg">Chống bắt nạt mạng - Lan tỏa yêu thương</p>
          </div>

          <div className="bg-slate-800 bg-opacity-50 backdrop-blur rounded-lg p-6 mb-6 border border-pink-500 border-opacity-30">
            <h2 className="text-xl font-bold text-white mb-3">🎯 Mục tiêu game</h2>
            <p className="text-gray-300 mb-4">
              Phân biệt lời nói <span className="text-red-400 font-bold">tiêu cực</span> và <span className="text-green-400 font-bold">tích cực</span> trên mạng xã hội.
              Chuyển đổi lời nói bạo lực thành lời nói đồng cảm!
            </p>
          </div>

          <div className="bg-slate-800 bg-opacity-50 backdrop-blur rounded-lg p-6 mb-6 border border-purple-500 border-opacity-30">
            <h3 className="text-lg font-bold text-white mb-3">📚 Bạn sẽ học được:</h3>
            <div className="text-left text-gray-300 space-y-2 text-sm">
              <p>✅ Nhận biết ngôn từ gây tổn thương</p>
              <p>💬 Chuyển đổi lời nói tiêu cực thành tích cực</p>
              <p>🛡️ Bảo vệ bản thân khỏi bạo lực mạng</p>
              <p>💖 Lan tỏa sự đồng cảm và tử tế</p>
            </div>
          </div>

          <div className="bg-green-600 bg-opacity-20 border border-green-500 rounded-lg p-3 mb-6">
            <p className="text-green-300 text-sm">
              🤖 <strong>Powered by OpenAI GPT</strong> - Câu hỏi tự động sinh & phân tích thông minh
            </p>
          </div>

          <button
            onClick={startGame}
            className="w-full bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white font-bold py-4 rounded-lg transition transform hover:scale-105 shadow-lg"
          >
            ▶️ Bắt đầu chơi
          </button>

          <div className="mt-6 text-sm text-gray-400">
            <p>💡 Mỗi lần phân loại đúng: +10 điểm</p>
            <p>✨ Chữa lành lời nói: +20 điểm</p>
            <p>🔥 Streak combo: Điểm thưởng x2, x3...</p>
          </div>
        </div>
      </div>
    );
  }

  // Playing Component
  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-900 via-purple-900 to-indigo-900 p-4 relative overflow-hidden">
      {/* Emotion Animations */}
      {emotions.map(emotion => (
        <div
          key={emotion.id}
          className="absolute text-4xl"
          style={{
            left: `${emotion.x}%`,
            top: `${emotion.y}%`,
            animation: 'float 2s ease-out forwards'
          }}
        >
          {emotion.emoji}
        </div>
      ))}

      <style jsx>{`
        @keyframes float {
          0% {
            transform: translateY(0) scale(1);
            opacity: 1;
          }
          100% {
            transform: translateY(-100px) scale(1.5);
            opacity: 0;
          }
        }
      `}</style>

      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-3 mb-2">
            <Heart className="w-10 h-10 text-pink-400 fill-pink-400" />
            <h1 className="text-4xl font-bold text-white">EMPATHY DEFENDER</h1>
          </div>
          <p className="text-pink-300">Nhận diện & chữa lành lời nói bạo lực</p>
          <p className="text-gray-400 text-sm mt-1">🎮 Vòng {round}</p>
        </div>

        {/* Score & Streak */}
        <div className="flex gap-4 mb-6 justify-center">
          <div className="bg-slate-800 bg-opacity-50 backdrop-blur rounded-lg p-4 border border-pink-500 border-opacity-30 min-w-[150px] text-center">
            <div className="text-3xl font-bold text-pink-400">{score}</div>
            <div className="text-sm text-gray-400">Điểm</div>
          </div>
          {streak > 0 && (
            <div className="bg-slate-800 bg-opacity-50 backdrop-blur rounded-lg p-4 border border-orange-500 border-opacity-30 min-w-[150px] text-center animate-pulse">
              <div className="text-3xl font-bold text-orange-400">🔥 x{streak}</div>
              <div className="text-sm text-gray-400">Streak</div>
            </div>
          )}
        </div>

        {/* Message Display */}
        <div className="bg-slate-800 bg-opacity-50 backdrop-blur rounded-lg p-6 border border-purple-500 border-opacity-30 mb-6">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center flex-shrink-0">
              👤
            </div>
            <div className="flex-1 bg-slate-700 rounded-lg p-4">
              {currentMessage ? (
                <p className="text-white text-lg">{currentMessage}</p>
              ) : (
                <div className="flex items-center gap-2 text-gray-400">
                  <Zap className="w-5 h-5 animate-spin" />
                  <span>Đang tạo câu hỏi mới...</span>
                </div>
              )}
            </div>
          </div>

          {/* Classification Buttons */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <button
              onClick={() => handleClassification(true)}
              disabled={loading || !currentMessage}
              className="bg-red-600 hover:bg-red-700 disabled:bg-slate-600 text-white font-bold py-3 rounded-lg transition transform hover:scale-105 flex items-center justify-center gap-2"
            >
              <Frown className="w-5 h-5" />
              Tiêu cực 💔
            </button>
            <button
              onClick={() => handleClassification(false)}
              disabled={loading || !currentMessage}
              className="bg-green-600 hover:bg-green-700 disabled:bg-slate-600 text-white font-bold py-3 rounded-lg transition transform hover:scale-105 flex items-center justify-center gap-2"
            >
              <Smile className="w-5 h-5" />
              Tích cực 💚
            </button>
          </div>

          {/* Feedback */}
          {feedback.show && (
            <div className={`p-4 rounded-lg mb-4 ${feedback.correct ? 'bg-green-600' : 'bg-red-600'} bg-opacity-20 border ${feedback.correct ? 'border-green-500' : 'border-red-500'} animate-pulse`}>
              <p className="text-white text-center font-semibold">{feedback.message}</p>
            </div>
          )}

          {/* Healing Section */}
          <div className="border-t border-gray-600 pt-4">
            <label className="block text-sm font-semibold text-pink-300 mb-2">
              ✨ Chữa lành: Biến câu trên thành lời nói tích cực
            </label>
            <div className="flex gap-2">
              <input
                ref={inputRef}
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && !loading && userInput.trim() && transformToPositive()}
                placeholder="Ví dụ: Bạn rất tuyệt vời, hãy cố gắng nhé!"
                className="flex-1 bg-slate-700 text-white px-4 py-3 rounded border border-slate-600 focus:border-pink-500 focus:outline-none"
                disabled={loading || !currentMessage}
              />
              <button
                onClick={transformToPositive}
                disabled={loading || !userInput.trim() || !currentMessage}
                className="bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 disabled:from-slate-600 disabled:to-slate-600 text-white px-6 py-3 rounded font-semibold transition flex items-center gap-2"
              >
                {loading ? <Zap className="w-5 h-5 animate-spin" /> : <Heart className="w-5 h-5 fill-white" />}
              </button>
            </div>
          </div>
        </div>

        {/* Tips */}
        <div className="bg-slate-800 bg-opacity-30 backdrop-blur rounded-lg p-4 border border-indigo-500 border-opacity-20">
          <p className="text-gray-300 text-sm text-center">
            💡 <span className="font-bold text-pink-300">Mẹo:</span> AI đang phân tích ngữ nghĩa sâu hơn cả từ ngữ. 
            Hãy chú ý đến ngữ cảnh và cảm xúc thật sự đằng sau câu nói!
          </p>
        </div>
      </div>
    </div>
  );
}