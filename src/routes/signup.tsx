import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Khidmati · Sign up" },
      { name: "description", content: "Create your Khidmati account." },
    ],
  }),
  component: SignupPage,
});

function SignupPage() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [referral, setReferral] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !phone.trim() || !email.trim() || password.length < 6) {
      toast.error("Please fill all fields (password 6+ chars)");
      return;
    }
    setLoading(true);
    try {
      const redirectUrl = `${window.location.origin}/`;
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: { full_name: fullName.trim(), phone: phone.trim() },
        },
      });
      if (error) throw error;

      const userId = data.user?.id;
      if (userId) {
        const { error: insertError } = await supabase.from("users").insert({
          id: userId,
          full_name: fullName.trim(),
          phone: phone.trim(),
          role: "customer",
        });
        if (insertError && insertError.code !== "23505") {
          console.error("Profile insert error:", insertError);
        }
      }

      if (data.session) {
        if (referral.trim()) {
          const { error: refErr } = await supabase.rpc("redeem_referral", { p_code: referral.trim() });
          if (refErr) toast.error(`Referral: ${refErr.message}`);
          else toast.success("Referral applied · +2 JOD added to your wallet");
        }
        toast.success("Welcome to Khidmati!");
        navigate({ to: "/" });
      } else {
        if (referral.trim()) {
          // Persist for redemption after email confirmation if needed
          try { localStorage.setItem("pending_referral", referral.trim()); } catch { /* noop */ }
        }
        toast.success("Check your email to confirm your account");
        navigate({ to: "/login" });
      }
    } catch (err: any) {
      toast.error(err?.message ?? "Sign up failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col px-6 pt-14 pb-10 animate-fade-up">
      <div className="mb-8 text-center">
        <div
          className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center text-white text-2xl font-bold mb-4"
          style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-float)" }}
        >
          خ
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Create account</h1>
        <p className="text-sm text-muted-foreground mt-1">Join Khidmati in seconds</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3 flex-1">
        <Field label="Full name" value={fullName} onChange={setFullName} placeholder="Your name" />
        <Field label="Phone number" value={phone} onChange={setPhone} placeholder="07X XXX XXXX" type="tel" />
        <Field label="Email" value={email} onChange={setEmail} placeholder="you@email.com" type="email" />
        <Field label="Password" value={password} onChange={setPassword} placeholder="At least 6 characters" type="password" />
        <Field label="Referral code (optional)" value={referral} onChange={(v) => setReferral(v.toUpperCase())} placeholder="e.g. AB12CD34" />

        <button
          type="submit"
          disabled={loading}
          className="spring-tap w-full rounded-2xl py-3.5 text-sm font-semibold text-white flex items-center justify-center gap-2 mt-6 disabled:opacity-60"
          style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-float)" }}
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <>Sign up <ArrowRight size={16} /></>}
        </button>
      </form>

      <p className="text-center text-xs text-muted-foreground mt-6">
        Already have an account?{" "}
        <Link to="/login" className="text-primary font-semibold">Log in</Link>
      </p>
    </div>
  );
}

function Field({
  label, value, onChange, placeholder, type = "text",
}: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
      />
    </label>
  );
}
