import express from "express";
import axios from "axios";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json({ limit: "50mb" }));

// Helper to get GoogleGenAI client with dynamic/lazy initialization
function getAiClient() {
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY 无效或未配置。请在 Vercel 或本地的环境变量中设置 GEMINI_API_KEY。");
  }

  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
}

// Enable CORS & OPTIONS
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Content-Security-Policy", "frame-ancestors *");

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }
  next();
});

// Local in-memory mock store for local development preview/fallback
const userPointsStore = new Map<string, number>();
const DEFAULT_POINTS = 120;
const TOOL_COST = 10;

// Local Mock Handlers as Fallback when direct proxy to aibigtree.com fails
const localLaunch = (userId: string) => {
  if (!userPointsStore.has(userId)) {
    userPointsStore.set(userId, DEFAULT_POINTS);
  }
  const currentIntegral = userPointsStore.get(userId);
  return {
    success: true,
    data: {
      user: { name: `用户_${userId.substring(0, 4)}`, enterprise: "体验企业", integral: currentIntegral },
      tool: { name: "智能水杯商品生图", integral: TOOL_COST }
    }
  };
};

const localVerify = (userId: string) => {
  if (!userPointsStore.has(userId)) {
    userPointsStore.set(userId, DEFAULT_POINTS);
  }
  const currentIntegral = userPointsStore.get(userId) || 0;
  if (currentIntegral < TOOL_COST) {
    return {
      success: false,
      message: `积分不足，当前余额只有 ${currentIntegral} 积分，生成本张图需要 ${TOOL_COST} 积分。`
    };
  }
  return {
    success: true,
    data: { currentIntegral, requiredIntegral: TOOL_COST }
  };
};

const localConsume = (userId: string) => {
  if (!userPointsStore.has(userId)) {
    userPointsStore.set(userId, DEFAULT_POINTS);
  }
  let currentIntegral = userPointsStore.get(userId) || 0;
  if (currentIntegral < TOOL_COST) {
    return {
      success: false,
      message: `扣费失败：余额不足`
    };
  }
  currentIntegral -= TOOL_COST;
  userPointsStore.set(userId, currentIntegral);
  return {
    success: true,
    data: { currentIntegral, consumedIntegral: TOOL_COST }
  };
};

// Robust generic proxy with fallback to local mocks if remote is unreachable or returns error
const proxyRequest = async (req: express.Request, res: express.Response, targetPath: string) => {
  const targetUrl = `http://aibigtree.com${targetPath}`;
  const userId = req.body?.userId || "test_user";

  try {
    const response = await axios({
      method: req.method,
      url: targetUrl,
      data: req.body,
      headers: { "Content-Type": "application/json" },
      timeout: 4000, // Timeout after 4 seconds to fallback quickly
      validateStatus: () => true,
    });

    // If successfully reached aibigtree.com, return its response
    res.status(response.status).json(response.data);
  } catch (error: any) {
    console.warn(`Proxy to aibigtree.com failed, falling back to local mocks: ${error.message}`);
    
    // Smart fallbacks based on path
    if (targetPath.includes("/api/tool/launch")) {
      return res.json(localLaunch(userId));
    }
    if (targetPath.includes("/api/tool/verify")) {
      const vRes = localVerify(userId);
      if (!vRes.success) {
        return res.status(200).json(vRes); // Verify returns 200 with success: false for quota error
      }
      return res.json(vRes);
    }
    if (targetPath.includes("/api/tool/consume")) {
      const cRes = localConsume(userId);
      if (!cRes.success) {
        return res.status(400).json(cRes);
      }
      return res.json(cRes);
    }
    if (targetPath.includes("/api/upload/direct-token")) {
      const fileName = req.body?.fileName || "result.png";
      const objectKey = `result/${userId}_${Date.now()}_${fileName}`;
      return res.json({
        success: true,
        method: "PUT",
        objectKey,
        uploadUrl: `/api/upload/proxy-put?key=${encodeURIComponent(objectKey)}`,
        proxyUploadUrl: `/api/upload/proxy-put?key=${encodeURIComponent(objectKey)}`,
        headers: { "Content-Type": "image/png" }
      });
    }
    if (targetPath.includes("/api/upload/commit")) {
      const objectKey = req.body?.objectKey;
      return res.json({
        success: true,
        source: "result",
        savedToRecords: true,
        recordId: `img_${Math.random().toString(36).substring(2, 11)}`,
        url: `/api/view-image?key=${encodeURIComponent(objectKey || "")}`,
        fileName: objectKey,
        image: {
          url: `/api/view-image?key=${encodeURIComponent(objectKey || "")}`,
          fileName: objectKey,
          recordId: `img_${Math.random().toString(36).substring(2, 11)}`,
          savedToRecords: true
        }
      });
    }

    res.status(500).json({ error: "代理转发失败，且无本地模拟实现", details: error.message });
  }
};

