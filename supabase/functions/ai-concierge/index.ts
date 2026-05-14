// Lovable AI-powered Khidmati concierge.
// Accepts { messages: [{ role, content }], lang? } and returns { message }.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const BASE_SYSTEM_PROMPT = `You are the Khidmati AI Concierge — a warm, concise assistant for a Jordanian on-demand services app serving West Amman.

Khidmati helps customers find and book trusted local pros across these categories:
- Home (plumbers, electricians, cleaners, AC techs)
- Sports (padel courts, trainers, gyms)
- Medical (clinics, labs like Biolab, home nurses)
- Beauty (salons, barbers, spas)

App features you can explain or guide users through:
- Search by category or via Ask AI
- View pro profiles with ratings, reviews, JOD pricing
- Book Now (immediate) or Schedule for later
- Pay with Wallet (top up via WhatsApp), Cash, or Card (coming soon)
- Send money by wallet code to friends
- SOS quick dispatch for plumber/electrician/tow/first-aid emergencies

Your job:
- Recommend services and pros based on user need, location, and budget (prices in JOD).
- Walk users through booking, top-up, and wallet flows in plain steps.
- Answer questions about how Khidmati works.
- Keep replies short (2-5 sentences), friendly, with at most 1 emoji per reply.
- If the user writes in Arabic, reply in Arabic. If English, reply in English. Match their language.
- Use the LIVE CATALOG below as the source of truth. When the user asks for a service (e.g. "padel under 30 JOD", "cheap cleaning", "something fun nearby"), filter the catalog by category, subcategory, keywords, and price, then list 2-4 matching options with the pro name and price in JOD. If nothing matches, say so honestly and suggest the closest category.
- Never invent pros or prices that aren't in the catalog.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY is not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const body = await req.json();
    const messages = Array.isArray(body?.messages) ? body.messages : [];
    if (messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "messages array is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Fetch live catalog (services + pros + avg ratings) for grounding
    let catalogBlock = "";
    try {
      const supaUrl = Deno.env.get("SUPABASE_URL");
      const supaKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      if (supaUrl && supaKey) {
        const supa = createClient(supaUrl, supaKey);
        const [{ data: services }, { data: users }, { data: reviews }] = await Promise.all([
          supa.from("services").select("id,name_en,name_ar,category,subcategory,price,duration_mins,pro_id").eq("is_active", true).limit(200),
          supa.from("users").select("id,full_name"),
          supa.from("reviews").select("pro_id,rating"),
        ]);
        const userMap = new Map<string, string>((users ?? []).map((u: { id: string; full_name: string | null }) => [u.id, u.full_name ?? ""]));
        const ratings = new Map<string, { sum: number; n: number }>();
        for (const r of (reviews ?? []) as Array<{ pro_id: string; rating: number }>) {
          if (!r.pro_id) continue;
          const cur = ratings.get(r.pro_id) ?? { sum: 0, n: 0 };
          cur.sum += r.rating ?? 0; cur.n += 1;
          ratings.set(r.pro_id, cur);
        }
        const rows = (services ?? []).map((s: { id: string; name_en: string; name_ar: string | null; category: string | null; subcategory: string | null; price: number; duration_mins: number | null; pro_id: string | null }) => {
          const r = s.pro_id ? ratings.get(s.pro_id) : null;
          const avg = r && r.n ? (r.sum / r.n).toFixed(1) : "—";
          return {
            id: s.id,
            name: s.name_en,
            name_ar: s.name_ar,
            pro: s.pro_id ? userMap.get(s.pro_id) ?? "Khidmati pro" : "Khidmati pro",
            category: s.category,
            subcategory: s.subcategory,
            price_jod: Number(s.price),
            duration_mins: s.duration_mins,
            rating: avg,
          };
        });
        catalogBlock = `\n\nLIVE CATALOG (JSON, ${rows.length} active services):\n${JSON.stringify(rows)}`;
      }
    } catch (e) {
      console.error("catalog fetch failed", e);
    }

    const SYSTEM_PROMPT = BASE_SYSTEM_PROMPT + catalogBlock;

    const upstream = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Lovable-API-Key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...messages.map((m: { role: string; content: string }) => ({
            role: m.role === "assistant" ? "assistant" : "user",
            content: String(m.content ?? ""),
          })),
        ],
      }),
    });

    if (!upstream.ok) {
      const text = await upstream.text();
      console.error("Gateway error", upstream.status, text);
      let userMsg = "AI service is temporarily unavailable. Please try again.";
      if (upstream.status === 429) userMsg = "Too many requests. Please wait a moment and try again.";
      if (upstream.status === 402) userMsg = "AI credits exhausted. Please add credits to your workspace.";
      return new Response(
        JSON.stringify({ error: userMsg }),
        { status: upstream.status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const data = await upstream.json();
    const message: string = data?.choices?.[0]?.message?.content ?? "";

    return new Response(
      JSON.stringify({ message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("ai-concierge error", e);
    return new Response(
      JSON.stringify({ error: (e as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
