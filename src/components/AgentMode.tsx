import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, Sparkles, Image as ImageIcon, User, Upload, Download, 
  Check, X, AlertCircle, Laptop, ArrowRight, CornerDownLeft, Eye
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface StyleItem {
  id: string;
  name: string;
  desc: string;
  prompt: string;
  gradient: string;
}

interface AgentModeProps {
  sourceImage: string | null;
  setSourceImage: (img: string | null) => void;
  generatedImage: string | null;
  setGeneratedImage: (img: string | null) => void;
  isGenerating: boolean;
  options: {
    style: string;
    aspectRatio: string;
    imageSize: string;
    mode: string;
    portraitEthnicity: string;
    portraitGender: string;
    portraitAge: string;
  };
  setOptions: React.Dispatch<React.SetStateAction<any>>;
  userIntegral: number | null;
  requiredIntegral: number;
  handleGenerate: (customOptions?: any, customSourceImage?: string | null) => Promise<void>;
  stylesList: StyleItem[];
  aspectRatios: Array<{ value: string; label: string }>;
  resolutions: Array<{ value: string; label: string }>;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  processFile: (file: File) => void;
  removeSourceImage: (e: React.MouseEvent) => void;
  handleAbort: () => void;
}

interface ChatMessage {
  id: string;
  sender: 'ai' | 'user';
  text?: string;
  timestamp: string;
  type?: 'text' | 'mode-select' | 'style-select' | 'portrait-select' | 'upload-box' | 'generate-trigger' | 'result-card' | 'error';
  meta?: any;
}