// Route matching
app.post("/api/gemini", async (req, res) => {
  try {
    const { model, payload } = req.body;
    const { imageUri, style, aspectRatio = "1:1", imageSize = "1K" } = payload || {};

    if (!imageUri) {
      return res.status(400).json({ error: "Missing image URI in payload" });
    }

    // Parse base64 image
    const match = imageUri.match(/^data:(image\/\w+);base64,(.+)$/);
    if (!match) {
      return res.status(400).json({ error: "Invalid image URI format" });
    }

    const mimeType = match[1];
    const base64Data = match[2];

    const prompt = `You are a professional product commercial photographer and master image editor. 
Your task is to take the product from the uploaded image and place it seamlessly into the following setting: "${style}".

CRITICAL INSTRUCTIONS FOR HIGH QUALITY PLACEMENT:
1. There MUST be EXACTLY ONE instance of the product in the final generated image. Do NOT generate duplicate, floating, or extra copies of the product.
2. If the setting describes a model or person holding the product, place the product naturally in their hand. Do NOT create a floating bottle next to the person.
3. Preserve the product's original shape, labels, details, branding, and colors perfectly.
4. Ensure the lighting, soft shadows, and reflections are highly realistic and perfectly matched to the new environment.
5. The product should be the absolute main focus of the image, crisp, clean, and beautifully integrated.`;

    // Lazy initialize the AI client
    const ai = getAiClient();

    // Ensure we use a valid image model or fallback to gemini-3.1-flash-image
    const targetModel = (model && (model.includes("image") || model.includes("veo") || model.includes("lyria")))
      ? model
      : "gemini-3.1-flash-image";

    const response = await ai.models.generateContent({
      model: targetModel,
      contents: {
        parts: [
          { inlineData: { data: base64Data, mimeType } },
          { text: prompt },
        ],
      },
      config: {
        imageConfig: {
          aspectRatio,
          imageSize,
        },
      },
    });

    let outputImageBase64 = null;
    let outputMimeType = null;

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        outputImageBase64 = part.inlineData.data;
        outputMimeType = part.inlineData.mimeType || "image/png";
        break;
      }
    }

    if (!outputImageBase64) {
      throw new Error("Failed to generate image.");
    }

    const outputImageUrl = `data:${outputMimeType};base64,${outputImageBase64}`;
    res.json({ imageUrl: outputImageUrl });
  } catch (error: any) {
    console.error("Vercel Gemini API execution error:", error);
    
    let errorMessage = error.message || "生成商品图失败，请稍后重试";
    
    if (errorMessage.includes("prepayment credits are depleted") || errorMessage.includes("RESOURCE_EXHAUSTED") || errorMessage.includes("429")) {
      errorMessage = "您的 Google AI Studio 账户余额/预付款额度已耗尽 (Prepayment credits are depleted)。请前往 Google AI Studio 平台 (https://ai.studio/projects) 充值或检查您的 API Key 账单状态，以恢复生图服务。";
    } else if (errorMessage.includes("API_KEY_INVALID") || errorMessage.includes("API key not valid")) {
      errorMessage = "您的 Gemini API Key 无效，请在后台配置正确的 API Key。";
    } else if (errorMessage.includes("quota") || errorMessage.includes("Quota exceeded")) {
      errorMessage = "超出 API 限额 (Quota Exceeded)，请稍后再试或在 Google AI Studio 提升您的限额。";
    }
    
    res.status(500).json({ error: errorMessage });
  }
});

// Proxy Put
app.put("/api/upload/proxy-put", express.raw({ type: "*/*", limit: "50mb" }), (req, res) => {
  try {
    res.status(200).send({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Map all other /api routes
app.all("/api/*", (req, res) => {
  const path = req.originalUrl || req.url;
  proxyRequest(req, res, path);
});

export default app;
