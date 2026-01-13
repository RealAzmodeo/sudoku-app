const { GoogleGenerativeAI } = require("@google/generative-ai");

async function check() {
  const genAI = new GoogleGenerativeAI("AIzaSyBUg_kvKuzz-Rul8GqHXXf1TzBOKMN1zp0");
  try {
      const model = genAI.getGenerativeModel({ model: "gemini-pro-vision" });
      console.log("Probando gemini-pro-vision...");
      // Este modelo REQUIERE imagen, así que solo testeamos si lo 'encuentra'
      console.log("✅ MODELO ENCONTRADO!");
  } catch (e) {
      console.log("❌ MODELO NO ENCONTRADO:", e.message);
  }
}
check();
