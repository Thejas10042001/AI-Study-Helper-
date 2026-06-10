import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Parse JSON payloads
  app.use(express.json());

  // Emulate Netlify function request format for direct compatibility with App.jsx
  app.post("/.netlify/functions/ask", async (req, res) => {
    try {
      const { question } = req.body;
      if (!question) {
        return res.status(400).json({ error: "Question is required." });
      }

      const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
      if (!apiKey) {
        console.error("GEMINI_API_KEY or API_KEY environment variable is not set.");
        return res.status(500).json({ error: "Gemini API key is not configured on the server." });
      }

      // Initialize the Gemini SDK with teleport headers
      const ai = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });

      console.log(`[AI Study Helper] Generating tutoring content for: "${question}"`);

      // Run operations concurrently
      const [definitionResponse, diagramResponse, animationResponse] = await Promise.all([
        // 1. Definition (powered by gemini-3.5-flash)
        ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: `Explain the concept of "${question}" in a clear and concise way suitable for a student. Use simple language and provide an analogy if possible. Keep it educational and engaging.`,
        }),
        // 2. SVG Diagram (powered by gemini-3.5-flash - free, responsive, and incredibly fast)
        ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: `Create a highly professional, modern, self-contained SVG diagram illustrating the core concept of "${question}" for an educational tutorial.
Requirements:
- Design a horizontal diagram (600x400 aspect ratio) using clean shapes, clear labeled blocks, visual connectors/arrows, and high contrast.
- Visual elements should use distinct colors (like cyan, blue, purple, emerald) with dark mode-friendly accents to match a dark mode applet dashboard. Use a dark background (such as #111827) so text is beautifully readable.
- ALL text labels must be sharp, with appropriate font sizes and styles, and have high-contrast text colors so they stand out clearly.
- Create distinct, recognizable icons, boxes, or lines showing inputs, processes, and outputs.
- Make it fully responsive by ensuring the root <svg> element contains a viewBox="0 0 600 400" attribute and styling with width: 100%. Do not use any external assets or scripts.
- Output ONLY valid, highly-structured, raw SVG XML format. No markdown wrappers.`,
        }).catch((err) => {
          console.error("SVG diagram generation failed, using fallback:", err);
          return null;
        }),
        // 3. Animation Idea (powered by gemini-3.5-flash)
        ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: `Describe a short, simple 2D animation that explains the concept of "${question}". What would be visualized and how would it move to make the concept easier to understand?`,
        }),
      ]);

      const definition = definitionResponse.text;
      const animationDescription = animationResponse.text;

      let diagramDataUrl = "";
      if (diagramResponse && diagramResponse.text) {
        let svgText = diagramResponse.text;
        // Clean up markdown code blocks if the model wrapped the SVG
        const codeBlockMatch = svgText.match(/```(?:xml|svg)?\s*([\s\S]*?)\s*```/i);
        if (codeBlockMatch) {
          svgText = codeBlockMatch[1];
        }

        const svgStartIndex = svgText.indexOf("<svg");
        const svgEndIndex = svgText.lastIndexOf("</svg>");
        if (svgStartIndex !== -1 && svgEndIndex !== -1) {
          svgText = svgText.substring(svgStartIndex, svgEndIndex + 6);
        } else {
          // Minimal fallback SVG structure
          svgText = `<svg viewBox="0 0 600 400" xmlns="http://www.w3.org/2000/svg" style="background:#111827;border-radius:8px">
            <rect width="600" height="400" rx="12" fill="#111827"/>
            <text x="50%" y="45%" text-anchor="middle" fill="#22d3ee" font-family="sans-serif" font-size="22" font-weight="bold">Diagram of ${question}</text>
            <text x="50%" y="55%" text-anchor="middle" fill="#9ca3af" font-family="sans-serif" font-size="14">Educational Concept Visual Model</text>
          </svg>`;
        }

        // Convert raw SVG string to base64 Data URL for backward compatibility with <img> tags
        diagramDataUrl = `data:image/svg+xml;base64,${Buffer.from(svgText.trim()).toString("base64")}`;
      } else {
        // Fallback elegant SVG image URL so the app doesn't break
        const fallbackSvg = `<svg viewBox="0 0 600 400" xmlns="http://www.w3.org/2000/svg" style="background:#111827;border-radius:8px">
          <rect width="600" height="400" rx="12" fill="#111827"/>
          <text x="50%" y="45%" text-anchor="middle" fill="#22d3ee" font-family="sans-serif" font-size="22" font-weight="bold">Diagram of ${question}</text>
          <text x="50%" y="55%" text-anchor="middle" fill="#9ca3af" font-family="sans-serif" font-size="14">Educational Concept Visual Model</text>
        </svg>`;
        diagramDataUrl = `data:image/svg+xml;base64,${Buffer.from(fallbackSvg.trim()).toString("base64")}`;
      }

      res.status(200).json({
        definition,
        diagramDataUrl,
        animationDescription,
      });
    } catch (err: any) {
      console.error("Error in ask endpoint:", err);
      res.status(500).json({
        error: "An error occurred while processing your request.",
        details: err.message,
      });
    }
  });

  // Vite development middleware vs production static assets
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files from /dist
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is running at http://localhost:${PORT}`);
  });
}

startServer();
