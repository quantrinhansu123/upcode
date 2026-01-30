
import { GoogleGenAI, Type } from "@google/genai";

// Initialization should happen before use, and per best practices, 
// creating a new instance right before the call ensures the latest API key from the environment is used.
export const suggestTasksForProject = async (projectName: string, projectDescription: string) => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Hãy đóng vai một chuyên gia quản lý dự án. Tôi đang tạo một dự án tên là "${projectName}" với mô tả: "${projectDescription}". 
      Hãy gợi ý 5 công việc (tasks) quan trọng cần thực hiện. 
      Trả về danh sách dưới dạng JSON.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING, description: "Tiêu đề công việc" },
              description: { type: Type.STRING, description: "Mô tả ngắn gọn" },
              priority: { type: Type.STRING, enum: ["Low", "Medium", "High"] }
            },
            required: ["title", "description", "priority"]
          }
        }
      }
    });

    // The .text property is a getter, not a method.
    const text = response.text;
    if (!text) return [];
    return JSON.parse(text);
  } catch (error) {
    console.error("Gemini API Error:", error);
    return [];
  }
};
