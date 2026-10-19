import { useTranslation } from "react-i18next";
import {
  Server,
  Zap,
  CheckCircle,
  Cpu,
  ExternalLink,
  MessageSquare,
  Image,
  Mic,
} from "lucide-react";
import { SEO } from "../components/SEO";

const featureKeys = [
  { key: "unifiedAccess", icon: Zap },
  { key: "chatCompletion", icon: MessageSquare },
  { key: "imageEmbedding", icon: Image },
  { key: "voiceService", icon: Mic },
] as const;

const useCaseKeys = ["motionControl", "visionInspection", "dataAnalysis"] as const;
const architectureKeys = [
  "application",
  "gateway",
  "forwarding",
  "llmService",
  "monitoring",
] as const;

export function TokenService() {
  const { t } = useTranslation("infrastructure");

  return (
    <div>
      <SEO
        title={t("seo.title")}
        description={t("seo.description")}
        keywords={t("seo.keywords")}
        canonicalPath="/infrastructure"
      />
      {/* Hero */}
      <section className="bg-gradient-to-br from-sky-50 via-white to-cyan-50 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center justify-center w-12 h-12 bg-[#0B72B5] text-white rounded-lg">
              <Server className="w-7 h-7" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900">{t("hero.title")}</h1>
          </div>
          <p className="text-xl text-gray-600 max-w-3xl mb-8">{t("hero.description")}</p>
          <div className="flex items-center gap-6 text-sm text-gray-600">
            <div>
              <span className="font-semibold text-gray-900">{t("hero.statusLabel")}</span>{" "}
              {t("hero.statusValue")}
            </div>
          </div>
        </div>
      </section>

      {/* Quick Access */}
      <section className="py-16 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="bg-[#085A90] rounded-2xl p-6 sm:p-12 text-center">
            <Server className="w-16 h-16 mx-auto mb-6 opacity-80" />
            <h2 className="text-4xl font-bold mb-4 text-white">{t("quickAccess.heading")}</h2>
            <p className="text-xl mb-8 text-white/90">{t("quickAccess.description")}</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="https://model.openindu.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center px-8 py-4 bg-white text-[#0B72B5] rounded-lg hover:bg-sky-50 transition-colors font-medium text-lg"
              >
                {t("quickAccess.cta")}
                <ExternalLink className="ml-2 h-5 w-5" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">{t("features.heading")}</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">{t("features.subheading")}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {featureKeys.map((feature) => {
              const items = t(`features.${feature.key}.items`, { returnObjects: true }) as string[];
              return (
                <div
                  key={feature.key}
                  className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-2xl p-8 hover:shadow-xl transition-all"
                >
                  <div className="flex items-center justify-center w-16 h-16 bg-sky-100 text-[#0B72B5] rounded-xl mb-6">
                    <feature.icon className="w-8 h-8" />
                  </div>
                  <h3 className="text-2xl font-semibold text-gray-900 mb-3">
                    {t(`features.${feature.key}.title`)}
                  </h3>
                  <p className="text-gray-600 mb-6">{t(`features.${feature.key}.description`)}</p>
                  <ul className="space-y-2">
                    {items.map((item) => (
                      <li key={item} className="flex items-center gap-2 text-gray-700">
                        <CheckCircle className="w-4 h-4 text-[#0B72B5] flex-shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="py-16 bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">{t("useCases.heading")}</h2>
            <p className="text-lg text-gray-600">{t("useCases.subheading")}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {useCaseKeys.map((key) => (
              <div
                key={key}
                className="bg-white rounded-2xl shadow-sm p-8 hover:shadow-xl transition-all"
              >
                <div className="flex items-center justify-center w-16 h-16 bg-[#0B72B5] text-white rounded-xl mx-auto mb-6">
                  <Cpu className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-semibold text-gray-900 mb-3 text-center">
                  {t(`useCases.${key}.name`)}
                </h3>
                <p className="text-gray-600 text-center mb-4">{t(`useCases.${key}.description`)}</p>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-500 mb-2">{t("useCases.exampleLabel")}</p>
                  <p className="text-sm text-gray-700 font-medium">
                    {t(`useCases.${key}.example`)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Service Architecture */}
      <section className="py-16 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">{t("architecture.heading")}</h2>
            <p className="text-lg text-gray-600">{t("architecture.subheading")}</p>
          </div>
          <div className="max-w-4xl mx-auto">
            <div className="bg-sky-50 p-8 rounded-2xl border border-sky-200">
              <div className="space-y-4">
                {architectureKeys.map((key, index) => (
                  <div key={key} className="border-l-2 border-sky-300 ml-6 pl-6">
                    <div className="flex items-center gap-4">
                      <div className="flex-shrink-0 w-12 h-12 bg-[#0B72B5] text-white rounded-lg flex items-center justify-center font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-1">
                          {t(`architecture.${key}.title`)}
                        </h4>
                        <p className="text-sm text-gray-600">{t(`architecture.${key}.subtitle`)}</p>
                        <p className="text-sm text-gray-700">
                          {t(`architecture.${key}.description`)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Integration Example */}
      <section className="py-16 bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">{t("integration.heading")}</h2>
            <p className="text-lg text-gray-600">{t("integration.subheading")}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-gray-900 rounded-2xl p-4 sm:p-8 overflow-x-auto">
              <pre className="text-green-400 text-sm">
                {`${t("integration.codeComment")}
import openai

# Configure the API endpoint and key
openai.api_base = "https://model.openindu.com/v1"
openai.api_key = "your-api-key"

# Call the LLM API
response = openai.ChatCompletion.create(
  model="gpt-4",
  messages=[
    { "role": "user", "content": "${t("integration.codeMessage")}" }
  ]
)
print(response.choices[0].message.content)`}
              </pre>
            </div>
            <div className="bg-sky-50 p-8 rounded-2xl border border-sky-200">
              <h4 className="font-semibold text-gray-900 mb-4">
                {t("integration.endpointsHeading")}
              </h4>
              <div className="grid grid-cols-1 gap-2 text-sm text-gray-700">
                <div className="font-medium text-gray-900 mb-2">{t("integration.chatLabel")}</div>
                <ul className="space-y-1 ml-4 text-gray-600">
                  <li>• /v1/chat/completions</li>
                  <li>• /v1/responses</li>
                  <li>• /v1/responses/compact</li>
                  <li>• /v1/messages</li>
                </ul>
                <div className="font-medium text-gray-900 mb-2 mt-4">
                  {t("integration.embedLabel")}
                </div>
                <ul className="space-y-1 ml-4 text-gray-600">
                  <li>• /v1beta/models</li>
                  <li>• /v1/embeddings</li>
                  <li>• /v1/rerank</li>
                </ul>
                <div className="font-medium text-gray-900 mb-2 mt-4">
                  {t("integration.imageLabel")}
                </div>
                <ul className="space-y-1 ml-4 text-gray-600">
                  <li>• /v1/images/generations</li>
                  <li>• /v1/images/edits</li>
                  <li>• /v1/images/variations</li>
                </ul>
                <div className="font-medium text-gray-900 mb-2 mt-4">
                  {t("integration.voiceLabel")}
                </div>
                <ul className="space-y-1 ml-4 text-gray-600">
                  <li>• /v1/audio/speech</li>
                  <li>• /v1/audio/transcriptions</li>
                  <li>• /v1/audio/translations</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
