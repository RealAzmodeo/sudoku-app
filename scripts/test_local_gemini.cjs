const { GoogleGenerativeAI } = require("@google/generative-ai");

async function check() {
  const genAI = new GoogleGenerativeAI("AIzaSyBUg_kvKuzz-Rul8GqHXXf1TzBOKMN1zp0");
  // En la versión 0.21.0, podemos probar a forzar el modelo
  try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const result = await model.generateContent("Hello");
      console.log("✅ FUNCIONA LOCALMENTE!");
      console.log(result.response.text());
  } catch (e) {
      console.log("❌ FALLA LOCALMENTE:", e.message);
  }
}
check();
