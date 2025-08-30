import express from "express";
import dotenv from "dotenv";
import chatRoutes from "./routes/chat.js";
import connectDB from "./db.js";
import analyzeRoutes from "./routes/analyze.js";
import getusers from "./routes/GET/getusers.js";
import deleteUser from "./routes/DELETE/deleteUser.js";
import clickController from './routes/post/clickRoutes.js'
import cors from "cors";
import securityMiddleware from './middleware/securityMiddleware.js'
// تحميل المتغيرات البيئية
dotenv.config();

// إعداد التطبيق

const app = express();
const port = 5000;

// إعداد CORS
const options = {
    origin: ["https://elmahdy.vercel.app" , "http://localhost:5173"], // ✅ السماح بالوصول من هذا النطاق
    credentials: true, // ✅ السماح بالكوكيز
};
app.use(cors(options));


connectDB(); // ✅ الاتصال بقاعدة البيانات
app.use(express.json());
securityMiddleware(app) ; // ✅ استخدام محركات الحماية


// ✅ استخدام الراوتر
app.use("/chat", chatRoutes); // ✅ استخدام راوتر الدردشة
app.use("/analyze", analyzeRoutes); // ✅ استخدام راوتر التحليل
app.use("/users", getusers); // ✅ استخدام راوتر جلب المستخدمين
app.use("/DELETusers", deleteUser); // ✅ استخدام راوتر حذف المستخدمين
app.use("/api" , clickController) 
app.get("/", (req, res) => {
    res.send("API is running...");
});


app.listen(port, () => {
    console.log(`✅ API شغال على http://localhost:${port}`);
});
