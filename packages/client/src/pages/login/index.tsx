import {
  getFirstConsoleMenuPath,
  hasConsoleAccess,
  WEB_HOME_PATH,
} from "@buildingai/services/shared";
import { useAuthStore, useConfigStore } from "@buildingai/stores";
import SvgIcons from "@buildingai/ui/components/svg-icons";
import { Navigate, useSearchParams } from "react-router-dom";

import { LoginForm } from "./_components/login-form";
import { StarField } from "./_components/star-field";

function isAbsoluteHttpUrl(target: string) {
  return /^https?:\/\//i.test(target);
}

function isConsoleTarget(target: string) {
  if (!target) return false;
  const pathname = isAbsoluteHttpUrl(target) ? new URL(target).pathname : target;
  return pathname === "/console" || pathname.startsWith("/console/");
}

const LoginPage = () => {
  const [searchParams] = useSearchParams();
  const { userInfo } = useAuthStore((state) => state.auth);
  const { isLogin } = useAuthStore((state) => state.authActions);
  const { websiteConfig } = useConfigStore((state) => state.config);
  const redirect = searchParams.get("redirect") ?? "";

  if (isLogin()) {
    if (!userInfo) return null;

    if (!hasConsoleAccess(userInfo)) {
      const target = redirect && !isConsoleTarget(redirect) ? redirect : WEB_HOME_PATH;
      return <Navigate to={target} replace />;
    }

    const target = redirect || getFirstConsoleMenuPath(userInfo.menus ?? []);
    if (isAbsoluteHttpUrl(target)) {
      const url = new URL(target);
      if (url.port && url.pathname.includes("/extension/")) {
        const token = useAuthStore.getState().auth.token;
        if (token) {
          url.searchParams.set("_t", btoa(token));
        }
      }
      window.location.replace(url.toString());
      return null;
    }
    return <Navigate to={target} replace />;
  }
  return (
    <div
      className="dark relative flex min-h-svh flex-col items-center justify-center gap-6 overflow-hidden p-6 md:p-10"
      style={{
        background: "linear-gradient(135deg, #09091a 0%, #0f1b3b 35%, #091528 70%, #0a0f1f 100%)",
      }}
    >
      {/* Ambient glow orbs */}
      <div
        className="pointer-events-none absolute -top-20 -right-20 h-[280px] w-[280px] rounded-full blur-[60px]"
        style={{ background: "radial-gradient(circle, rgba(99,102,241,0.18), transparent 70%)" }}
      />
      <div
        className="pointer-events-none absolute -bottom-24 -left-16 h-[320px] w-[320px] rounded-full blur-[60px]"
        style={{ background: "radial-gradient(circle, rgba(56,189,248,0.1), transparent 70%)" }}
      />
      <div
        className="pointer-events-none absolute top-[45%] left-[40%] h-[200px] w-[200px] rounded-full blur-[40px]"
        style={{ background: "radial-gradient(circle, rgba(139,92,246,0.08), transparent 70%)" }}
      />

      {/* Subtle dot grid texture */}
      <div
        className="pointer-events-none absolute inset-0 opacity-50"
        style={{
          backgroundImage: "radial-gradient(rgba(99,102,241,0.04) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />

      {/* Twinkling starfield + occasional shooting stars */}
      <StarField />

      <div className="relative z-10 flex w-full max-w-sm flex-col gap-6">
        <a href="#" className="flex items-center gap-2 self-center font-medium">
          {websiteConfig?.webinfo.logo ? (
            <div className="flex items-center gap-2">
              <img className="h-8" src={websiteConfig?.webinfo.logo} alt="logo" />
              <span className="text-xl font-bold text-slate-100">
                {websiteConfig?.webinfo.name}
              </span>
            </div>
          ) : (
            <SvgIcons.buildingaiFull className="h-8" />
          )}
        </a>
        <LoginForm />
      </div>
    </div>
  );
};

export { LoginPage };
