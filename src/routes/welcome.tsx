import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Sparkles } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { toast } from "sonner";

export const Route = createFileRoute("/welcome")({
  head: () => ({
    meta: [
      { title: "Khidmati · Welcome" },
      { name: "description", content: "Welcome to Khidmati — log in, sign up, or continue as guest." },
    ],
  }),
  component: WelcomePage,
});

function WelcomePage() {
  const { t } = useI18n();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col px-6 pt-16 pb-10 animate-fade-up">
      <div className="flex-1 flex flex-col items-center justify-center text-center gap-4">
        <div
          className="w-24 h-24 rounded-3xl flex items-center justify-center text-white text-4xl font-bold"
          style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-float)" }}
        >
          خ
        </div>
        <div>
          <div className="text-3xl font-bold tracking-tight">Khidmati</div>
          <div className="text-xl font-semibold text-primary mt-1">خدمتي</div>
        </div>
        <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
          {t("welcomeTagline")}
        </p>
        <div className="glass-tint rounded-full px-4 py-2 inline-flex items-center gap-2 text-xs font-medium text-primary mt-2">
          <Sparkles size={14} /> AI Concierge inside
        </div>
      </div>

      <div className="space-y-3">
        <Link
          to="/signup"
          className="spring-tap w-full rounded-2xl py-3.5 text-sm font-semibold text-white flex items-center justify-center gap-2"
          style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-float)" }}
        >
          {t("signup")} <ArrowRight size={16} className="rtl:rotate-180" />
        </Link>
        <Link
          to="/login"
          className="spring-tap w-full rounded-2xl py-3.5 text-sm font-semibold border border-border bg-white text-center"
        >
          {t("login")}
        </Link>
        <Link
          to="/"
          className="spring-tap block w-full text-center rounded-2xl py-3 text-sm font-medium text-primary"
        >
          {t("continueGuest")} →
        </Link>

        <div className="pt-3 text-center">
          <button
            onClick={() => toast("Business onboarding coming soon")}
            className="text-[11px] text-muted-foreground"
          >
            {t("areYouBusiness")}{" "}
            <span className="text-primary font-semibold underline underline-offset-2">
              {t("clickHere")}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
