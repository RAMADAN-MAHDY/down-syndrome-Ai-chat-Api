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
        return res.status(200).json({ reply : "✨ اهلا 👋 محتاج اي مساعده ", token });
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
                        5- أي خروج عن القواعد يعتبر خطأ ومرفوض.
                        
                        ابدأ الرد مباشرة من غير مقدمات.
                        `.trim()
                        
                    },
                ],
            });

            return res.json({
                reply: `
اهلا بيك  ! 👋
انا مساعدك بالذكاء الاصطناعي  في التسويق الالكتروني ... 🚀💡
جاهز نبدأ الرحلة 💪📈
    `,
                token,
            });
        }

        // ✨ تحديث التاريخ
        userSession.chatHistory.push({ role: "user", content: message });

        // ✨ تحويل history لصيغة Gemini
        const formattedHistory = userSession.chatHistory.slice(-20).map(msg => ({
            role:
                msg.role === "assistant"
                    ? "model"
                    : msg.role === "system"
                        ? "user" // ✨ أي system تتحول لـ user
                        : msg.role, // أي user يفضل user
            parts: [{ text: msg.content }],
        }));

        // ✨ استدعاء Gemini
        const completion = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: formattedHistory,
            maxOutputTokens: 200 ,
        });

        const reply = completion.text || "";

        if (!reply) {
            return res.status(500).json({ error: "ما قدرناش نرجع رد من المساعد" });
        }

        userSession.chatHistory.push({ role: "assistant", content: reply });
        await userSession.save();

        res.json({ reply, token });
    } catch (error) {
        console.error("❌ خطأ في استدعاء gemini:", error);
        res.status(500).json({ error: "حدث خطأ داخلي" });
    }
};

export default ChatController;