export default function AgentMode({
  sourceImage,
  setSourceImage,
  generatedImage,
  setGeneratedImage,
  isGenerating,
  options,
  setOptions,
  userIntegral,
  requiredIntegral,
  handleGenerate,
  stylesList,
  aspectRatios,
  resolutions,
  fileInputRef,
  processFile,
  removeSourceImage,
  handleAbort,
}: AgentModeProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize welcome messages
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: 'welcome',
          sender: 'ai',
          text: '✨ 您好！我是您的智能水杯商品图设计师。我可以帮您快速将真实的产品原图转换为各种极具商业质感的电商大片、生活写真。',
          timestamp: getNowTime(),
          type: 'text',
        },
        {
          id: 'step1',
          sender: 'ai',
          text: '📸 首先，请问您今天想生成哪种类型的商品图？',
          timestamp: getNowTime(),
          type: 'mode-select',
        }
      ]);
    }
  }, []);

  // Handle scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isGenerating]);

  function getNowTime() {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  // Intercept budget checking before execution
  const checkIntegral = (): boolean => {
    if (userIntegral !== null && userIntegral < requiredIntegral) {
      // Append an error message in chat
      setMessages(prev => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: 'ai',
          text: '❌ 抱歉，由于您当前的账户特权或服务级别受限，暂时无法发起新的创意渲染。请前往主站个人中心核对服务状态或更新您的特权包，然后刷新本页面重试。',
          timestamp: getNowTime(),
          type: 'error',
        }
      ]);
      return false;
    }
    return true;
  };

  // 1. Select generation mode
  const selectMode = (mode: 'still_life' | 'portrait') => {
    const isPortrait = mode === 'portrait';
    setOptions((prev: any) => ({ ...prev, mode }));
    
    // Add user bubble
    setMessages(prev => [
      ...prev,
      {
        id: `user-mode-${Date.now()}`,
        sender: 'user',
        text: `我选择：${isPortrait ? '🙋 人像手持模特写真' : '📸 精致静物陈列模式'}`,
        timestamp: getNowTime(),
      },
      {
        id: `ai-mode-ok-${Date.now()}`,
        sender: 'ai',
        text: isPortrait 
          ? '好的，已选择【人像手持模特写真】！接下来，请根据您的需求定制模特的特征（肤色与年龄等）：'
          : '精致静物陈列已选择！接下来，请挑选一个您喜欢的背景风格画面：',
        timestamp: getNowTime(),
        type: isPortrait ? 'portrait-select' : 'style-select',
      }
    ]);
  };

  // 2. Select still-life style
  const selectStyle = (styleId: string) => {
    const matched = stylesList.find(s => s.id === styleId);
    if (!matched) return;
    setOptions((prev: any) => ({ ...prev, style: styleId }));

    setMessages(prev => [
      ...prev,
      {
        id: `user-style-${Date.now()}`,
        sender: 'user',
        text: `我喜欢的风格是：【${matched.name}】`,
        timestamp: getNowTime(),
      },
      {
        id: `ai-style-ok-${Date.now()}`,
        sender: 'ai',
        text: `好的，已选定风格【${matched.name}】。
建议配置信息：
• 💡 画面比例: ${options.aspectRatio}
• 🖥️ 清晰度: ${options.imageSize}

接下来，请上传您的水杯产品原图（您可以直接点击下方区域上传，或拖拽图片）：`,
        timestamp: getNowTime(),
        type: 'upload-box',
      }
    ]);
  };

  // 3. Confirm portrait attributes
  const confirmPortrait = (ethnicity: string, gender: string, age: string) => {
    setOptions((prev: any) => ({
      ...prev,
      portraitEthnicity: ethnicity,
      portraitGender: gender,
      portraitAge: age,
    }));

    const ethMap: Record<string, string> = { asian: '亚裔', caucasian: '白人', latino: '拉美裔', african: '非裔' };
    const genMap: Record<string, string> = { female: '女性', male: '男性' };
    const ageMap: Record<string, string> = { young_adult: '青年', middle_aged: '中年', elderly: '成熟' };

    setMessages(prev => [
      ...prev,
      {
        id: `user-port-${Date.now()}`,
        sender: 'user',
        text: `模特属性：${ethMap[ethnicity] || ethnicity} · ${genMap[gender] || gender} · ${ageMap[age] || age}`,
        timestamp: getNowTime(),
      },
      {
        id: `ai-port-ok-${Date.now()}`,
        sender: 'ai',
        text: `已锁定人像模特配置！为您智能匹配最佳构图风格。

接下来，请上传您的水杯产品原图（可以点击下方区域上传）：`,
        timestamp: getNowTime(),
        type: 'upload-box',
      }
    ]);
  };

  // Monitor parent uploaded image to advance chat state
  const prevSourceImageRef = useRef<string | null>(null);
  useEffect(() => {
    if (sourceImage && sourceImage !== prevSourceImageRef.current) {
      // Find last message. If there's already an uploaded image or we are in upload-box step
      const hasUploadBox = messages.some(m => m.type === 'upload-box');
      if (hasUploadBox) {
        // Append user uploaded preview
        setMessages(prev => [
          ...prev,
          {
            id: `user-img-${Date.now()}`,
            sender: 'user',
            text: '已成功上传产品图 📸',
            timestamp: getNowTime(),
            meta: { preview: sourceImage }
          },
          {
            id: `ai-ready-${Date.now()}`,
            sender: 'ai',
            text: '产品原图已接收！✨ 所有的生成设计材料与高级算法已准备就绪。接下来，我们即可一键合成。',
            timestamp: getNowTime(),
            type: 'generate-trigger',
          }
        ]);
      }
    }
    prevSourceImageRef.current = sourceImage;
  }, [sourceImage, messages]);

  // Handle run generate
  const triggerGenerate = async () => {
    if (!sourceImage) {
      setMessages(prev => [
        ...prev,
        {
          id: `err-no-img-${Date.now()}`,
          sender: 'ai',
          text: '⚠️ 无法生成：请先上传水杯产品图。',
          timestamp: getNowTime(),
          type: 'error',
        }
      ]);
      return;
    }

    if (!checkIntegral()) return;

    // Append user click message
    setMessages(prev => [
      ...prev,
      {
        id: `user-gen-${Date.now()}`,
        sender: 'user',
        text: '🚀 立即开始智能生成！',
        timestamp: getNowTime(),
      }
    ]);

    // Let parent generate
    try {
      await handleGenerate();
    } catch (e: any) {
      let errMsg = e.message || '系统繁忙，请稍后再试';
      const lowerErr = errMsg.toLowerCase();
      if (
        lowerErr.includes('积分') || 
        lowerErr.includes('余额') || 
        lowerErr.includes('点数') || 
        lowerErr.includes('充值') || 
        lowerErr.includes('不足') || 
        lowerErr.includes('credit') || 
        lowerErr.includes('balance') || 
        lowerErr.includes('integral')
      ) {
        errMsg = '当前您的账户特权或服务等级受限，请前往主站个人中心核对服务状态或更新特权包重试。';
      }
      setMessages(prev => [
        ...prev,
        {
          id: `ai-gen-err-${Date.now()}`,
          sender: 'ai',
          text: `❌ 生图失败：${errMsg}`,
          timestamp: getNowTime(),
          type: 'error',
        }
      ]);
    }
  };

  // Listen to final generated image completion
  const prevGenImageRef = useRef<string | null>(null);
  useEffect(() => {
    if (generatedImage && generatedImage !== prevGenImageRef.current) {
      setMessages(prev => [
        ...prev,
        {
          id: `ai-result-${Date.now()}`,
          sender: 'ai',
          text: '🎉 您的水杯专属商业商品图渲染完成！整体环境光影、水面质感和杯体反射已达到最佳摄影级水准。您可以通过卡片按钮保存高清图片！',
          timestamp: getNowTime(),
          type: 'result-card',
          meta: { result: generatedImage }
        }
      ]);
    }
    prevGenImageRef.current = generatedImage;
  }, [generatedImage]);

  // Free text message handler
  const handleSendMessage = () => {
    const text = inputValue.trim();
    if (!text) return;

    setInputValue('');

    // Append User text bubble
    setMessages(prev => [
      ...prev,
      {
        id: `user-msg-${Date.now()}`,
        sender: 'user',
        text,
        timestamp: getNowTime(),
      }
    ]);

    // Simulate smart keyword/intent agent analyzer
    setTimeout(() => {
      const lower = text.toLowerCase();
      
      // Check stop/abort intent
      const isStopRequest = lower.includes('停') || 
                            lower.includes('stop') || 
                            lower.includes('cancel') || 
                            lower.includes('取消') || 
                            lower.includes('终止') || 
                            lower.includes('别画') || 
                            lower.includes('不画') || 
                            lower.includes('别生') || 
                            lower.includes('不生') || 
                            lower.includes('中断');

      if (isStopRequest) {
        if (isGenerating) {
          handleAbort();
          setMessages(prev => [
            ...prev,
            {
              id: `ai-msg-abort-${Date.now()}`,
              sender: 'ai',
              text: '🛑 收到您的停止指令，我已立即为您终止当前的生图进程！如果您想调整细节或尝试其他风格，请随时告诉我。',
              timestamp: getNowTime(),
            }
          ]);
        } else {
          setMessages(prev => [
            ...prev,
            {
              id: `ai-msg-no-task-${Date.now()}`,
              sender: 'ai',
              text: '💡 当前没有正在运行的生图任务。您可以上传水杯图片并输入心仪的设计风格，我会随时帮您生成！',
              timestamp: getNowTime(),
            }
          ]);
        }
        return;
      }
      
      // Points check
      if (lower.includes('生') || lower.includes('开始') || lower.includes('渲染') || lower.includes('run') || lower.includes('generate')) {
        if (!sourceImage) {
          setMessages(prev => [
            ...prev,
            {
              id: `ai-msg-err-${Date.now()}`,
              sender: 'ai',
              text: '💡 请先在上方区域或专家模式中上传水杯图片，然后再发起生成指令。',
              timestamp: getNowTime(),
            }
          ]);
          return;
        }
        triggerGenerate();
        return;
      }

      // Check still life style keywords
      let matchedStyle: StyleItem | undefined;
      for (const style of stylesList) {
        if (lower.includes(style.name) || lower.includes(style.id)) {
          matchedStyle = style;
          break;
        }
      }

      if (matchedStyle) {
        setOptions((prev: any) => ({ ...prev, style: matchedStyle!.id, mode: 'still_life' }));
        setMessages(prev => [
          ...prev,
          {
            id: `ai-msg-ok-${Date.now()}`,
            sender: 'ai',
            text: `已为您定制画面为精致静物模式，并切换至：【${matchedStyle!.name}】风格。📸
接下来请上传产品原图，若已上传，即可点击开始生图。`,
            timestamp: getNowTime(),
            type: sourceImage ? 'generate-trigger' : 'upload-box',
          }
        ]);
        return;
      }

      // Check aspect ratio keywords
      let matchedRatio = '';
      if (lower.includes('1:1') || lower.includes('正方形') || lower.includes('方形')) matchedRatio = '1:1';
      else if (lower.includes('3:4') || lower.includes('竖屏')) matchedRatio = '3:4';
      else if (lower.includes('4:3') || lower.includes('横屏')) matchedRatio = '4:3';
      else if (lower.includes('9:16') || lower.includes('电商') || lower.includes('故事')) matchedRatio = '9:16';
      else if (lower.includes('16:9') || lower.includes('宽屏')) matchedRatio = '16:9';

      if (matchedRatio) {
        setOptions((prev: any) => ({ ...prev, aspectRatio: matchedRatio }));
        setMessages(prev => [
          ...prev,
          {
            id: `ai-msg-ratio-${Date.now()}`,
            sender: 'ai',
            text: `收到！已帮您将比例修改为 ${matchedRatio}。`,
            timestamp: getNowTime(),
          }
        ]);
        return;
      }

      // If no matching keywords, let it be treated as a Custom Prompt background setting!
      setOptions((prev: any) => {
        const nextMode = prev.mode || 'still_life';
        return { ...prev, style: text, mode: nextMode };
      });
      setMessages(prev => [
        ...prev,
        {
          id: `ai-msg-custom-${Date.now()}`,
          sender: 'ai',
          text: `✨ 侦测到您的自定义创意词：“${text}”。我已经将该描述词作为水杯背景生成的自定义风格！

当前配置：
• 🎯 画面模式: ${options.mode === 'portrait' ? '人像手持写真模式' : '精致静物模式'}
• 🎨 自定义风格描述: "${text}"
• 📐 生成比例: ${options.aspectRatio}

接下来，请确保您已上传产品原图，然后点击下方开始生图！`,
          timestamp: getNowTime(),
          type: sourceImage ? 'generate-trigger' : 'upload-box',
        }
      ]);
    }, 400);
  };

  const handleDownload = (imgUrl: string) => {
    const link = document.createElement('a');
    link.href = imgUrl;
    link.download = `智能体水杯商品图-${options.aspectRatio}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper inside upload
  const handleChatUploadClick = () => {
    fileInputRef.current?.click();
  };

  // Extra model traits options
  const [eth, setEth] = useState('asian');
  const [gen, setGen] = useState('female');
  const [age, setAge] = useState('young_adult');

  return (
    <div className="flex-1 flex flex-col bg-slate-50 overflow-hidden relative" ref={containerRef}>
      {/* Messages Stream */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6" style={{ maxHeight: 'calc(100vh - 160px)' }}>
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className={`flex gap-3.5 ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
            >
              {/* Avatar */}
              <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 shadow-sm text-sm font-bold
                ${msg.sender === 'user' 
                  ? 'bg-[#C5A069] text-white' 
                  : 'bg-black text-white'}`}
              >
                {msg.sender === 'user' ? 'U' : <Sparkles className="w-4 h-4 text-white" />}
              </div>

              {/* Message Content Container */}
              <div className="flex flex-col gap-1.5 max-w-xl">
                {/* Bubble */}
                <div className={`rounded-2xl px-4 py-3 shadow-sm text-[13px] leading-relaxed relative
                  ${msg.sender === 'user'
                    ? 'bg-[#C5A069] text-white rounded-tr-none'
                    : msg.type === 'error'
                      ? 'bg-red-50 border border-red-200 text-red-900 rounded-tl-none'
                      : 'bg-white border border-slate-100 text-slate-800 rounded-tl-none'}`}
                >
                  {/* Text */}
                  {msg.text && (
                    <div className="whitespace-pre-line font-medium">{msg.text}</div>
                  )}

                  {/* Attachment/Meta Preview */}
                  {msg.meta?.preview && (
                    <div className="mt-2 rounded-lg overflow-hidden border border-white/20 max-w-[180px]">
                      <img src={msg.meta.preview} alt="原图预览" className="w-full object-cover aspect-square" />
                    </div>
                  )}

                  {/* Interactive: Mode select */}
                  {msg.type === 'mode-select' && (
                    <div className="mt-4 grid grid-cols-2 gap-2.5">
                      <button
                        onClick={() => selectMode('still_life')}
                        className="p-3.5 bg-slate-50 hover:bg-[#FDF6ED] border border-slate-200 hover:border-[#C5A069] rounded-xl flex flex-col items-center gap-1.5 transition-all text-slate-700 hover:text-[#8C7B61] text-xs font-bold"
                      >
                        <ImageIcon className="w-5 h-5 text-slate-500 hover:text-[#C5A069]" />
                        精致静物陈列模式
                      </button>
                      <button
                        onClick={() => selectMode('portrait')}
                        className="p-3.5 bg-slate-50 hover:bg-[#FDF6ED] border border-slate-200 hover:border-[#C5A069] rounded-xl flex flex-col items-center gap-1.5 transition-all text-slate-700 hover:text-[#8C7B61] text-xs font-bold"
                      >
                        <User className="w-5 h-5 text-slate-500 hover:text-[#C5A069]" />
                        人像手持模特写真
                      </button>
                    </div>
                  )}

                  {/* Interactive: Still-life styles */}
                  {msg.type === 'style-select' && (
                    <div className="mt-4 grid grid-cols-2 gap-2 max-w-md">
                      {stylesList.map((st) => (
                        <button
                          key={st.id}
                          onClick={() => selectStyle(st.id)}
                          className="p-3 bg-slate-50 hover:bg-[#FDF6ED] border border-slate-200 hover:border-[#C5A069] rounded-xl text-left transition-all group flex flex-col gap-0.5"
                        >
                          <div className="text-[12px] font-bold text-slate-800 group-hover:text-[#8C7B61]">{st.name}</div>
                          <div className="text-[10px] text-slate-400 font-normal line-clamp-1">{st.desc}</div>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Interactive: Portrait attribute inputs */}
                  {msg.type === 'portrait-select' && (
                    <div className="mt-4 space-y-3 p-3.5 bg-slate-50 rounded-xl border border-slate-100 max-w-sm">
                      {/* Ethnicity */}
                      <div>
                        <div className="text-[10px] font-bold text-slate-500 mb-1.5">👤 模特肤色族裔:</div>
                        <div className="grid grid-cols-4 gap-1">
                          {[
                            { id: 'asian', name: '亚裔' },
                            { id: 'caucasian', name: '白人' },
                            { id: 'latino', name: '拉美' },
                            { id: 'african', name: '非裔' }
                          ].map(it => (
                            <button
                              key={it.id}
                              onClick={() => setEth(it.id)}
                              className={`py-1 text-[11px] rounded border transition-all ${eth === it.id ? 'bg-[#C5A069] border-[#C5A069] text-white font-bold' : 'bg-white border-slate-200 text-slate-600'}`}
                            >
                              {it.name}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Gender */}
                      <div>
                        <div className="text-[10px] font-bold text-slate-500 mb-1.5">🚻 模特性别:</div>
                        <div className="grid grid-cols-2 gap-1.5">
                          {[
                            { id: 'female', name: '女性' },
                            { id: 'male', name: '男性' }
                          ].map(it => (
                            <button
                              key={it.id}
                              onClick={() => setGen(it.id)}
                              className={`py-1.5 text-[11px] rounded border transition-all ${gen === it.id ? 'bg-[#C5A069] border-[#C5A069] text-white font-bold' : 'bg-white border-slate-200 text-slate-600'}`}
                            >
                              {it.name}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Age */}
                      <div>
                        <div className="text-[10px] font-bold text-slate-500 mb-1.5">📅 年龄段:</div>
                        <div className="grid grid-cols-3 gap-1">
                          {[
                            { id: 'young_adult', name: '青年' },
                            { id: 'middle_aged', name: '中年' },
                            { id: 'elderly', name: '成熟' }
                          ].map(it => (
                            <button
                              key={it.id}
                              onClick={() => setAge(it.id)}
                              className={`py-1 text-[11px] rounded border transition-all ${age === it.id ? 'bg-[#C5A069] border-[#C5A069] text-white font-bold' : 'bg-white border-slate-200 text-slate-600'}`}
                            >
                              {it.name}
                            </button>
                          ))}
                        </div>
                      </div>

                      <button
                        onClick={() => confirmPortrait(eth, gen, age)}
                        className="w-full py-2 bg-[#C5A069] text-white hover:bg-[#B4905A] rounded-lg text-xs font-bold transition-all shadow-sm mt-2 flex items-center justify-center gap-1"
                      >
                        确认特征并进入下一步 <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {/* Interactive: Mini product image upload-box */}
                  {msg.type === 'upload-box' && (
                    <div className="mt-3.5">
                      {sourceImage ? (
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center gap-3">
                          <img src={sourceImage} alt="已上传" className="w-12 h-12 rounded-lg object-contain bg-white border border-slate-100" />
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-bold text-slate-800 truncate">已上传原图</div>
                            <div className="text-[10px] text-[#C5A069] font-medium">随时可以开始渲染 🚀</div>
                          </div>
                          <button 
                            onClick={removeSourceImage}
                            className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-slate-100 transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div 
                          onClick={handleChatUploadClick}
                          className="bg-slate-50 hover:bg-[#FDF6ED] border-2 border-dashed border-slate-200 hover:border-[#C5A069] rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all group"
                        >
                          <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm text-slate-400 group-hover:text-[#C5A069] transition-all mb-2">
                            <Upload className="w-4 h-4" />
                          </div>
                          <div className="text-xs font-bold text-slate-800 mb-0.5">点击在此处上传产品图</div>
                          <div className="text-[10px] text-slate-400">支持拖拽图片入内</div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Interactive: One-click synthetic trigger */}
                  {msg.type === 'generate-trigger' && (
                    <div className="mt-4">
                      <button
                        onClick={triggerGenerate}
                        disabled={isGenerating}
                        className="w-full py-3 bg-[#C5A069] text-white hover:bg-[#B4905A] disabled:opacity-50 rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2"
                      >
                        <Sparkles className="w-4 h-4" />
                        🚀 立即开始一键生成商品图
                      </button>
                    </div>
                  )}

                  {/* Interactive: Final results display card */}
                  {msg.type === 'result-card' && msg.meta?.result && (
                    <div className="mt-4 bg-slate-50 border border-slate-200 rounded-xl overflow-hidden shadow-md max-w-sm">
                      <div className="relative group/res rounded-t-xl overflow-hidden aspect-square bg-white">
                        <img src={msg.meta.result} alt="最终渲染图" className="w-full h-full object-contain" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/res:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleDownload(msg.meta.result)}
                            className="p-2 bg-white text-slate-800 rounded-full hover:bg-slate-100 transition-all shadow"
                            title="保存到本地"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <div className="p-3.5 border-t border-slate-100 flex gap-2">
                        <button
                          onClick={() => handleDownload(msg.meta.result)}
                          className="flex-1 py-2 bg-[#C5A069] text-white hover:bg-[#B4905A] rounded-lg text-xs font-bold transition-all shadow flex items-center justify-center gap-1.5"
                        >
                          <Download className="w-3.5 h-3.5" /> 保存高清原图
                        </button>
                        <button
                          onClick={triggerGenerate}
                          className="py-2 px-3.5 bg-white border border-slate-200 hover:border-[#C5A069] text-slate-700 hover:text-[#8C7B61] rounded-lg text-xs font-semibold transition-all"
                        >
                          重新生成
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Timestamp */}
                <div className={`text-[9px] text-slate-400 font-normal px-1 ${msg.sender === 'user' ? 'text-right' : 'text-left'}`}>
                  {msg.timestamp}
                </div>
              </div>
            </motion.div>
          ))}

          {/* Typing Loading Indicator when generating */}
          {isGenerating && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-3.5"
            >
              <div className="w-9 h-9 rounded-full bg-black flex items-center justify-center shrink-0 shadow-sm text-sm font-bold">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div className="flex flex-col gap-1.5 max-w-xl">
                <div className="rounded-2xl rounded-tl-none bg-white border border-slate-100 shadow-sm px-4 py-3 text-[13px] text-slate-800 flex flex-col gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#C5A069] opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-[#C5A069]"></span>
                    </div>
                    <span className="font-medium animate-pulse text-slate-600">
                      正在合成创意商品图中，大概需要 10s 左右，请您稍候...
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-t border-dashed border-slate-100 pt-2 text-[11px] text-slate-400">
                    <span>提示：您可以输入“停止”或点击右侧按钮终止。</span>
                    <button
                      onClick={handleAbort}
                      className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-600 rounded-md border border-red-100 font-bold text-[10px] transition-colors"
                    >
                      停止生成
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={chatEndRef} />
      </div>

      {/* Chat Input Dock */}
      <div className="p-4 border-t border-slate-200 bg-white shadow-sm shrink-0 flex flex-col gap-2">
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 focus-within:border-[#C5A069] focus-within:ring-1 focus-within:ring-[#C5A069]/30 rounded-xl px-4 py-2.5 transition-all">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder="告诉智能体：『改成方形』、输入自定义背景如『一个绿草如茵的小草坡』或输入信息..."
            className="flex-1 bg-transparent border-none outline-none text-slate-800 placeholder-slate-400 text-xs py-1"
          />
          
          <button
            onClick={handleSendMessage}
            disabled={!inputValue.trim()}
            className="p-1.5 rounded-lg bg-[#C5A069] hover:bg-[#B4905A] text-white transition-all disabled:opacity-40 disabled:hover:bg-[#C5A069]"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
        
        {/* Helper Hint Toolbar */}
        <div className="flex items-center justify-between px-1 text-[10px] text-slate-400">
          <div className="flex items-center gap-1 select-none">
            <CornerDownLeft className="w-3 h-3 text-slate-300" />
            <span>按 Enter 发送消息</span>
          </div>
          <div className="flex items-center gap-2 select-none max-w-[70%] truncate">
            <span>当前配置：</span>
            <span className="font-bold text-slate-500 truncate">
              {options.mode === 'still_life' ? '静物' : '人像'} · {options.aspectRatio} · {options.imageSize} · 风格: {stylesList.find((s: any) => s.id === options.style)?.name || options.style || '默认'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
