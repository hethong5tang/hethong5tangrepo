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
      
      // TODO: Call Banking/MoMo API here to generate payment Intent/QR
      // Example with MoMo: momo.createPayment({ amount, orderId: "..." })
      
      // For now, save order in DB with status 'pending'
      const orderId = `DEP_${Date.now()}_${userId}`;
      const mockCheckoutUrl = `https://mock-payment-gateway.com/pay/${orderId}`;

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
      // 1. Verify webhook signature (e.g., MoMo HmacSHA256)
      const payload = req.body;
      // if (!verifySignature(payload)) throw new Error("Invalid signatures");

      // 2. Determine state of payment
      const isSuccess = payload.resultCode === 0; // Assuming MoMo code pattern
      
      if (isSuccess) {
        // 3. Update DB (Deposit success) -> Add balance to user
        const { orderId, amount } = payload;
        // await supabaseAdmin.rpc('process_deposit', { p_order_id: orderId, p_amount: amount });
        console.log(`[WEBHOOK] Deposit completed for order: ${orderId}`);
      }

      // Return 204/200 to acknowledge receipt to gateway
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
      /*
      const { data: profile } = await supabaseAdmin.from('profiles').select('balance').eq('id', userId).single();
      if (!profile || profile.balance < amount) {
          return res.status(400).json({ error: "Insufficient balance" });
      }
      */

      // 2. Create withdrawal request (status: pending)
      // await supabaseAdmin.from('withdrawals').insert({ ... })
      
      // 3. Deduct available balance immediately (reserve funds)
      
      res.json({ success: true, message: "Withdrawal request submitted via API" });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });


  // ==========================================
  // 2. F1-F5 HIERARCHY & COMMISSION PIPELINE
  // ==========================================

  // Process a Package Purchase -> Distributes Commisions F1-F5
  app.post("/api/packages/purchase", async (req, res) => {
    try {
      const { userId, packageId, packagePrice } = req.body;

      // START DB TRANSACTION-LIKE LOGIC (Supabase RPC is best, but here's the API implementation)
      
      // Breakdown logic from AGENTS.md constraints
      // TOTAL: 100%
      // Funds (20% total):
      const fundAdmin = packagePrice * 0.10;   // 10%
      const fundLeader = packagePrice * 0.05;  // 5%
      const fundSupport = packagePrice * 0.05; // 5%

      // Fetch user's upline (F1 to F5)
      // e.g. const { data: ancestors } = await supabaseAdmin.rpc('get_ancestors', { p_user_id: userId, max_depth: 5 });
      
      // Simulated ancestors list [F1, F2, F3, F4, F5]
      const ancestors = [
         { id: "parent-id-1", level: 1 },
         { id: "parent-id-2", level: 2 },
         { id: "parent-id-3", level: 3 },
         { id: "parent-id-4", level: 4 },
         { id: "parent-id-5", level: 5 },
      ];

      const commRates: Record<number, number> = {
         1: 0.40, // 40% F1
         2: 0.16, // 16% F2
         3: 0.12, // 12% F3
         4: 0.08, // 8%  F4
         5: 0.04  // 4%  F5
      };

      const transactions = [];

      // 1. Add Fund Transactions
      transactions.push({ type: 'fund_admin', amount: fundAdmin });
      transactions.push({ type: 'fund_leader', amount: fundLeader });
      transactions.push({ type: 'fund_support', amount: fundSupport });

      // 2. Add Commission Transactions
      let totalDistributed = fundAdmin + fundLeader + fundSupport;

      for (const node of ancestors) {
         const rate = commRates[node.level];
         if (rate) {
            const commAmount = packagePrice * rate;
            transactions.push({ 
               type: 'commission',
               userId: node.id, 
               level: node.level, 
               amount: commAmount 
            });
            totalDistributed += commAmount;
         }
      }

      // Check math: totalDistributed should be close to packagePrice
      console.log(`[SYS] Purchase Processed: Price=${packagePrice}. Total Distributed=${totalDistributed}`);

      // Perform Batch DB execution here
      // const { error } = await supabaseAdmin.from('transactions').insert(transactions);
      // if (error) throw error;
      
      // Update User state
      // await supabaseAdmin.from('profiles').update({ has_package: true }).eq('id', userId);

      res.json({ 
        success: true, 
        message: "Package purchased and commissions distributed",
        debugBreakdown: transactions 
      });

    } catch (error: any) {
      console.error("Purchase Error:", error);
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
