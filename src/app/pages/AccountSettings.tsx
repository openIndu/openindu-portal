import { useEffect, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useNavigate } from "react-router";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  LogOut,
  ShieldCheck,
  Trash2,
  UserRound,
} from "lucide-react";
import {
  authApi,
  getApiErrorMessage,
  memberApplicationApi,
  type MemberApplicationStatus,
} from "@/api";
import { useAuth } from "@/store/auth";
import { maskPhone } from "../utils/user";
import { SEO } from "../components/SEO";
import { CaptchaField } from "../components/CaptchaField";
import { useCaptcha } from "../utils/useCaptcha";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../components/ui/alert-dialog";

const phonePattern = /^1\d{10}$/;
const codePattern = /^\d{6}$/;

export function AccountSettings() {
  const { t } = useTranslation("account");
  const { t: tCommon } = useTranslation("common");
  const { isAuthenticated, isLoading, user, updateProfile, logout, setUser } = useAuth();
  const navigate = useNavigate();
  const [nickname, setNickname] = useState(user?.nickname ?? "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [application, setApplication] = useState<MemberApplicationStatus | null | undefined>(
    undefined,
  );
  const [applying, setApplying] = useState(false);
  const [applyError, setApplyError] = useState("");

  // Phone change state - separate state for phone change messages
  const [showPhoneChange, setShowPhoneChange] = useState(false);
  const [newPhone, setNewPhone] = useState("");
  const [phoneCode, setPhoneCode] = useState("");
  const [sendingCode, setSendingCode] = useState(false);
  const [changingPhone, setChangingPhone] = useState(false);
  const {
    captcha,
    text: captchaText,
    setText: setCaptchaText,
    refresh: refreshCaptcha,
  } = useCaptcha();
  const [cooldown, setCooldown] = useState(0);
  const [phoneMessage, setPhoneMessage] = useState("");
  const [phoneError, setPhoneError] = useState("");

  useEffect(() => {
    setNickname(user?.nickname ?? "");
  }, [user?.nickname]);

  useEffect(() => {
    if (user?.role === "user") {
      memberApplicationApi
        .mine()
        .then((v) => setApplication(v ?? null))
        .catch(() => setApplication(null));
    }
  }, [user?.role]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setInterval(() => setCooldown((value) => Math.max(value - 1, 0)), 1_000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  if (!isLoading && !isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: { pathname: "/account" } }} />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");
    const nextNickname = nickname.trim();
    if (nextNickname.length > 50) {
      setError(t("profile.errors.tooLong"));
      return;
    }
    setSaving(true);
    try {
      await updateProfile({ nickname: nextNickname || null });
      setMessage(t("profile.errors.saved"));
    } catch (err) {
      setError(getApiErrorMessage(err, t("profile.errors.saveFailed")));
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteAccount() {
    setDeleting(true);
    try {
      await authApi.deleteAccount();
      await logout();
      navigate("/");
    } catch (err) {
      setError(getApiErrorMessage(err, t("deleteAccount.deleteFailed")));
    } finally {
      setDeleting(false);
    }
  }

  async function handleSendPhoneCode() {
    setPhoneError("");
    setPhoneMessage("");
    if (!phonePattern.test(newPhone)) {
      setPhoneError(t("phoneChange.errors.invalidPhone"));
      return;
    }
    if (!captcha || !captchaText) {
      setPhoneError(tCommon("captcha.required"));
      return;
    }
    setSendingCode(true);
    try {
      await authApi.sendCode(newPhone, captcha.captcha_id, captchaText);
      setCooldown(60);
      setPhoneMessage(t("phoneChange.errors.codeSent"));
    } catch (err) {
      setPhoneError(getApiErrorMessage(err, t("phoneChange.errors.sendFailed")));
    } finally {
      setSendingCode(false);
      // The challenge is consumed whether the send succeeded or not.
      void refreshCaptcha();
    }
  }

  async function handleChangePhone(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPhoneError("");
    setPhoneMessage("");
    if (!phonePattern.test(newPhone)) {
      setPhoneError(t("phoneChange.errors.invalidPhoneFormat"));
      return;
    }
    if (!codePattern.test(phoneCode)) {
      setPhoneError(t("phoneChange.errors.invalidCode"));
      return;
    }
    setChangingPhone(true);
    try {
      const result = await authApi.changePhone(newPhone, phoneCode);
      setUser(result.user);
      setPhoneMessage(t("phoneChange.errors.updated"));
      setTimeout(() => {
        setShowPhoneChange(false);
        setNewPhone("");
        setPhoneCode("");
        setPhoneMessage("");
      }, 1500);
    } catch (err) {
      setPhoneError(getApiErrorMessage(err, t("phoneChange.errors.changeFailed")));
    } finally {
      setChangingPhone(false);
    }
  }

  const deliverableItems = t("deleteAccount.items", { returnObjects: true }) as string[];
  const roleLabel = user?.role ? t(`role.labels.${user.role}`, { defaultValue: user.role }) : "—";

  return (
    <section className="bg-gradient-to-br from-blue-50 via-white to-cyan-50 px-4 py-12 sm:px-6 lg:px-8">
      <SEO title={t("seo.title")} description={t("seo.description")} canonicalPath="/account" />
      <div className="mx-auto max-w-3xl">
        <div className="mb-8">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-sky-100 px-4 py-2 text-sm font-semibold text-sky-800">
            <UserRound className="h-4 w-4" />
            {t("header.badge")}
          </div>
          <h1 className="text-3xl font-bold text-gray-900">{t("header.title")}</h1>
          <p className="mt-2 text-gray-600">{t("header.subtitle")}</p>
        </div>

        {/* 个人资料 - 昵称修改 */}
        <Card className="border-sky-100 shadow-sm mb-6">
          <CardHeader>
            <CardTitle>{t("profile.cardTitle")}</CardTitle>
            <CardDescription>{t("profile.cardDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <label
                  htmlFor="nickname"
                  className="text-sm font-medium text-gray-700 block text-left px-3"
                >
                  {t("profile.nicknameLabel")}
                </label>
                <Input
                  id="nickname"
                  value={nickname}
                  onChange={(event) => setNickname(event.target.value)}
                  maxLength={50}
                  placeholder={t("profile.nicknamePlaceholder")}
                />
              </div>

              {message && (
                <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{message}</p>
              )}
              {error && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
              )}

              <Button type="submit" disabled={saving} className="bg-sky-700 hover:bg-[#085A90]">
                {saving ? <Loader2 className="animate-spin mr-2" /> : null}
                {t("profile.saveButton")}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* 账号角色 - 独立卡片 */}
        <Card className="border-sky-100 shadow-sm mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-sky-700" />
              {t("role.cardTitle")}
            </CardTitle>
            <CardDescription>{t("role.cardDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-xl border border-gray-100 bg-gray-50 py-4 px-4">
              <p className="text-base font-semibold text-gray-900">{roleLabel}</p>
            </div>
            {user?.role === "user" && (
              <div className="mt-4">
                {application === undefined ? null : application?.status === "pending" ? (
                  <div className="flex items-center gap-1.5 text-sm text-amber-700">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    {t("role.pending")}
                  </div>
                ) : application?.status === "approved" ? (
                  <div className="flex items-center gap-1.5 text-sm text-green-700">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    {t("role.approved")}
                  </div>
                ) : application?.status === "rejected" ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5 text-sm text-red-600">
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                      {t("role.rejected")}
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      disabled={applying}
                      className="bg-sky-700 hover:bg-[#085A90]"
                      onClick={async () => {
                        setApplyError("");
                        setApplying(true);
                        try {
                          const result = await memberApplicationApi.apply();
                          setApplication(result);
                        } catch (err) {
                          setApplyError(getApiErrorMessage(err, t("role.applyFailed")));
                        } finally {
                          setApplying(false);
                        }
                      }}
                    >
                      {applying ? <Loader2 className="animate-spin mr-1.5 h-3.5 w-3.5" /> : null}
                      {t("role.reapplyButton")}
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    disabled={applying}
                    className="bg-sky-700 hover:bg-[#085A90]"
                    onClick={async () => {
                      setApplyError("");
                      setApplying(true);
                      try {
                        const result = await memberApplicationApi.apply();
                        setApplication(result);
                      } catch (err) {
                        setApplyError(getApiErrorMessage(err, t("role.applyFailed")));
                      } finally {
                        setApplying(false);
                      }
                    }}
                  >
                    {applying ? <Loader2 className="animate-spin mr-1.5 h-3.5 w-3.5" /> : null}
                    {t("role.applyButton")}
                  </Button>
                )}
                {applyError && <p className="mt-2 text-xs text-red-600">{applyError}</p>}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 修改手机号 - 独立卡片 */}
        <Card className="border-sky-100 shadow-sm mb-6">
          <CardHeader>
            <CardTitle>{t("phoneChange.cardTitle")}</CardTitle>
            <CardDescription>{t("phoneChange.cardDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            {!showPhoneChange ? (
              <>
                <div className="rounded-xl border border-gray-100 bg-gray-50 py-4 px-3 mb-4">
                  <div className="mb-1 text-sm font-medium text-gray-700">
                    {t("phoneChange.currentPhoneLabel")}
                  </div>
                  <p className="text-lg font-semibold text-gray-900">{maskPhone(user?.phone)}</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowPhoneChange(true)}
                  className="w-full"
                >
                  {t("phoneChange.changeButton")}
                </Button>
              </>
            ) : (
              <form className="space-y-4" onSubmit={handleChangePhone}>
                <div className="rounded-xl border border-sky-100 bg-sky-50 py-4 px-3 mb-4">
                  <div className="text-sm font-medium text-sky-800">
                    {t("phoneChange.currentPhoneLabel")}
                  </div>
                  <p className="text-lg font-semibold text-[#0B72B5]">{maskPhone(user?.phone)}</p>
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="new-phone"
                    className="text-sm font-medium text-gray-700 block text-left px-3"
                  >
                    {t("phoneChange.newPhoneLabel")}
                  </label>
                  <Input
                    id="new-phone"
                    value={newPhone}
                    onChange={(event) =>
                      setNewPhone(event.target.value.replace(/\D/g, "").slice(0, 11))
                    }
                    inputMode="numeric"
                    placeholder={t("phoneChange.newPhonePlaceholder")}
                  />
                </div>

                <CaptchaField
                  captcha={captcha}
                  text={captchaText}
                  onTextChange={setCaptchaText}
                  onRefresh={() => void refreshCaptcha()}
                  idPrefix="phone-change"
                />

                <div className="space-y-2">
                  <label
                    htmlFor="phone-code"
                    className="text-sm font-medium text-gray-700 block text-left px-3"
                  >
                    {t("phoneChange.codeLabel")}
                  </label>
                  <div className="flex gap-2">
                    <Input
                      id="phone-code"
                      value={phoneCode}
                      onChange={(event) =>
                        setPhoneCode(event.target.value.replace(/\D/g, "").slice(0, 6))
                      }
                      inputMode="numeric"
                      placeholder={t("phoneChange.codePlaceholder")}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleSendPhoneCode}
                      disabled={cooldown > 0 || sendingCode}
                      className="min-w-28"
                    >
                      {sendingCode ? (
                        <Loader2 className="animate-spin" />
                      ) : cooldown > 0 ? (
                        `${cooldown}s`
                      ) : (
                        t("phoneChange.sendCode")
                      )}
                    </Button>
                  </div>
                </div>

                {phoneMessage && (
                  <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
                    {phoneMessage}
                  </p>
                )}
                {phoneError && (
                  <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                    {phoneError}
                  </p>
                )}

                <div className="flex gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowPhoneChange(false);
                      setNewPhone("");
                      setPhoneCode("");
                      setPhoneError("");
                      setPhoneMessage("");
                    }}
                    className="flex-1"
                  >
                    {t("phoneChange.cancelButton")}
                  </Button>
                  <Button
                    type="submit"
                    disabled={
                      !phonePattern.test(newPhone) || !codePattern.test(phoneCode) || changingPhone
                    }
                    className="flex-1 bg-sky-700 hover:bg-[#085A90]"
                  >
                    {changingPhone ? (
                      <Loader2 className="animate-spin mr-2" />
                    ) : (
                      t("phoneChange.confirmButton")
                    )}
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>

        {/* 注销账号 - 独立卡片 */}
        <Card className="border-red-100 shadow-sm">
          <CardHeader>
            <CardTitle className="text-red-700 flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              {t("deleteAccount.cardTitle")}
            </CardTitle>
            <CardDescription>{t("deleteAccount.cardDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  disabled={deleting}
                  className="w-full border-red-200 text-red-600 hover:bg-red-100 hover:text-red-700"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  {t("deleteAccount.triggerButton")}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="border-red-200">
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2 text-red-600">
                    <AlertTriangle className="h-5 w-5" />
                    {t("deleteAccount.dialogTitle")}
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-gray-600">
                    <div className="mt-4 space-y-3">
                      <p>{t("deleteAccount.dialogIntro")}</p>
                      <ul className="list-disc pl-5 space-y-1 text-sm">
                        {deliverableItems.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                      <div className="rounded-lg bg-red-50 p-3 text-red-700 text-sm border border-red-100">
                        <strong>{t("deleteAccount.warningPrefix")}</strong>
                        {t("deleteAccount.warningText")}
                      </div>
                    </div>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="flex gap-3 sm:gap-3">
                  <AlertDialogCancel disabled={deleting} className="flex-1 mt-0">
                    {t("deleteAccount.cancelButton")}
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={(e: React.MouseEvent) => {
                      e.preventDefault();
                      handleDeleteAccount();
                    }}
                    disabled={deleting}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                  >
                    {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    {t("deleteAccount.confirmButton")}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
