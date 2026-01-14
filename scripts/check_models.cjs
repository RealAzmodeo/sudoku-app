const { GoogleGenerativeAI } = require("@google/generative-ai");

async function listModels() {
  const genAI = new GoogleGenerativeAI("AIzaSyBUg_kvKuzz-Rul8GqHXXf1TzBOKMN1zp0");
  
  try {
      console.log("Consultando modelos disponibles...");
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); // Dummy init to access client
      // Actually, listing models is a direct API call or done via client if available.
      // The Node SDK doesn't have a direct 'listModels' helper easily accessible without full client setup, 
      // but we can try a simple generation with a known model to see if it works, or catch the error which lists models.
      
      const result = await model.generateContent("Hello");
      console.log("✅ ÉXITO con gemini-1.5-flash!");
      console.log(result.response.text());
  } catch (error) {
      console.error("❌ ERROR:", error.message);
      // The error message usually contains "Supported models are: ..."
  }
}

listModels();
