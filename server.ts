import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

// Helper to get GoogleGenAI client with dynamic/lazy initialization
function getAiClient() {
  const userKey = "AIzaSyDd8qy90EjLM3D3hY8PK-kQokalRPUhoZ8";
  const apiKey = process.env.API_KEY && process.env.API_KEY !== "MY_GEMINI_API_KEY"
    ? process.env.API_KEY
    : userKey;

  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Increase payload limit for base64 image uploads
  app.use(express.json({ limit: "50mb" }));

  // In-memory store for SaaS point and upload simulation
  const userPointsStore = new Map<string, number>();
  const DEFAULT_POINTS = 120;
  const TOOL_COST = 10;

  // A. 获取用户积分的接口 (Launch)
  app.post("/api/tool/launch", (req, res) => {
    try {
      const { userId = "test_user" } = req.body;
      if (!userPointsStore.has(userId)) {
        userPointsStore.set(userId, DEFAULT_POINTS);
      }
      const currentIntegral = userPointsStore.get(userId);
      res.json({
        success: true,
        data: {
          user: { name: `用户_${userId.substring(0, 4)}`, enterprise: "体验企业", integral: currentIntegral },
          tool: { name: "AI 智能商品生图", integral: TOOL_COST }
        }
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // B. 检查积分的接口 (Verify)
  app.post("/api/tool/verify", (req, res) => {
    try {
      const { userId = "test_user" } = req.body;
      if (!userPointsStore.has(userId)) {
        userPointsStore.set(userId, DEFAULT_POINTS);
      }
      const currentIntegral = userPointsStore.get(userId) || 0;
      if (currentIntegral < TOOL_COST) {
        return res.status(200).json({
          success: false,
          message: `积分不足，当前余额只有 ${currentIntegral} 积分，生成本张图需要 ${TOOL_COST} 积分。`
        });
      }
      res.json({
        success: true,
        data: { currentIntegral, requiredIntegral: TOOL_COST }
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // C. 扣除积分的接口 (Consume)
  app.post("/api/tool/consume", (req, res) => {
    try {
      const { userId = "test_user" } = req.body;
      if (!userPointsStore.has(userId)) {
        userPointsStore.set(userId, DEFAULT_POINTS);
      }
      let currentIntegral = userPointsStore.get(userId) || 0;
      if (currentIntegral < TOOL_COST) {
        return res.status(400).json({
          success: false,
          message: `扣除积分失败：余额不足`
        });
      }
      currentIntegral -= TOOL_COST;
      userPointsStore.set(userId, currentIntegral);
      res.json({
        success: true,
        data: { currentIntegral, consumedIntegral: TOOL_COST }
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // D1. 图片直传签名 (upload/direct-token)
  app.post("/api/upload/direct-token", (req, res) => {
    try {
      const { userId = "test_user", fileName = "result.png" } = req.body;
      const objectKey = `result/${userId}_${Date.now()}_${fileName}`;
      res.json({
        success: true,
        method: "PUT",
        objectKey,
        uploadUrl: `/api/upload/proxy-put?key=${encodeURIComponent(objectKey)}`,
        proxyUploadUrl: `/api/upload/proxy-put?key=${encodeURIComponent(objectKey)}`,
        headers: {
          "Content-Type": "image/png"
        }
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // D2. 图片直传代理接收 (proxy-put)
  app.put("/api/upload/proxy-put", express.raw({ type: "*/*", limit: "50mb" }), (req, res) => {
    try {
      res.status(200).send({ success: true });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // D3. 直传结果图入库 (upload/commit)
  app.post("/api/upload/commit", (req, res) => {
    try {
      const { userId = "test_user", objectKey } = req.body;
      res.json({
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
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

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

      const prompt = `Place this product in a ${style} setting. Ensure the lighting, shadows, and reflections are realistic and match the new environment perfectly. The product should remain intact, clear, and the central focus of the image.`;

      // Lazy initialize the AI client to ensure env var is read dynamically
      const ai = getAiClient();

      // Ensure we use a valid image model if the model is specified, or fallback to gemini-3.1-flash-image
      // Generic models like gemini-2.5-flash or gemini-3.5-flash don't support imageConfig, so we map them to the proper image generation model
      const targetModel = (model && (model.includes('image') || model.includes('veo') || model.includes('lyria')))
        ? model
        : 'gemini-3.1-flash-image';

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
      console.error("Image generation error:", error);
      
      let errorMessage = error.message || "生成商品图失败，请稍后重试";
      
      // Customize typical Google GenAI billing / quota errors for a clear user guidance
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

  app.post("/api/generate", async (req, res) => {
    try {
      const { imageUri, style, aspectRatio = "1:1", imageSize = "1K" } = req.body;

      if (!imageUri) {
        return res.status(400).json({ error: "Missing image URI" });
      }

      // Parse base64 image
      const match = imageUri.match(/^data:(image\/\w+);base64,(.+)$/);
      if (!match) {
        return res.status(400).json({ error: "Invalid image URI format" });
      }

      const mimeType = match[1];
      const base64Data = match[2];

      const prompt = `Place this product in a ${style} setting. Ensure the lighting, shadows, and reflections are realistic and match the new environment perfectly. The product should remain intact, clear, and the central focus of the image.`;

      // Lazy initialize the AI client to ensure env var is read dynamically
      const ai = getAiClient();

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-image',
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
      console.error("Image generation error:", error);
      
      let errorMessage = error.message || "生成商品图失败，请稍后重试";
      
      // Customize typical Google GenAI billing / quota errors for a clear user guidance
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

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
