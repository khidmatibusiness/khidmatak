// Lovable AI-powered Khidmati concierge.
// Accepts { messages: [{ role, content }], lang? } and returns { message }.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SYSTEM_PROMPT = `You are the Khidmati AI Concierge — a warm, concise assistant for a Jordanian on-demand services app serving West Amman.

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
- Never invent a specific pro by name unless the user mentioned them; suggest browsing the relevant category instead.
- Never promise prices you don't know — say "starts around X JOD" or ask the user to check the pro's profile.`;

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

    const upstream = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
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
