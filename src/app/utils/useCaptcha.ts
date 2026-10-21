import { useCallback, useEffect, useState } from "react";
import { authApi, type CaptchaChallenge } from "@/api";

/**
 * Owns one image-captcha challenge: fetch on mount, expose the id for the
 * sendCode call, and hand out a refresh that also clears the typed text.
 * The backend consumes the challenge on every attempt (right or wrong), so
 * callers must refresh after each send — success included.
 */
export function useCaptcha() {
  const [captcha, setCaptcha] = useState<CaptchaChallenge | null>(null);
  const [text, setText] = useState("");

  const refresh = useCallback(async () => {
    setText("");
    try {
      setCaptcha(await authApi.getCaptcha());
    } catch {
      setCaptcha(null);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { captcha, text, setText, refresh };
}
