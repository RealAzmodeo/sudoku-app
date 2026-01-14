const { GoogleGenerativeAI } = require("@google/generative-ai");

async function check() {
  const genAI = new GoogleGenerativeAI("AIzaSyBUg_kvKuzz-Rul8GqHXXf1TzBOKMN1zp0");
  const model = genAI.getGenerativeModel({ model: "gemini-pro" }); // Classic Pro 1.0
  
  try {
      console.log("Probando gemini-pro...");
      const result = await model.generateContent("Say hi");
      console.log("✅ FUNCIONA:", result.response.text());
  } catch (error) {
      console.log("❌ FALLA:", error.message.split('\n')[0]);
  }
}
check();
