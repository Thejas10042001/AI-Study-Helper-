import { GoogleGenAI } from "@google/genai";

// Ensure the API key is being read from environment variables
if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable is not set.");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function handler(event) {
  // We only want to handle POST requests
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method Not Allowed" }),
      headers: { Allow: "POST" },
    };
  }

  try {
    const { question } = JSON.parse(event.body);
    if (!question) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Question is required." }),
      };
    }

    // --- Generate content concurrently for better performance ---
    const [definitionResponse, diagramResponse, animationResponse] = await Promise.all([
      // 1. Get Definition
      ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `Explain the concept of "${question}" in a clear and concise way suitable for a student. Use simple language and provide an analogy if possible.`,
      }),
      // 2. Generate Diagram
      ai.models.generateImages({
        model: "imagen-4.0-generate-001",
        prompt: `Create a simple, clean, and educational diagram illustrating the core concept of "${question}". The diagram should be minimalist, with clear labels and a white background.`,
        config: {
          numberOfImages: 1,
          outputMimeType: "image/png",
        },
      }),
      // 3. Generate Animation Idea
      ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `Describe a short, simple 2D animation that explains the concept of "${question}". What would be visualized and how would it move to make the concept easier to understand?`,
      }),
    ]);

    // --- Process API responses ---
    const definition = definitionResponse.text;
    const base64Image = diagramResponse.generatedImages[0].image.imageBytes;
    const diagramDataUrl = `data:image/png;base66,${base64Image}`;
    const animationDescription = animationResponse.text;

    return {
      statusCode: 200,
      body: JSON.stringify({
        definition,
        diagramDataUrl,
        animationDescription,
      }),
    };
  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "An error occurred while processing your request.",
        details: err.message,
      }),
    };
  }
}
