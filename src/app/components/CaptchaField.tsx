import { useTranslation } from "react-i18next";
import type { CaptchaChallenge } from "@/api";
import { Input } from "./ui/input";

interface CaptchaFieldProps {
  captcha: CaptchaChallenge | null;
  text: string;
  onTextChange: (value: string) => void;
  onRefresh: () => void;
  idPrefix: string;
}

export function CaptchaField({
  captcha,
  text,
  onTextChange,
  onRefresh,
  idPrefix,
}: CaptchaFieldProps) {
  const { t } = useTranslation("common");
  return (
    <div className="space-y-2">
      <label htmlFor={`${idPrefix}-captcha`} className="text-sm font-medium text-gray-700">
        {t("captcha.label")}
      </label>
      <div className="flex gap-2">
        <Input
          id={`${idPrefix}-captcha`}
          value={text}
          onChange={(event) => onTextChange(event.target.value.trim().slice(0, 4))}
          placeholder={t("captcha.placeholder")}
          autoComplete="off"
          className="w-28 shrink-0"
        />
        {captcha ? (
          <button
            type="button"
            onClick={onRefresh}
            title={t("captcha.refreshHint")}
            aria-label={t("captcha.refreshHint")}
            className="h-10 flex-1 overflow-hidden rounded-md border border-input p-0"
          >
            <img
              src={captcha.image}
              alt={t("captcha.label")}
              className="h-full w-full object-cover"
            />
          </button>
        ) : (
          <div className="flex h-10 flex-1 items-center justify-center rounded-md border border-input text-xs text-muted-foreground">
            {t("captcha.loading")}
          </div>
        )}
      </div>
    </div>
  );
}
