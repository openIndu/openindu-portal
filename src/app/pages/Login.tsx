import { useEffect, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation, useNavigate } from "react-router";
import { Loader2 } from "lucide-react";
import { authApi, getApiErrorMessage } from "@/api";
import { useAuth } from "@/store/auth";
import { stripLocalePrefix } from "@/i18n/locale";
import { SEO } from "../components/SEO";
import { CaptchaField } from "../components/CaptchaField";
import { useCaptcha } from "../utils/useCaptcha";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";

const phonePattern = /^1\d{10}$/;
const codePattern = /^\d{6}$/;

export function Login() {
  const { t } = useTranslation("login");
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated } = useAuth();
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [sending, setSending] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const {
    captcha,
    text: captchaText,
    setText: setCaptchaText,
    refresh: refreshCaptcha,
  } = useCaptcha();
  const { t: tCommon } = useTranslation("common");

  // `state.from` (set by AuthGuard's <Navigate>) is already basename-relative --
  // React Router's own location object never carries the /en prefix. The
  // `?redirect=` query param, by contrast, is built by the axios interceptor
  // from the raw `window.location.pathname` (outside the router, no basename
  // awareness), so it still has /en on it when present. `navigate()` re-adds
  // the basename itself, so an already-prefixed path here would double up
  // (e.g. /en/en/...) -- strip it unconditionally; a no-op when there was
  // never a prefix to begin with.
  const redirectTo =
    typeof location.state === "object" && location.state && "from" in location.state
      ? ((location.state.from as { pathname?: string }).pathname ?? "/resources")
      : stripLocalePrefix(new URLSearchParams(location.search).get("redirect") ?? "/resources");

  useEffect(() => {
    if (isAuthenticated) navigate(redirectTo, { replace: true });
  }, [isAuthenticated, navigate, redirectTo]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setInterval(() => setCooldown((value) => Math.max(value - 1, 0)), 1_000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  // 仅在倒计时/发送中禁用按钮；手机号格式校验放到点击时提示，避免按钮静默置灰让用户误以为"无法点击"。
  const canSendCode = cooldown === 0 && !sending;
  const canSubmit =
    phonePattern.test(phone) && codePattern.test(code) && privacyAccepted && !submitting;

  async function handleSendCode() {
    setError("");
    setMessage("");
    if (!phonePattern.test(phone)) {
      setError(t("errors.invalidPhone"));
      return;
    }
    if (!captcha || !captchaText) {
      setError(tCommon("captcha.required"));
      return;
    }
    setSending(true);
    try {
      await authApi.sendCode(phone, captcha.captcha_id, captchaText);
      setCooldown(60);
      setMessage(t("errors.codeSent"));
    } catch (err) {
      const msg = getApiErrorMessage(err, t("errors.sendFailed"));
      // Backend rate-limit message is Chinese-only (backend not yet i18n'd);
      // detection substring stays Chinese, only our appended guidance is localized.
      if (msg.includes("过于频繁")) {
        setCooldown(60);
        setError(`${msg}${t("errors.rateLimitedSuffix")}`);
      } else {
        setError(msg);
      }
    } finally {
      setSending(false);
      // The challenge is consumed whether the send succeeded or not.
      void refreshCaptcha();
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    if (!privacyAccepted) {
      setError(t("errors.privacyRequired"));
      return;
    }
    if (!canSubmit) {
      setError(t("errors.invalidInput"));
      return;
    }
    setSubmitting(true);
    try {
      const result = await authApi.signIn(phone, code);
      await login(result);
      if (result.is_new_user) {
        setMessage(t("errors.newUserCreated"));
      }
      // 登录会更新 AuthProvider 状态；等待 isAuthenticated 变为 true 后由上方 effect 跳转，
      // 避免在同一个事件周期内直接进入受保护路由导致 AuthGuard 读到旧状态并回跳登录页。
    } catch (err) {
      setError(getApiErrorMessage(err, t("errors.signInFailed")));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="bg-gradient-to-br from-blue-50 via-white to-cyan-50 px-4 py-16 sm:py-24">
      <SEO
        title={t("seo.title")}
        description={t("seo.description")}
        keywords={t("seo.keywords")}
        canonicalPath="/login"
      />
      <Card className="mx-auto max-w-md border-sky-100 shadow-xl">
        <CardHeader className="text-center">
          <CardTitle>{t("title")}</CardTitle>
          <CardDescription className="space-y-1">
            <span className="block">{t("descriptionLine1")}</span>
            <span className="block">{t("descriptionLine2")}</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label htmlFor="login-phone" className="text-sm font-medium text-gray-700">
                {t("phoneLabel")}
              </label>
              <Input
                id="login-phone"
                value={phone}
                onChange={(event) => setPhone(event.target.value.replace(/\D/g, "").slice(0, 11))}
                inputMode="numeric"
                autoComplete="tel"
                placeholder={t("phonePlaceholder")}
              />
            </div>
            <CaptchaField
              captcha={captcha}
              text={captchaText}
              onTextChange={setCaptchaText}
              onRefresh={() => void refreshCaptcha()}
              idPrefix="login"
            />
            <div className="space-y-2">
              <label htmlFor="login-code" className="text-sm font-medium text-gray-700">
                {t("codeLabel")}
              </label>
              <div className="flex gap-2">
                <Input
                  id="login-code"
                  value={code}
                  onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder={t("codePlaceholder")}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSendCode}
                  disabled={!canSendCode}
                  className="min-w-28"
                >
                  {sending ? (
                    <Loader2 className="animate-spin" />
                  ) : cooldown > 0 ? (
                    `${cooldown}s`
                  ) : (
                    t("sendCode")
                  )}
                </Button>
              </div>
            </div>
            <label className="flex items-start gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={privacyAccepted}
                onChange={(event) => setPrivacyAccepted(event.target.checked)}
                className="mt-1 h-5 w-5 shrink-0"
              />
              <span>
                {t("privacyPrefix")}
                <Link to="/privacy" className="font-medium text-sky-700 hover:text-sky-800">
                  {t("privacyLinkText")}
                </Link>
                {t("privacySuffix")}
              </span>
            </label>
            {message && (
              <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{message}</p>
            )}
            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
            )}
            <Button
              type="submit"
              disabled={!canSubmit}
              className="w-full bg-sky-700 hover:bg-[#085A90]"
            >
              {submitting ? <Loader2 className="animate-spin" /> : t("submit")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </section>
  );
}
