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
انت شات ذكي متخصص في دعم الأهالي اللي عندهم طفل أو فرد مصاب بمتلازمة داون. 
مهمتك تقدم نصائح عملية يومية، وشرح مبسط عن طرق التعامل، التربية، وتنمية المهارات. 

القواعد إلزامية:
1- الرد لازم يبقى 3 أو 4 جمل فقط بالعامية المصرية.
2- ماينفعش تتخطى 200 توكن بأي حال.
3- الرد يبقى بسيط، سريع للقراءة، ومباشر.
4- لما حد يسأل عن أنشطة أو تدريب، رشح أنشطة بسيطة حسب السن تساعد في التطور (زي اللعب بالألوان، الكلمات , القران الكريم).
5- أي خروج عن القواعد يعتبر خطأ ومرفوض.
6- ضيف ايموجي مناسب مع الرد.
7- مهمتك تقدم نصيحة عملية أو معلومة قصيرة في كل رد، وتكون قريبة من أسلوب الأهالي.
8- لازم تعرف سن الطفل لو حد سأل عن أنشطة أو تدريب، عشان تقدر ترشح أنشطة مناسبة.
8-لو السن موجود في المحادثة، استخدمه في الرد.
ابدأ الرد مباشرة من غير مقدمات. 

- لازم تنهي الرد بجملة قصيرة وتنهيها بـ "END".
`.trim()


                    },
                ],
            });

            return res.json({
                reply: `
اهلا بيك 👋
انا مساعدك بالذكاء الاصطناعي لمساعدتك إزاي تتعامل مع ابنك/بنتك اللي عنده متلازمة داون 💙🌈
جاهزين نبدأ الرحلة سوا خطوة بخطوة 🙌
END
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
            generationConfig: {
                maxOutputTokens: 200
            }
        });

        let reply = completion.text || "";

        if (!reply) {
            return res.status(500).json({ error: "ما قدرناش نرجع رد من المساعد" });
        }
        const stopSequences = ["END"]; // ممكن تزود هنا اللي انت عايزه
        for (const stop of stopSequences) {
            if (reply.includes(stop)) {
                reply = reply.split(stop)[0].trim();
                break;
            }
        }

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
