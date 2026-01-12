const fs = require('fs');
const path = require('path');

async function testScan() {
  const fetch = (await import('node-fetch')).default;
  const FormData = (await import('form-data')).default;

  const form = new FormData();
  // Usamos el icono como "imagen de prueba" (aunque no sea un sudoku, Gemini debería responder algo o decir que es un grid vacío, pero no dar error 404)
  const filePath = path.join(__dirname, 'sudoku-mobile/assets/icon.png');
  form.append('image', fs.createReadStream(filePath));

  console.log("Enviando prueba a: https://sudoku-app-uyk3.onrender.com/api/scan");

  try {
    const response = await fetch('https://sudoku-app-uyk3.onrender.com/api/scan', {
      method: 'POST',
      body: form
    });

    if (response.status === 404) {
      console.log("❌ ERROR 404: El servidor aún NO tiene la nueva ruta. Sigue actualizándose.");
    } else if (response.ok) {
        const json = await response.json();
        console.log("✅ ÉXITO: El servidor respondió!", json);
    } else {
        const text = await response.text();
        console.log(`❌ ERROR ${response.status}:`, text);
    }
  } catch (error) {
    console.error("Error de conexión:", error);
  }
}

testScan();
