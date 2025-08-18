import dotenv from "dotenv";
import UserRequest from "../models/UserRequest.js";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.OPENAI_API_KEY });

const ChatController = async (req, res) => {
  const { message } = req.clonedBody;
  const sessionId = req.sessionId;
  const token = req.token;

  if (!message) {
    return res.status(400).json({ error: "الرسالة مطلوبة" });
  }

  if (message === "ابدأ") {
    return res.status(200).json({ reply: "✨ اهلا 👋 محتاج اي مساعده ", token });
  }

  try {
    let userSession = await UserRequest.findOne({ sessionId });

    if (!userSession) {
      userSession = await UserRequest.create({
        sessionId,
        chatHistory: [
          {
            role: "user",
            content: `
انت خبير تسويق الكتروني متخصص في السوق المصري وتشتغل لصالح "افيليت المهدي للتسويق بالعموله".

القواعد إلزامية:
1- الرد لازم يبقى 3 أو 4 جمل فقط بالعامية المصرية.
2- ماينفعش تتخطى 200 توكن بأي حال.
3- الرد يبقى بسيط، سريع للقراءة، ومباشر.
4- لو حد سأل عن ترشيح منتجات، رشح منتجات الرتان (مكسبها عالي).
5- اختم الرد بكلمة: END
`.trim(),
          },
        ],
      });

      return res.json({
        reply: `اهلا بيك ! 👋 انا مساعدك بالذكاء الاصطناعي في التسويق الالكتروني 🚀💡 جاهز نبدأ 💪📈`,
        token,
      });
    }

    // ✨ تحديث التاريخ
    userSession.chatHistory.push({ role: "user", content: message });

    // ✨ خزن آخر 8 رسائل فقط
    const formattedHistory = userSession.chatHistory.slice(-8).map((msg) => ({
      role:
        msg.role === "assistant"
          ? "model"
          : msg.role === "system"
          ? "user"
          : msg.role,
      parts: [{ text: msg.content }],
    }));

    // ✨ استدعاء Gemini
    const completion = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: formattedHistory,
      generationConfig: {
        maxOutputTokens: 200,
        stopSequences: ["END", "\n\n"], // ⛔️ يجبره يوقف
      },
    });

    // ✨ جلب الرد
    let reply = completion.response.text() || "";

    // ✨ شيل كلمة END من الآخر
    reply = reply.replace(/END$/, "").trim();

    // ✨ fallback: قص الرد لو طويل زيادة
    const words = reply.split(" ");
    if (words.length > 70) {
      reply = words.slice(0, 70).join(" ") + "...";
    }

    // ✨ تحديث التاريخ
    userSession.chatHistory.push({ role: "assistant", content: reply });
    await userSession.save();

    res.json({ reply, token });
  } catch (error) {
    console.error("❌ خطأ في استدعاء gemini:", error);
    res.status(500).json({ error: "حدث خطأ داخلي" });
  }
};

export default ChatController;
