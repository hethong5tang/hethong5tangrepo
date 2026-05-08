import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // API Proxy for Supabase SQL (to avoid CORS)
  app.post("/api/supabase/deploy", async (req, res) => {
    const { supabaseRef, supabaseToken, sql } = req.body;

    if (!supabaseRef || !supabaseToken || !sql) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    try {
      const response = await fetch(`https://api.supabase.com/v1/projects/${supabaseRef}/sql`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${supabaseToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ query: sql })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || data.error || "Supabase deployment failed");
      }

      res.json({ success: true, data });
    } catch (error: any) {
      console.error("Supabase Proxy Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    if (fs.existsSync(distPath)) {
        app.use(express.static(distPath));
        app.get("*", (req, res) => {
            res.sendFile(path.join(distPath, "index.html"));
        });
    }
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
