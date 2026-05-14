import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2, Mail } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [{ title: "Khidmati · Forgot password" }],
  }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setSent(true);
      toast.success("Reset link sent");
    } catch (err: any) {
      toast.error(err?.message ?? "Could not send reset email");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col px-6 pt-14 pb-10 animate-fade-up">
      <div className="mb-8 text-center">
        <div
          className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center text-white mb-4"
          style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-float)" }}
        >
          <Mail size={26} />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Forgot password</h1>
        <p className="text-sm text-muted-foreground mt-1">We'll email you a reset link</p>
      </div>

      {sent ? (
        <div className="glass rounded-3xl p-6 text-center text-sm">
          Check your inbox for instructions to reset your password.
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3 flex-1">
          <label className="block">
            <span className="text-xs font-medium text-muted-foreground">Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
              className="mt-1 w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </label>
          <button
            type="submit"
            disabled={loading}
            className="spring-tap w-full rounded-2xl py-3.5 text-sm font-semibold text-white flex items-center justify-center gap-2 mt-4 disabled:opacity-60"
            style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-float)" }}
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : "Send reset link"}
          </button>
        </form>
      )}

      <p className="text-center text-xs text-muted-foreground mt-6">
        <Link to="/login" className="text-primary font-semibold">Back to log in</Link>
      </p>
    </div>
  );
}
