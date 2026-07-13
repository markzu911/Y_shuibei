import React, { useState, useRef } from 'react';
import { Upload, Download, Maximize2, Loader2, Sparkles, Image as ImageIcon, X, Trash2, Eye, User, Laptop, Bot, Sliders, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import AgentMode from './components/AgentMode';

const STYLES = [
  { 
    id: 'desk', 
    name: '水下冰块激爽', 
    desc: '夏日清凉体验，冰块与清澈水底的透亮质感', 
    prompt: 'premium commercial product photography of the product submerged in crystal-clear water, surrounded by clean transparent ice cubes, delicate floating air bubbles, and soft water ripples under a studio spotlight, refreshing light blue gradient theme, extremely realistic, highly detailed',
    gradient: 'from-blue-300 to-blue-500' 
  },
  { 
    id: 'zen', 
    name: '禅意自然园林', 
    desc: '宁静的绿植、圆润的石子与明媚阳光的完美交织', 
    prompt: 'minimalist product photography, zen garden theme, the product stands on a smooth flat black river stone, surrounded by elegant green bamboo shoots, small white pebbles, soft warm sunlight filtering through leaves casting natural shadows, peaceful studio background, elegant clean composition',
    gradient: 'from-emerald-100 to-emerald-50' 
  },
  { 
    id: 'picnic', 
    name: '露营野餐时光', 
    desc: '原木餐桌，公园草坪的自然温暖气息', 
    prompt: 'lifestyle product photography, the product is placed on a light-colored natural wooden picnic table, soft green grassy lawn in the blurred background, warm natural morning sunlight filtering through trees, cozy inviting outdoor vibe, shallow depth of field',
    gradient: 'from-amber-100 to-amber-50' 
  },
  { 
    id: 'mist', 
    name: '雪山旷野自然', 
    desc: '清新旷野，高耸雪山与青翠苔藓的自然呼吸感', 
    prompt: 'epic outdoor adventure product photography, the product stands on a wet dark volcanic rock covered with green moss, majestic snow-capped mountain ranges and misty pine forests in the blurry atmospheric background, cool moody morning light, crisp clean air, professional adventure styling',
    gradient: 'from-sky-200 to-emerald-200' 
  },
  { id: 'wood', name: '山野露营时光', desc: '群山环绕的露营地，草坪与远处的帐篷，清新自然光，电影感', prompt: 'mountain camping, majestic green mountain ranges with rocky ridges under blue sky with soft white clouds, green grassy meadow covered ground with small purple wild flowers, a large detailed tree trunk on the left with a light green triangle camping tent nearby, a person sitting on a camp chair in front of the tent, another person in a blue shirt sitting on the right side, the product stands on a circular rustic wooden tree stump in the middle, hanging green leaves and tree branches framing the top of the image, clear natural sunlight, warm morning glow, cinematic photorealism, shot on 85mm lens, f/1.8, shallow depth of field, blurry background', gradient: 'from-orange-200 to-green-100' },
  { id: 'sunset', name: '田园野餐时光', desc: '原木蛋卷桌、天然藤编篮与清晨阳光草坪的清新野餐感', prompt: 'fresh natural picnic style commercial product photography, medium shot. The product is placed securely in the center on a foldable wooden roll-top picnic egg-roll table with cream-colored legs. On the left side of the product, there is a natural woven rattan basket filled with high-quality Indian turmeric, Ceylon cinnamon, and green apples with a natural sheen. On the right side of the product, half a cut high-quality Indian turmeric showing an irregular orange-red cut surface with clear flesh texture is placed. Very shallow depth of field, with a sunny, completely blurred green grass lawn in the background. On the lawn background, a picnic basket, a flower bouquet containing sunflowers and roses, and some Ceylon cinnamon sticks are softly out of focus. Bright natural diffuse light casting soft shadows of the product and props on the wooden tabletop. The product has a delicate texture, the woven rattan basket has crisp detail, and the fruits look fresh. The color palette consists of soft cream, light blue, pink, grass green, and warm yellow, creating a fresh, pleasant atmosphere with natural light diffusion. Impeccable professional styling, props are balanced around the central product to create a perfect outdoor picnic scene', gradient: 'from-amber-100 to-green-100' },
];

const ASPECT_RATIOS = [
  { value: '1:1', label: '1:1 (正方形)' },
  { value: '3:4', label: '3:4 (社交竖屏)' },
  { value: '4:3', label: '4:3 (经典横屏)' },
  { value: '9:16', label: '9:16 (电商故事)' },
  { value: '16:9', label: '16:9 (电影宽屏)' },
];

const RESOLUTIONS = [
  { value: '1K', label: '1K (1080P 标准清晰)' },
  { value: '2K', label: '2K (1440P 高清细腻)' },
  { value: '4K', label: '4K (2160P 极高清商品级)' },
];

export default function App() {
  const [sourceImage, setSourceImage] = useState<string | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [lastGeneratedAt, setLastGeneratedAt] = useState<string | null>(null);
  const [activeMode, setActiveMode] = useState<'agent' | 'expert' | null>(null);

  // SaaS Integration States
  const [userId, setUserId] = useState('test_user');
  const [toolId, setUserIdTool] = useState('test_tool');
  const [userIntegral, setUserIntegral] = useState<number | null>(null);
  const [requiredIntegral, setRequiredIntegral] = useState(10);
  const [endpoints, setEndpoints] = useState({
    launch: '/api/tool/launch',
    verify: '/api/tool/verify',
    consume: '/api/tool/consume',
    uploadToken: '/api/upload/direct-token',
    uploadCommit: '/api/upload/commit',
  });
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Listen to parent postMessage for SAAS_INIT parameters
  React.useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const data = event.data;
      if (data && data.type === 'SAAS_INIT') {
        console.log('Received SAAS_INIT:', data);
        if (data.userId && data.userId !== "null" && data.userId !== "undefined") {
          setUserId(data.userId);
        }
        if (data.toolId && data.toolId !== "null" && data.toolId !== "undefined") {
          setUserIdTool(data.toolId);
        }
        setEndpoints({
          launch: data.launchUrl || '/api/tool/launch',
          verify: data.verifyUrl || '/api/tool/verify',
          consume: data.consumeUrl || data.callbackUrl || '/api/tool/consume',
          uploadToken: data.uploadTokenUrl || '/api/upload/direct-token',
          uploadCommit: data.uploadCommitUrl || '/api/upload/commit',
        });
      }
    };
    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  // Fetch initial user points & tool costs on launch or when userId/endpoints change
  React.useEffect(() => {
    const fetchPoints = async () => {
      try {
        const response = await fetch(endpoints.launch, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, toolId }),
        });
        const resData = await response.json();
        if (resData.success && resData.data) {
          if (resData.data.user) {
            setUserIntegral(resData.data.user.integral);
          }
          if (resData.data.tool) {
            setRequiredIntegral(resData.data.tool.integral || 10);
          }
        }
      } catch (e) {
        console.error('获取初始积分失败:', e);
      }
    };
    fetchPoints();
  }, [userId, toolId, endpoints.launch]);

  const [options, setOptions] = useState({
    style: STYLES[0].id,
    aspectRatio: '1:1',
    imageSize: '2K',
    mode: 'still_life',
    portraitEthnicity: 'asian',
    portraitGender: 'female',
    portraitAge: 'young_adult',
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const handleAbort = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsGenerating(false);
    setStatusMessage('生图已手动终止');
    setError('生图操作已被手动停止。');
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('请选择有效的图片文件 (PNG 或 JPG)。');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setSourceImage(event.target?.result as string);
      setGeneratedImage(null);
      setLastGeneratedAt(null);
      setError(null);
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handleGenerate = async (customOptions?: typeof options, customSourceImage?: string | null) => {
    const activeImage = customSourceImage !== undefined ? customSourceImage : sourceImage;
    if (!activeImage) return;

    const activeOptions = customOptions || options;

    setIsGenerating(true);
    setError(null);
    setStatusMessage('正在准备生成环境，请稍候...');

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      // Step 1: 检查积分是否充足
      const verifyResponse = await fetch(endpoints.verify, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, toolId }),
        signal: controller.signal,
      });
      const verifyData = await verifyResponse.json();
      if (!verifyResponse.ok || !verifyData.success) {
        const rawMsg = verifyData.message || '';
        const isPointsErr = rawMsg.includes('积分') || rawMsg.includes('余额') || rawMsg.includes('点数') || rawMsg.includes('不足') || rawMsg.includes('充值');
        const cleanMsg = isPointsErr ? '当前您的账户特权或服务级别受限，请在主站个人中心核对服务状态后重试。' : (rawMsg || '当前您的账户特权或服务级别受限，请在主站个人中心核对服务状态后重试。');
        throw new Error(cleanMsg);
      }

      setStatusMessage('正在合成商品图，请稍候...');

      // Step 2: 调用 Gemini API 生图
      const selectedStyle = STYLES.find(s => s.id === activeOptions.style);
      let stylePrompt = '';

      if (activeOptions.mode === 'portrait') {
        let ethnicityText = '';
        if (activeOptions.portraitEthnicity === 'asian') ethnicityText = 'Asian';
        else if (activeOptions.portraitEthnicity === 'caucasian') ethnicityText = 'Caucasian';
        else if (activeOptions.portraitEthnicity === 'latino') ethnicityText = 'Hispanic/Latino';
        else if (activeOptions.portraitEthnicity === 'african') ethnicityText = 'Black/African-American';

        let ageText = '';
        if (activeOptions.portraitAge === 'young_adult') ageText = 'young (around 20-30 years old)';
        else if (activeOptions.portraitAge === 'middle_aged') ageText = 'mature (around 35-45 years old)';
        else if (activeOptions.portraitAge === 'elderly') ageText = 'older adult (around 50-60 years old)';

        let genderText = '';
        let apparelText = '';
        let facialFeatures = '';
        
        if (activeOptions.portraitGender === 'female') {
          genderText = 'woman';
          apparelText = 'clean stylish athletic activewear or modern smart casual clothing';
          facialFeatures = 'gorgeous, smiling beautifully and warmly with a radiant, friendly and natural expression';
        } else {
          genderText = 'man';
          apparelText = 'clean stylish athletic activewear or modern smart casual clothing';
          facialFeatures = 'handsome, smiling beautifully and warmly with a radiant, friendly and natural expression';
        }

        const backgroundScene = selectedStyle 
          ? 'Set outdoors on a bright sunny day with a beautiful, softly blurred high-end commercial backdrop' 
          : `Background setting: ${activeOptions.style}`;

        stylePrompt = `high-end commercial lifestyle product photography of a ${facialFeatures} ${ethnicityText} ${genderText}, ${ageText}, wearing ${apparelText}. ${backgroundScene}. The model is holding the product prominent and close-up in the foreground towards the camera. The product is beautifully presented, perfectly crisp and sharp with clear labels and details, showing a premium, vibrant healthy lifestyle vibe. Professional portrait 85mm lens, f/2.0, clean natural sunlight, shallow depth of field, stunning soft background blur, professional commercial styling. The product remains the absolute central focus, with realistic soft shadows on the model's hand and a seamless blend.`;
      } else {
        stylePrompt = `${selectedStyle ? (selectedStyle.prompt || selectedStyle.name) : activeOptions.style}, focus only on the product itself, preserve its brand labels, shape, and colors perfectly, ignore any hands, background elements, or unrelated objects in the uploaded image`;
      }

      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gemini-3.1-flash-image',
          payload: {
            imageUri: activeImage,
            style: stylePrompt,
            aspectRatio: activeOptions.aspectRatio,
            imageSize: activeOptions.imageSize,
          },
        }),
        signal: controller.signal,
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || '生成商品图失败，请稍后重试');
      }

      setStatusMessage('正在进行后期渲染优化...');

      // Step 3: 扣除积分
      const consumeResponse = await fetch(endpoints.consume, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, toolId }),
        signal: controller.signal,
      });
      const consumeData = await consumeResponse.json();
      if (consumeData.success && consumeData.data) {
        setUserIntegral(consumeData.data.currentIntegral);
      }

      setStatusMessage('正在上传保存生成的商品图...');

      // Step 4: 上传生成的图片到服务器存储 (只上传生成的图片)
      try {
        const base64ToBlob = (base64: string, type: string) => {
          const byteString = atob(base64.split(',')[1]);
          const ab = new ArrayBuffer(byteString.length);
          const ia = new Uint8Array(ab);
          for (let i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i);
          }
          return new Blob([ab], { type });
        };
        
        const match = data.imageUrl.match(/^data:(image\/\w+);base64,/);
        const mimeType = match ? match[1] : 'image/png';
        const blob = base64ToBlob(data.imageUrl, mimeType);

        // A. 获取图片直传签名 (upload/direct-token)
        const tokenResponse = await fetch(endpoints.uploadToken, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            toolId,
            source: 'result',
            fileName: `result_${Date.now()}.png`,
            mimeType,
            fileSize: blob.size,
          }),
          signal: controller.signal,
        });
        const tokenData = await tokenResponse.json();
        
        if (tokenResponse.ok && tokenData.success) {
          const uploadUrl = tokenData.uploadUrl || tokenData.proxyUploadUrl;
          
          // B. 浏览器直传二进制数据
          const uploadRes = await fetch(uploadUrl, {
            method: tokenData.method || 'PUT',
            headers: {
              ...tokenData.headers,
              'Content-Type': mimeType,
            },
            body: blob,
            signal: controller.signal,
          });

          if (uploadRes.ok) {
            // C. 直传结果图入库
            const commitResponse = await fetch(endpoints.uploadCommit, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId,
                toolId,
                source: 'result',
                objectKey: tokenData.objectKey,
                fileSize: blob.size,
              }),
              signal: controller.signal,
            });
            const commitData = await commitResponse.json();
            console.log('直传图入库提交成功:', commitData);
          } else {
            console.error('图片直传 OSS 失败');
          }
        } else {
          console.error('获取上传 Token 失败');
        }
      } catch (uploadErr) {
        console.error('结果图上传到主站失败:', uploadErr);
        // We do not fail the whole generation if upload failed, but log it
      }

      setGeneratedImage(data.imageUrl);
      setLastGeneratedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    } catch (err: any) {
      if (err.name === 'AbortError' || controller.signal.aborted) {
        console.log('生图操作已手动中止');
        return;
      }
      setError(err.message);
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
      setIsGenerating(false);
      setStatusMessage(null);
    }
  };

  const handleDownload = () => {
    if (!generatedImage) return;
    const link = document.createElement('a');
    link.href = generatedImage;
    const selectedStyle = STYLES.find(s => s.id === options.style)?.id || 'custom';
    link.download = `商品图-${selectedStyle}-${options.aspectRatio}-${options.imageSize}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const removeSourceImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSourceImage(null);
    setGeneratedImage(null);
    setLastGeneratedAt(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (activeMode === null) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6 md:p-12 relative overflow-y-auto">
        {/* Decorative background gradients */}
        <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#FDF6ED] rounded-full blur-3xl opacity-60 pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 bg-blue-50 rounded-full blur-3xl opacity-40 pointer-events-none" />
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="max-w-4xl w-full z-10 flex flex-col items-center"
        >
          {/* Heading */}
          <h1 className="text-3xl md:text-5xl font-extrabold text-slate-900 tracking-tight text-center mb-4 leading-tight">
            开启您的 AI 智能水杯生图之旅
          </h1>
          
          {/* Subtitle */}
          <p className="text-sm md:text-base text-slate-500 text-center max-w-2xl mb-12 leading-relaxed">
            无论您是希望得到贴心的智能设计助理引导，还是渴望在全功能的专业面板上精细调校，我们都为您提供了专属的使用方案。
          </p>

          {/* Two Options */}
          <div className="grid md:grid-cols-2 gap-6 w-full max-w-3xl">
            {/* Agent Mode Card */}
            <motion.div 
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
              className="bg-white border border-slate-100 rounded-3xl p-8 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-600 border border-slate-100">
                    <Bot className="w-5 h-5 text-[#C5A069]" />
                  </div>
                  <span className="bg-emerald-50 text-emerald-600 text-[10px] font-bold px-2.5 py-1 rounded-full border border-emerald-100">
                    推荐新手
                  </span>
                </div>
                
                <h3 className="text-xl font-bold text-slate-900 mb-3">智能体模式</h3>
                <p className="text-slate-500 text-xs leading-relaxed mb-8">
                  对话式交互，像和专业设计师聊天一样。AI 将一步步引导您选择参考图、设定风格，直接在聊天框内返回生成效果。
                </p>
              </div>
              
              <button
                onClick={() => setActiveMode('agent')}
                className="w-full py-3.5 bg-[#5F6352] hover:bg-[#4E5143] text-white rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-sm"
              >
                <Bot className="w-4 h-4" />
                开启智能对话引导
              </button>
            </motion.div>

            {/* Expert Mode Card */}
            <motion.div 
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
              className="bg-white border border-slate-100 rounded-3xl p-8 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-600 border border-slate-100">
                    <Sliders className="w-5 h-5 text-[#8C7B61]" />
                  </div>
                  <span className="bg-amber-50 text-amber-600 text-[10px] font-bold px-2.5 py-1 rounded-full border border-amber-100">
                    高阶微调
                  </span>
                </div>
                
                <h3 className="text-xl font-bold text-slate-900 mb-3">专家工作台</h3>
                <p className="text-slate-500 text-xs leading-relaxed mb-8">
                  经典分步流程。提供高可控性的输出设置、画面比例调节，支持高清原图下载及多视角一次性生成。
                </p>
              </div>
              
              <button
                onClick={() => setActiveMode('expert')}
                className="w-full py-3.5 bg-[#F1F3F5] hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2"
              >
                <Laptop className="w-4 h-4" />
                进入专家工作台
              </button>
            </motion.div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-[#F8FAFC] text-slate-800 font-sans overflow-hidden">
      {/* Header */}
      <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveMode(null)}
            className="flex items-center justify-center p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-500 hover:text-slate-800"
            title="返回首页"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span className="text-base font-bold text-slate-900">智能水杯商品生图</span>
        </div>

        {/* Dual Mode Switcher */}
        <div className="flex bg-slate-100 p-1 rounded-full border border-slate-200 shadow-inner">
          <button
            onClick={() => setActiveMode('agent')}
            className={`flex items-center gap-1.5 px-5 py-1.5 rounded-full text-xs font-bold transition-all duration-200
              ${activeMode === 'agent'
                ? 'bg-white text-[#C5A069] shadow-sm'
                : 'text-slate-600 hover:text-slate-900'}`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            智能体模式
          </button>
          <button
            onClick={() => setActiveMode('expert')}
            className={`flex items-center gap-1.5 px-5 py-1.5 rounded-full text-xs font-bold transition-all duration-200
              ${activeMode === 'expert'
                ? 'bg-white text-[#8C7B61] shadow-sm'
                : 'text-slate-600 hover:text-slate-900'}`}
          >
            <Laptop className="w-3.5 h-3.5" />
            专家模式
          </button>
        </div>

        <div className="flex items-center gap-3">
          {/* 剩余积分展示 */}
          <div id="points-display-badge" className="flex items-center gap-2 bg-[#FDF6ED] px-3.5 py-1.5 rounded-full border border-[#FDECD4] shadow-sm select-none">
            <span className="text-xs font-semibold text-[#8C7B61]">💎 剩余积分:</span>
            <span className="text-xs font-black text-[#C5A069]">
              {userIntegral !== null ? `${userIntegral} 积分` : '加载中...'}
            </span>
          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 flex overflow-hidden">
        {activeMode === 'agent' ? (
          <div className="flex-1 max-w-5xl mx-auto w-full h-full flex flex-col bg-white border-x border-slate-200">
            <AgentMode
              sourceImage={sourceImage}
              setSourceImage={setSourceImage}
              generatedImage={generatedImage}
              setGeneratedImage={setGeneratedImage}
              isGenerating={isGenerating}
              options={options}
              setOptions={setOptions}
              userIntegral={userIntegral}
              requiredIntegral={requiredIntegral}
              handleGenerate={handleGenerate}
              stylesList={STYLES}
              aspectRatios={ASPECT_RATIOS}
              resolutions={RESOLUTIONS}
              fileInputRef={fileInputRef}
              processFile={processFile}
              removeSourceImage={removeSourceImage}
              handleAbort={handleAbort}
            />
          </div>
        ) : (
          <>
            {/* Sidebar Controls */}
            <aside className="w-80 bg-[#FCFBF8] border-r border-slate-200 flex flex-col shrink-0 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-5 space-y-8">
                
                {/* 1. Upload Section */}
                <section>
                  <label className="text-[12px] font-bold text-slate-900 block mb-3 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#E5E0D8] text-[#8C7B61] flex items-center justify-center text-[10px]">1</span> 产品图片
                  </label>
                  
                  <div 
                    onClick={() => !sourceImage && fileInputRef.current?.click()}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`relative rounded-xl border border-dashed flex flex-col items-center justify-center cursor-pointer transition-all duration-200 p-4 aspect-video
                      ${isDragging ? 'border-[#C5A069] bg-[#FDF6ED]' : ''}
                      ${sourceImage ? 'border-transparent bg-white shadow-sm' : 'border-[#E5E0D8] bg-white hover:border-[#C5A069] hover:bg-[#FDF6ED]/50'}`}
                  >
                    {sourceImage ? (
                      <div className="relative w-full h-full group/image">
                        <img 
                          src={sourceImage} 
                          alt="原图" 
                          className="w-full h-full object-contain rounded-lg" 
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/image:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
                          <button 
                            onClick={removeSourceImage}
                            className="p-2 bg-white/20 text-white rounded-full hover:bg-white/30 transition-colors"
                            title="删除"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center flex flex-col items-center p-2">
                        <div className="w-8 h-8 rounded-lg bg-[#FDF6ED] flex items-center justify-center mb-2 text-[#C5A069]">
                          <ImageIcon className="w-4 h-4" />
                        </div>
                        <span className="text-xs font-medium text-slate-700">点击上传或拖拽图片到此处</span>
                        <span className="text-[10px] text-slate-400 mt-1">支持 JPG / PNG，建议尺寸 1:1</span>
                      </div>
                    )}
                    
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleFileChange} 
                      accept="image/*" 
                      className="hidden" 
                    />
                  </div>
                </section>

                {/* 2. Generation Mode */}
                <section>
                  <label className="text-[12px] font-bold text-slate-900 block mb-3 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#E5E0D8] text-[#8C7B61] flex items-center justify-center text-[10px]">2</span> 画面生成模式 <span className="text-[10px] font-normal text-slate-500">选择摆拍或人像写真</span>
                  </label>
                  
                  <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-lg">
                    <button
                      type="button"
                      id="still-life-mode-btn"
                      onClick={() => setOptions({ ...options, mode: 'still_life' })}
                      className={`py-2 px-2 rounded-md text-[11px] font-medium text-center transition-all duration-200 flex items-center justify-center gap-1.5
                        ${options.mode === 'still_life' 
                          ? 'bg-white text-[#8C7B61] shadow-sm font-bold' 
                          : 'text-slate-600 hover:text-slate-900'}`}
                    >
                      <ImageIcon className="w-3.5 h-3.5" />
                      静物图模式
                    </button>
                    <button
                      type="button"
                      id="portrait-mode-btn"
                      onClick={() => setOptions({ ...options, mode: 'portrait' })}
                      className={`py-2 px-2 rounded-md text-[11px] font-medium text-center transition-all duration-200 flex items-center justify-center gap-1.5
                        ${options.mode === 'portrait' 
                          ? 'bg-white text-[#C5A069] shadow-sm font-bold' 
                          : 'text-slate-600 hover:text-slate-900'}`}
                    >
                      <User className="w-3.5 h-3.5" />
                      人像模式
                    </button>
                  </div>
                  
                  {/* Contextual description */}
                  <div className="mt-2.5 px-3 py-2 bg-white/50 border border-slate-100 rounded-lg text-[10px] text-slate-500 leading-relaxed shadow-sm">
                    {options.mode === 'still_life' ? (
                      <span>📸 <strong>静物图模式</strong>：聚焦于水杯本身的商业陈列与摆拍，完美展现材质、色彩与场景微观细节。</span>
                    ) : (
                      <span className="text-[#8C7B61]">
                        ✨ <strong>人像模式</strong>：已启用模特手持写真展示。当前配置：
                        <strong>
                          {options.portraitEthnicity === 'asian' && ' 亚裔'}
                          {options.portraitEthnicity === 'caucasian' && ' 白人'}
                          {options.portraitEthnicity === 'latino' && ' 拉美裔'}
                          {options.portraitEthnicity === 'african' && ' 非裔'}
                          ·
                          {options.portraitGender === 'female' ? '女生' : '男生'}
                          ·
                          {options.portraitAge === 'young_adult' && '青年 (20-30岁)'}
                          {options.portraitAge === 'middle_aged' && '中年 (35-45岁)'}
                          {options.portraitAge === 'elderly' && '成熟 (50-60岁)'}
                        </strong>
                        ，完美演绎真实时尚生活方式。
                      </span>
                    )}
                  </div>
                </section>

                {/* 3. Style Selection (Still Life) or Model attributes (Portrait) */}
                {options.mode === 'still_life' ? (
                  <section>
                    <label className="text-[12px] font-bold text-slate-900 block mb-3 flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-[#E5E0D8] text-[#8C7B61] flex items-center justify-center text-[10px]">3</span> 背景风格 <span className="text-[10px] font-normal text-slate-500">选择您喜欢的场景风格</span>
                    </label>
                    
                    <div className="grid grid-cols-2 gap-2">
                      {STYLES.map((style) => (
                        <button
                          key={style.id}
                          id={`style-btn-${style.id}`}
                          onClick={() => setOptions({ ...options, style: style.id })}
                          className={`py-3 px-3 rounded-lg text-[11px] font-medium text-center transition-all duration-200 border flex flex-col items-center gap-1.5
                            ${options.style === style.id 
                              ? 'border-[#C5A069] bg-[#FDF6ED] text-[#8C7B61]' 
                              : 'border-[#E5E0D8] bg-white text-slate-700 hover:border-[#C5A069]'}`}
                        >
                          <Sparkles className="w-4 h-4" />
                          {style.name}
                        </button>
                      ))}
                    </div>
                  </section>
                ) : (
                  <section className="space-y-4">
                    <label className="text-[12px] font-bold text-slate-900 block flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-[#E5E0D8] text-[#8C7B61] flex items-center justify-center text-[10px]">3</span> 模特属性定制 <span className="text-[10px] font-normal text-slate-500">定制人像模特的外观特征</span>
                    </label>

                    {/* Ethnicity Selection */}
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold text-slate-500 block">👤 肤色族裔 (Ethnicity)</span>
                      <div className="grid grid-cols-4 gap-1.5">
                        {[
                          { id: 'asian', name: '亚裔', desc: 'Asian' },
                          { id: 'caucasian', name: '白人', desc: 'Caucasian' },
                          { id: 'latino', name: '拉美裔', desc: 'Latino' },
                          { id: 'african', name: '非裔', desc: 'African' },
                        ].map((ethnicity) => (
                          <button
                            type="button"
                            key={ethnicity.id}
                            id={`ethnicity-btn-${ethnicity.id}`}
                            onClick={() => setOptions({ ...options, portraitEthnicity: ethnicity.id })}
                            className={`py-2 px-1 rounded-lg text-[11px] font-medium text-center transition-all duration-200 border flex flex-col items-center justify-center gap-0.5
                              ${options.portraitEthnicity === ethnicity.id 
                                ? 'border-[#C5A069] bg-[#FDF6ED] text-[#8C7B61] font-bold shadow-sm' 
                                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}
                          >
                            <span>{ethnicity.name}</span>
                            <span className="text-[9px] text-slate-400 font-normal">{ethnicity.desc}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Gender Selection */}
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold text-slate-500 block">🚻 模特性别 (Gender)</span>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { id: 'female', name: '女生', desc: 'Female' },
                          { id: 'male', name: '男生', desc: 'Male' },
                        ].map((gender) => (
                          <button
                            type="button"
                            key={gender.id}
                            id={`gender-btn-${gender.id}`}
                            onClick={() => setOptions({ ...options, portraitGender: gender.id })}
                            className={`py-2 px-3 rounded-lg text-[11px] font-medium text-center transition-all duration-200 border flex items-center justify-center gap-2
                              ${options.portraitGender === gender.id 
                                ? 'border-[#C5A069] bg-[#FDF6ED] text-[#8C7B61] font-bold shadow-sm' 
                                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}
                          >
                            <User className="w-3.5 h-3.5" />
                            <div className="flex flex-col items-start leading-none text-left">
                              <span>{gender.name}</span>
                              <span className="text-[8px] text-slate-400 font-normal mt-0.5">{gender.desc}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Age Group Selection */}
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold text-slate-500 block">📅 年龄段 (Age Group)</span>
                      <div className="grid grid-cols-3 gap-1.5">
                        {[
                          { id: 'young_adult', name: '青年', desc: '20-30岁' },
                          { id: 'middle_aged', name: '中年', desc: '35-45岁' },
                          { id: 'elderly', name: '成熟', desc: '50-60岁' },
                        ].map((age) => (
                          <button
                            type="button"
                            key={age.id}
                            id={`age-btn-${age.id}`}
                            onClick={() => setOptions({ ...options, portraitAge: age.id })}
                            className={`py-2 px-1 rounded-lg text-[11px] font-medium text-center transition-all duration-200 border flex flex-col items-center justify-center gap-0.5
                              ${options.portraitAge === age.id 
                                ? 'border-[#C5A069] bg-[#FDF6ED] text-[#8C7B61] font-bold shadow-sm' 
                                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}
                          >
                            <span>{age.name}</span>
                            <span className="text-[9px] text-slate-400 font-normal">{age.desc}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </section>
                )}

                {/* Custom Background Prompt Input */}
                <section className="bg-[#FAF8F5] border border-[#E5E0D8] p-4 rounded-xl space-y-2.5">
                  <label className="text-[12px] font-bold text-slate-900 block flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-slate-800">
                      ✍️ 自定义背景创意描述
                    </span>
                    <span className="text-[9px] bg-[#C5A069]/10 text-[#C5A069] px-1.5 py-0.5 rounded font-bold">手动输入</span>
                  </label>
                  <textarea
                    value={STYLES.some(s => s.id === options.style) ? '' : options.style}
                    onChange={(e) => {
                      const val = e.target.value;
                      setOptions({ ...options, style: val || STYLES[0].id });
                    }}
                    placeholder={
                      options.mode === 'still_life' 
                        ? "例如：一个粉色的桌子，上面有一朵精致的玫瑰花，柔和下午阳光" 
                        : "例如：站在一个巴黎市中心的咖啡馆前，手持水杯，柔和下午阳光"
                    }
                    className="w-full p-2.5 bg-white border border-[#E5E0D8] focus:border-[#C5A069] focus:ring-1 focus:ring-[#C5A069]/30 rounded-lg text-xs placeholder-slate-400 outline-none resize-none h-18 shadow-inner"
                  />
                  {!STYLES.some(s => s.id === options.style) && options.style ? (
                    <div className="flex items-center justify-between text-[10px] text-[#8C7B61] bg-[#FDF6ED] px-2.5 py-1 rounded-md border border-[#FDECD4]">
                      <span className="truncate max-w-[185px]">已启用自定义风格: "{options.style}"</span>
                      <button 
                        type="button"
                        onClick={() => setOptions({ ...options, style: STYLES[0].id })}
                        className="font-bold text-[#C5A069] hover:text-[#4E5143] transition-colors shrink-0"
                      >
                        恢复预设
                      </button>
                    </div>
                  ) : (
                    <p className="text-[9px] text-slate-400 leading-normal">
                      提示：如果您希望摆脱预设背景风格，直接在此处输入任何自定义生图背景！生图将完全按照您的手写风格生成。
                    </p>
                  )}
                </section>

                {/* 4. Aspect Ratio */}
                <section>
                  <label className="text-[12px] font-bold text-slate-900 block mb-3 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#E5E0D8] text-[#8C7B61] flex items-center justify-center text-[10px]">
                      {options.mode === 'still_life' ? '4' : '3'}
                    </span>
                    选择图片生成比例
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {ASPECT_RATIOS.map((ratio) => (
                      <button
                        key={ratio.value}
                        id={`ratio-btn-${ratio.value.replace(':', '-')}`}
                        onClick={() => setOptions({ ...options, aspectRatio: ratio.value })}
                        className={`py-2 px-1 rounded-lg text-[11px] font-medium transition-all border
                          ${options.aspectRatio === ratio.value
                            ? 'border-[#C5A069] bg-[#C5A069] text-white'
                            : 'border-slate-200 bg-white hover:border-[#C5A069]'}`}
                      >
                        {ratio.value} {ratio.value === '1:1' ? '方形' : ''}
                      </button>
                    ))}
                  </div>
                </section>

                {/* 5. Resolution */}
                <section>
                  <label className="text-[12px] font-bold text-slate-900 block mb-3 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#E5E0D8] text-[#8C7B61] flex items-center justify-center text-[10px]">
                      {options.mode === 'still_life' ? '5' : '4'}
                    </span>
                    图片清晰度
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {RESOLUTIONS.map((res) => (
                      <button
                        key={res.value}
                        onClick={() => setOptions({ ...options, imageSize: res.value })}
                        className={`py-2 px-1 rounded-lg text-[11px] font-medium transition-all border
                          ${options.imageSize === res.value
                            ? 'border-[#C5A069] bg-[#C5A069] text-white'
                            : 'border-slate-200 bg-white hover:border-[#C5A069]'}`}
                      >
                        {res.value}
                      </button>
                    ))}
                  </div>
                </section>

              </div>

              {/* Start Generation Button */}
              <div className="p-5 border-t border-slate-200">
                <button
                  onClick={() => handleGenerate()}
                  disabled={!sourceImage || isGenerating}
                  className="w-full py-3 bg-[#C5A069] text-white rounded-lg font-bold text-sm hover:bg-[#B4905A] disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  开始生成
                </button>
              </div>
            </aside>

            {/* Right Pane */}
            <section className="flex-1 flex flex-col bg-slate-50 relative">
              {/* Top Bar */}
              <div className="h-16 flex items-center justify-between px-6 border-b border-slate-200 bg-white">
                <button className="p-2 hover:bg-slate-100 rounded-full">
                  <Loader2 className="w-4 h-4 text-slate-500 rotate-180" />
                </button>
                {/* Top Bar Right Actions */}
                <div className="flex items-center gap-2">
                </div>
              </div>

              {error && (
                <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 text-sm flex items-start gap-2.5 shadow-sm">
                  <span className="text-base leading-none">⚠️</span>
                  <div className="flex-1">
                    <p className="font-bold mb-1">操作失败</p>
                    <p className="text-red-700 leading-relaxed text-xs">{error}</p>
                  </div>
                  <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 font-bold text-xs shrink-0 ml-2">
                    关闭
                  </button>
                </div>
              )}

              {/* Center Image Canvas */}
              <div className="flex-1 p-6 flex flex-col items-center justify-center">
                {isGenerating ? (
                  <div className="w-full h-full flex flex-col items-center justify-center p-8">
                    <Loader2 className="w-12 h-12 text-[#C5A069] animate-spin mb-4" />
                    <p className="text-slate-600 font-medium mb-4">{statusMessage || '智能合成中，请稍候...'}</p>
                    <button
                      onClick={handleAbort}
                      className="px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 rounded-lg text-xs font-semibold transition-all border border-red-200 shadow-sm"
                    >
                      停止生成
                    </button>
                  </div>
                ) : generatedImage ? (
                  <div className="w-full max-w-2xl flex-1 flex flex-col items-center justify-center p-8 min-h-0">
                    <img 
                      src={generatedImage} 
                      alt="生成的最终商品图" 
                      className="max-w-full max-h-full object-contain rounded-2xl shadow-sm"
                    />
                    <button 
                      onClick={handleDownload}
                      className="mt-6 flex items-center gap-2 bg-[#C5A069] hover:bg-[#B4905A] text-white px-6 py-2.5 rounded-lg font-bold text-sm shadow-md transition-all active:scale-95"
                    >
                      <Download className="w-4 h-4" />
                      保存高清图
                    </button>
                  </div>
                ) : (
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full max-w-2xl bg-white rounded-2xl border-2 border-dashed border-slate-200 hover:border-[#C5A069] flex flex-col items-center justify-center p-16 text-center cursor-pointer transition-all duration-200 group"
                  >
                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6 text-slate-400 group-hover:bg-[#FDF6ED] group-hover:text-[#C5A069] transition-all">
                      <ImageIcon className="w-8 h-8" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-[#C5A069] transition-colors">上传参考图开始创作</h3>
                    <p className="text-slate-500 mb-6 max-w-sm">上传水杯产品图片，AI 为你生成个性化商品图</p>
                    <p className="text-slate-400 text-sm">拖拽图片到此处，或点击本区域选择文件</p>
                  </div>
                )}
              </div>
            </section>
          </>
        )}
      </main>

      {/* Fullscreen Preview Modal */}
      <AnimatePresence>
        {isPreviewOpen && generatedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4"
          >
            <button 
              onClick={() => setIsPreviewOpen(false)}
              className="absolute top-6 right-6 p-2.5 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-all backdrop-blur"
              title="关闭全屏预览"
            >
              <X className="w-5 h-5" />
            </button>
            <motion.img
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              src={generatedImage}
              alt="全屏商品图放大预览"
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
