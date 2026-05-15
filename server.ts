import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import fs from "fs";
import { createClient } from "@supabase/supabase-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Supabase Admin Client for Backend Operations
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

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
      const response = await fetch(`https://api.supabase.com/v1/projects/${supabaseRef}/database/query`, {
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

  // ==========================================
  // 1. PAYMENT & WALLET PIPELINE (SCAFFOLDING)
  // ==========================================

  // Request a Deposit (returns checkout URL or QR details)
  app.post("/api/wallet/deposit", async (req, res) => {
    try {
      const { userId, amount, paymentMethod } = req.body;
      
      const orderId = `DEP_${Date.now()}_${userId}`;
      const mockCheckoutUrl = `https://mock-payment-gateway.com/pay/${orderId}`;

      // Insert pending deposit into user transactions
      const { error } = await supabaseAdmin.from('transactions').insert({
          id: orderId.split('_')[1] ? undefined : undefined, // let gen_random_uuid handle if string is not uuid format, or we just insert it
          user_id: userId,
          type: 'deposit',
          amount: amount,
          status: 'pending',
          description: `Deposit via ${paymentMethod} - Order: ${orderId}`
      });
      // We ignore schema UUID constraint error if orderId is standard string by only passing user_id and allowing default id, but we need to track orderId maybe in description for webhook matching.

      res.json({ 
        success: true, 
        message: "Payment intent created", 
        orderId, 
        checkoutUrl: mockCheckoutUrl 
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Webhook from Payment Gateway (MoMo / Bank Transfer)
  app.post("/api/wallet/webhook", async (req, res) => {
    try {
      const payload = req.body;
      const isSuccess = payload.resultCode === 0;
      
      if (isSuccess) {
        const { orderId, amount, userId } = payload;
        
        // 1. Update the transaction status from pending to completed (using stored order_id in description or similar, assuming we passed user_id)
        // Here we simulate adding balance
        if (userId && amount) {
           // We can execute an RPC or generic update
           const { data: user, error: userErr } = await supabaseAdmin.from('users').select('balance').eq('id', userId).single();
           if (!userErr && user) {
               await supabaseAdmin.from('users').update({ balance: Number(user.balance) + Number(amount) }).eq('id', userId);
           }
           
           // Log transaction
           await supabaseAdmin.from('transactions').insert({
               user_id: userId,
               type: 'deposit',
               amount: amount,
               status: 'completed',
               description: `Webhook auto-deposit for order: ${orderId}`
           });
           console.log(`[WEBHOOK] Deposit completed for user ${userId}, amount: ${amount}`);
        }
      }

      res.status(200).send("OK");
    } catch (error: any) {
       console.error("Webhook Error:", error);
       res.status(400).send("Webhook Error");
    }
  });

  // Request a Withdrawal
  app.post("/api/wallet/withdraw", async (req, res) => {
    try {
      const { userId, amount, bankCode, bankAccountNumber, bankName } = req.body;

      // 1. Verify user's available balance in DB
      const { data: user, error: userErr } = await supabaseAdmin.from('users').select('balance').eq('id', userId).single();
      
      if (userErr || !user || Number(user.balance) < Number(amount)) {
          return res.status(400).json({ error: "Insufficient balance or user not found" });
      }

      // 2. Create withdrawal request (status: pending)
      const taxAmount = Number(amount) * 0.10;
      const netAmount = Number(amount) - taxAmount;

      const { error: txErr } = await supabaseAdmin.from('transactions').insert({
          user_id: userId,
          type: 'withdraw',
          amount: amount,
          status: 'pending',
          description: `Withdraw request to ${bankName} - ${bankAccountNumber}. (Gross: ${Number(amount).toLocaleString()}đ, Tax 10%: ${taxAmount.toLocaleString()}đ, Net: ${netAmount.toLocaleString()}đ)`
      });

      if (txErr) throw txErr;
      
      // 3. Deduct available balance immediately (reserve funds)
      await supabaseAdmin.from('users').update({ balance: Number(user.balance) - Number(amount) }).eq('id', userId);
      
      // 4. Record tax to the special tax fund in DB
      await supabaseAdmin.from('funds').update({ 
          balance: Number( (await supabaseAdmin.from('funds').select('balance').eq('id', 'tncn_tax').single()).data?.balance || 0 ) + taxAmount,
          total_in: Number( (await supabaseAdmin.from('funds').select('total_in').eq('id', 'tncn_tax').single()).data?.total_in || 0 ) + taxAmount
      }).eq('id', 'tncn_tax');

      await supabaseAdmin.from('fund_transactions').insert({
          fund_id: 'tncn_tax',
          type: 'inflow',
          amount: taxAmount,
          description: `Khấu trừ 10% thuế TNCN từ lệnh rút của User: ${userId}`
      });
      
      res.json({ success: true, message: `Lệnh rút đã gửi. Số tiền rút: ${Number(amount).toLocaleString()}đ, Thuế TNCN (10%): ${taxAmount.toLocaleString()}đ, Thực nhận dự kiến: ${netAmount.toLocaleString()}đ.` });
    } catch (error: any) {
      console.error("Withdraw Error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });


  // ==========================================
  // 2. F1-F2 HIERARCHY & COMMISSION PIPELINE
  // ==========================================

  // Process a Package Purchase -> Distributes Commisions F1-F2
  app.post("/api/packages/purchase", async (req, res) => {
    try {
      const { userId, packageId, packagePrice } = req.body;

      // START DB TRANSACTION-LIKE LOGIC using the Supabase RPC
      const { data, error } = await supabaseAdmin.rpc('process_package_purchase', {
          p_buyer_id: userId,
          p_amount: Number(packagePrice)
      });

      if (error) {
          throw new Error(error.message);
      }

      console.log(`[SYS] Purchase Processed via RPC for User: ${userId}, Amount: ${packagePrice}`);

      res.json({ 
        success: true, 
        message: "Package purchased and commissions distributed successfully via Supabase RPC",
      });

    } catch (error: any) {
      console.error("Purchase Error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // ==========================================
  // 3. AI PROVIDERS DYNAMIC SYNC
  // ==========================================
  app.get("/api/ai/models", async (req, res) => {
    try {
      const models: any[] = [];
      const usdRate = process.env.VITE_USD_RATE ? parseInt(process.env.VITE_USD_RATE) : 25500;

      // 1. OpenAI
      const openAiKey = process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY;
      if (openAiKey) {
        try {
          const oaiRes = await fetch("https://api.openai.com/v1/models", {
            headers: { "Authorization": `Bearer ${openAiKey}` }
          });
          if (oaiRes.ok) {
            const data = await oaiRes.json();
            const gptModels = data.data.filter((m: any) => m.id.startsWith("gpt-") || m.id.startsWith("o1") || m.id.startsWith("o3"));
            gptModels.forEach((m: any) => {
              models.push({
                provider: "OpenAI",
                modelId: m.id,
                name: m.id.toUpperCase(),
                type: m.id.includes("gpt-4") ? "Smart Text" : "Fast Text",
                basePriceUsd: m.id.includes("gpt-4") ? 2.50 : 0.15,
                unit: "1M Tokens",
                category: "premium",
                logo: "https://upload.wikimedia.org/wikipedia/commons/0/04/ChatGPT_logo.svg",
                isActiveProvider: true
              });
            });
          }
        } catch (e) { console.error("OpenAI sync error", e); }
      }

      // 2. Anthropic (Anthropic has no official v1/models endpoints yet, we mock standard ones if key exists)
      const anthropicKey = process.env.ANTHROPIC_API_KEY || process.env.VITE_ANTHROPIC_API_KEY;
      if (anthropicKey) {
        const standardAnthropic = ["claude-3-5-sonnet-latest", "claude-3-5-haiku-latest", "claude-3-opus-latest"];
        standardAnthropic.forEach(id => {
          models.push({
            provider: "Anthropic",
            modelId: id,
            name: id.toUpperCase().replace(/-/g, ' '),
            type: id.includes("haiku") ? "Fast Text" : "Advanced Text",
            basePriceUsd: id.includes("opus") ? 15.0 : (id.includes("sonnet") ? 3.0 : 0.25),
            unit: "1M Tokens",
            category: "premium",
            logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/78/Anthropic_logo.svg/512px-Anthropic_logo.svg.png",
            isActiveProvider: true
          });
        });
      }

      // 3. Google Gemini (Via generic catalog or fetch if needed, we'll keep it static here but tag as active if key exists)
      const geminiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
      // Provide baseline Gemini models
      const baseGemini = [
        { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash' },
        { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro' },
        { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
        { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro' },
        { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash Preview' }
      ];
      baseGemini.forEach(m => {
        models.push({
          provider: "Google",
          modelId: m.id,
          name: m.name,
          type: "Text/Vision",
          basePriceUsd: m.id.includes("pro") ? 1.25 : 0.075,
          unit: "1M Tokens",
          category: m.id.includes("pro") ? "pro" : "flash",
          logo: "https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_Cloud_Logo.svg",
          isActiveProvider: !!geminiKey
        });
      });

      res.json({ success: true, models, configuredProviders: {
        openai: !!openAiKey,
        anthropic: !!anthropicKey,
        google: !!geminiKey
      }});
    } catch (error: any) {
      console.error("Models Sync Error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
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
