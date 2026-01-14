const { GoogleGenerativeAI } = require("@google/generative-ai");

async function check() {
  const genAI = new GoogleGenerativeAI("AIzaSyBUg_kvKuzz-Rul8GqHXXf1TzBOKMN1zp0");
  try {
      // FORZANDO API VERSION V1
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }, { apiVersion: 'v1' });
      const result = await model.generateContent("Say 'HELLO WORLD'");
      console.log("✅ ÉXITO TOTAL:", result.response.text());
  } catch (e) {
      console.log("❌ ERROR:", e.message);
  }
}
check();
