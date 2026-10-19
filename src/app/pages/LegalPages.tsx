import { Link } from "react-router";
import { SEO } from "../components/SEO";

interface LegalSubSection {
  title?: string;
  paragraphs?: string[];
  items?: string[];
}

interface LegalSection {
  title: string;
  paragraphs?: string[];
  items?: string[];
  subSections?: LegalSubSection[];
}

function LegalPage({
  title,
  description,
  canonicalPath,
  updatedAt,
  sections,
  contactNote,
}: {
  title: string;
  description: string;
  canonicalPath: string;
  updatedAt: string;
  sections: LegalSection[];
  contactNote?: string;
}) {
  return (
    <section className="bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <SEO
        title={`${title}｜openIndu社区`}
        description={description}
        canonicalPath={canonicalPath}
        localized={false}
      />
      <div className="mx-auto max-w-4xl rounded-2xl bg-white p-6 shadow-sm sm:p-10">
        <div className="mb-8 border-b border-gray-100 pb-6">
          <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
          <p className="mt-3 text-gray-600">{description}</p>
          <p className="mt-2 text-sm text-gray-500">最后更新：{updatedAt}</p>
        </div>

        <div className="space-y-8 text-gray-700">
          {sections.map((section) => (
            <section key={section.title} className="space-y-3">
              <h2 className="text-xl font-semibold text-gray-900">{section.title}</h2>
              {section.paragraphs?.map((paragraph, i) => (
                <p key={i} className="leading-7">
                  {paragraph}
                </p>
              ))}
              {section.items && (
                <ul className="list-disc space-y-2 pl-6 leading-7">
                  {section.items.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              )}
              {section.subSections?.map((sub, i) => (
                <div key={i} className="mt-3 space-y-2 rounded-lg border-l-2 border-sky-100 pl-4">
                  {sub.title && (
                    <h3 className="text-base font-semibold text-gray-800">{sub.title}</h3>
                  )}
                  {sub.paragraphs?.map((p, j) => (
                    <p key={j} className="leading-7">
                      {p}
                    </p>
                  ))}
                  {sub.items && (
                    <ul className="list-disc space-y-1 pl-6 leading-7">
                      {sub.items.map((item, j) => (
                        <li key={j}>{item}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </section>
          ))}
        </div>

        {contactNote !== undefined && (
          <div className="mt-10 rounded-xl bg-sky-50 p-4 text-sm text-sky-800">
            {contactNote || (
              <>
                如你对本声明有疑问，或希望行使访问、更正、删除个人信息等权利，请通过
                <a href="mailto:contact@openindu.com" className="font-medium underline">
                  {" "}
                  contact@openindu.com{" "}
                </a>
                与 openIndu社区联系。
              </>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

export function PrivacyPolicy() {
  return (
    <LegalPage
      title="隐私声明"
      description="本声明说明 openIndu社区如何收集、使用、存储和保护你在使用社区门户、资源中心、论坛及相关服务时提交或产生的信息。"
      canonicalPath="/privacy"
      updatedAt="2026-08-26"
      contactNote=""
      sections={[
        {
          title: "一、适用范围",
          paragraphs: [
            "本隐私声明适用于 openIndu社区网站（openindu.com）、资源中心、社区论坛（forum.openindu.com）、登录注册、文档与软件下载服务，以及与上述服务相关的页面和接口。",
            "第三方网站或服务的隐私实践不受本声明约束，请查阅对应第三方的隐私政策。",
          ],
        },
        {
          title: "二、我们如何收集和处理个人信息",
          paragraphs: ["openIndu社区在以下情形收集个人信息："],
          subSections: [
            {
              title: "a）账号服务",
              items: [
                "注册 / 登录：收集手机号和短信验证码校验结果，用于身份核验和账号创建；不存储验证码明文。",
                "个人资料：你可选择设置昵称；手机号在页面上仅做脱敏展示（如 138****8888）。",
                "账号角色：系统自动分配角色（普通用户、会员、管理员），用于权限判断。",
              ],
            },
            {
              title: "b）下载服务",
              items: [
                "下载记录：记录你的文档和软件下载行为（资源 ID、下载时间），用于每日限额统计和下载安全审计。",
                "下载链接：通过阿里云 OSS 预签名 URL 提供文件下载，不存储文件内容副本于本地服务器。",
              ],
            },
            {
              title: "c）服务优化与安全运营",
              items: [
                "自动收集：访问时间、IP 地址、请求路径、浏览器 User-Agent、HTTP 状态码，用于故障排查和异常检测。",
                "浏览器标识：在本地存储生成随机 client_id（UUID），用于统计独立访客数（PV/UV）和识别登录设备；该标识不含个人信息，清除浏览器数据即失效。",
                "访问日志：仅在安全必要期限内保留，超期自动清除。",
              ],
            },
            {
              title: "d）你主动提供的信息",
              paragraphs: [
                "如果你通过邮件、Issue 或其他方式主动联系 openIndu社区，我们会收集你提供的联系信息（如邮箱、问题描述），仅用于回复和处理你的请求。",
              ],
            },
            {
              title: "e）社区论坛服务",
              items: [
                "论坛账号：通过 openIndu社区账号登录社区论坛（forum.openindu.com），我们不会收集额外的账号信息。",
                "论坛内容：你在论坛中发布的帖子、评论及回复内容被存储于服务器，用于展示、检索及社区管理。",
                "用户发帖信息：显示你的昵称、头像（若设置）及发帖时间，但不公开展示手机号等敏感个人信息。",
                "使用目的：维护社区讨论秩序、改进服务、防止滥用和恶意行为。",
                "建议：请勿在论坛发布个人隐私信息（如真实姓名、联系电话、身份证号）或涉及商业机密的技术细节；论坛内容在法律要求时可能被披露。",
              ],
            },
            {
              title: "f）智能咨询服务",
              items: [
                "会话记录：面向会员开放的「社区智能咨询」功能会将你的提问内容、AI 回复及来源文档信息存储于服务器数据库，用于支持跨设备的历史会话查看。",
                "会话标题：由系统自动取自你第一条提问的前 30 个字符，不额外收集任何信息。",
                "使用目的：提供连续对话体验、服务质量改进及异常检测。",
                "数据范围：仅会员账号下产生的问答内容，未登录用户及非会员用户不产生此类数据。",
                "建议：请勿在提问中输入个人隐私信息（如姓名、手机号）或你所在单位的保密技术参数；聊天内容仅供工业自动化技术咨询，不作任何第三方分析或商业用途。",
              ],
            },
          ],
        },
        {
          title: "三、我们如何使用 Cookie 及类似技术",
          paragraphs: [
            "为保障登录态和账号安全，openIndu社区使用浏览器本地存储（localStorage）保存访问令牌、刷新令牌、脱敏用户信息，以及一个随机生成的浏览器标识 client_id（用于访问统计与登录设备识别）。",
            "我们不使用第三方跟踪 Cookie，不通过 Cookie 向第三方广告平台传送个人数据。详见《关于 Cookies》页面。",
          ],
        },
        {
          title: "四、我们如何共享个人信息",
          paragraphs: ["除以下情形外，openIndu社区不向无关第三方出售、出租或共享你的个人信息："],
          items: [
            "你明确同意后向指定第三方共享授权范围内的信息。",
            "履行法律义务、响应司法或行政机关的合法要求。",
            "使用阿里云短信、对象存储等基础服务时，相关服务商仅在提供服务所必需的范围内处理信息，并受合同约束。",
            "为保护 openIndu社区、用户或公众的重大合法权益，依法进行必要披露。",
          ],
        },
        {
          title: "五、信息保留期限",
          paragraphs: ["openIndu社区在达成收集目的所需的最短期限内保留个人信息："],
          items: [
            "账号信息：在账号存续期间保留；账号注销后依法保留必要期限后删除。",
            "下载记录：保留至统计分析完成或法律法规要求的期限届满。",
            "访问日志：通常不超过 30 天，安全事件调查期间可延长保留。",
            "智能咨询记录（会话及消息）：随账号存续期间保留；账号注销后一并删除。你也可在聊天界面随时删除单条会话及其全部消息，或通过邮件申请删除所有聊天记录。",
            "你可通过发送邮件至 contact@openindu.com 申请提前删除，我们将在一个月内响应处理。",
          ],
        },
        {
          title: "六、我们如何保护个人信息",
          items: [
            "采用 JWT（JSON Web Token）双令牌机制：访问令牌短效（15 分钟），刷新令牌支持轮换，失效令牌加入后端黑名单，防止 Token 重放攻击。",
            "数据库密码和密钥通过环境变量注入，不写入代码仓库。",
            "手机号在所有前端页面均做脱敏处理，不以明文形式返回给客户端。",
            "文件下载通过预签名临时 URL（有效期 5 分钟）提供，不直接暴露存储路径。",
            "HTTPS 全站加密传输，防止中间人攻击。",
            "互联网传输无法保证绝对安全。如发现账号或信息异常，请立即联系 openIndu社区。",
          ],
        },
        {
          title: "七、你的权利",
          paragraphs: [
            "根据适用法律，你可能享有以下权利，请通过 contact@openindu.com 联系我们行使：",
          ],
          items: [
            "访问权：查阅 openIndu社区持有的与你相关的个人信息。",
            "更正权：要求更正不准确或不完整的个人信息（如昵称）。",
            "删除权：要求删除你的账号及相关个人信息（注销账号请联系 contact@openindu.com）；智能咨询记录可在聊天界面直接删除单条会话，或通过邮件申请批量删除。",
            "撤回授权：你可通过浏览器清除本地存储撤回 Token，但此前基于授权的处理行为不受影响。",
            "投诉权：向有权个人信息保护机构提起投诉或举报。",
          ],
        },
        {
          title: "八、个人信息存储地点",
          paragraphs: [
            "openIndu社区的服务器和数据库部署于中华人民共和国境内（或合规的境外节点），文件存储使用阿里云对象存储（OSS）服务，适用中华人民共和国相关数据安全和个人信息保护法规。",
            "如涉及数据跨境传输，openIndu社区将依据适用法律履行安全评估和告知义务。",
          ],
        },
        {
          title: "九、儿童个人信息保护",
          paragraphs: [
            "openIndu社区的服务主要面向年满 14 周岁的用户。我们不会主动收集未满 14 周岁儿童的个人信息。",
            "如我们发现在未获得可证实的监护人同意的情况下收集了儿童个人信息，将尽快予以删除。如你发现此类情况，请立即联系 contact@openindu.com。",
          ],
        },
        {
          title: "十、声明更新",
          paragraphs: [
            "openIndu社区可能根据服务变化或合规要求更新本声明，最新版本将在本页面发布并立即生效。",
            "对本声明的重大变更，我们将通过页面显著位置提示或其他适当方式通知你。继续使用服务即表示你已了解并接受更新后的内容。",
          ],
        },
        {
          title: "十一、如何联系我们",
          paragraphs: ["如你对本隐私声明有任何疑问、意见或投诉，请通过以下方式联系 openIndu社区："],
          items: [
            "联系邮箱：contact@openindu.com",
            "我们将在收到请求后一个月内予以回复。如请求较为复杂，处理期限可延长至两个月，并会提前告知原因。",
          ],
        },
      ]}
    />
  );
}

export function LegalNotice() {
  return (
    <LegalPage
      title="法律声明"
      description="本声明规定 openIndu社区网站的访问条件、知识产权、免责事项及用户行为规范，访问或使用本网站即表示你接受以下条款。"
      canonicalPath="/legal"
      updatedAt="2026-06-29"
      contactNote=""
      sections={[
        {
          title: "一、规则及网站访问条件",
          paragraphs: [
            'openIndu社区（以下简称"社区"）依据国家法律法规及市场变化，保留对本声明的修改权利。访问或使用本网站视为你已接受本声明的全部内容。',
            "社区保留在任何时候、不经通知修改或中止网站内容和服务的权利。",
          ],
        },
        {
          title: "二、知识产权与开源许可",
          paragraphs: [
            "网站文字、图片、页面设计、品牌标识及未明确开源的材料均受中华人民共和国著作权法及相关法律保护，版权归 openIndu社区所有（引用第三方内容除外）。",
            "资源中心提供的技术文档、软件包等资源，其著作权及知识产权均归原厂商或原始权利人所有；openIndu社区仅提供检索与分发服务，不主张上述资源的版权。如发现侵权内容，请通过 contact@openindu.com 联系我们，我们将在确认后立即处理。",
            "openIndu社区项目中明确标注开源许可证的代码、文档或资源，按对应许可证的条款使用；未标注许可的内容不得擅自复制、改编或商业使用。",
            "未经社区书面授权，禁止将网站内容用于商业目的或以可能引起混淆的方式使用社区名称和品牌。非商业、非盈利的下载或打印须保留完整版权声明且不得修改。",
          ],
        },
        {
          title: "三、免责声明",
          paragraphs: [
            "openIndu社区力图提供准确的信息，但不保证网站内容的准确性、完整性、充分性和可靠性，亦不保证内容不侵犯任何第三方权利或不含病毒。内容可能随时变更，恕不另行通知。",
          ],
          items: [
            "网站内容按现状提供，仅供学习、研究和参考，不构成特定项目的工程承诺或专业意见。",
            "因网络中断、第三方服务故障、不可抗力或用户自身操作导致的服务中断或损失，社区在合理范围内协助处理，但不承担超出法律规定的赔偿责任。",
            "用户下载和使用资源时，应自行确认适用性、授权边界和文件安全性。",
            "网站中出现的第三方产品或服务名称仅用于说明技术场景，不构成推荐或背书。",
          ],
        },
        {
          title: "四、商标与标识",
          paragraphs: [
            "openIndu、openIndu社区名称、Logo 及相关标识归 openIndu社区所有。未经授权，任何人不得以可能造成混淆或误导的方式使用上述标识。",
            "页面中出现的第三方品牌或商标（如西门子、三菱等工业品牌名称）归其各自权利人所有，仅用于说明兼容性或技术场景，不暗示任何商业关联。",
          ],
        },
        {
          title: "五、第三方链接",
          paragraphs: [
            "本网站可能包含指向 GitHub、Gitee、监控平台或其他第三方网站的链接。这些链接仅为方便用户而提供，不构成对第三方网站内容的推荐或背书。",
            "openIndu社区不控制第三方网站的内容，不对其可用性、准确性或安全性承担责任。访问第三方网站时，请遵守其服务条款和隐私政策。",
          ],
        },
        {
          title: "六、用户行为规范",
          paragraphs: ["你在使用 openIndu社区服务时，不得从事以下行为："],
          items: [
            "违反法律法规或监管规定，或协助他人实施违法行为。",
            "侵犯他人知识产权、肖像权、名誉权、隐私权或其他合法权益。",
            "通过技术手段绕过权限限制、破坏系统安全或进行未授权访问。",
            "批量抓取、爬取网站内容或以自动化方式干扰服务稳定性。",
            "上传、传播恶意代码、病毒或其他有害程序。",
            "以虚假身份注册账号或冒充他人。",
          ],
        },
        {
          title: "七、AI 服务使用规范",
          paragraphs: [
            "openIndu社区可能通过 MCP Server 或其他接口提供 AI 辅助功能。使用 AI 服务时，你需遵守以下规范：",
          ],
          subSections: [
            {
              title: "服务声明",
              paragraphs: [
                "AI 生成内容由大语言模型技术产生，不代表 openIndu社区的立场或专业建议。用户对基于 AI 生成内容所做的决策自行承担责任，使用前应自行核验内容准确性。",
              ],
            },
            {
              title: "合规使用",
              items: [
                "遵守网络安全法、数据安全法、个人信息保护法及相关法规。",
                "禁止利用 AI 服务生成违法、侵权、虚假信息或危害公共安全的内容。",
                "禁止对 AI 服务进行逆向工程、未授权访问或绕过安全机制。",
              ],
            },
            {
              title: "内容责任",
              paragraphs: [
                "你向 AI 服务提交的输入内容须为你所有或已获授权，不得侵犯任何人的合法权益。分享 AI 生成内容时，应标注 AI 生成来源，并自行核验内容准确性。你的提问内容及 AI 回复将存储于 openIndu社区服务器，用于支持历史会话查看；请勿在提问中输入个人隐私信息或你所在单位的保密技术数据。",
              ],
            },
          ],
        },
        {
          title: "八、适用法律与争议解决",
          paragraphs: [
            "本声明及网站访问和使用相关的所有事项均受中华人民共和国法律管辖。",
            "因本声明或使用网站服务引发的争议，双方应首先协商解决；协商不成的，提交 openIndu社区主体注册地有管辖权的人民法院诉讼解决。",
          ],
        },
      ]}
    />
  );
}

export function CookiesPolicy() {
  return (
    <LegalPage
      title="关于 Cookies"
      description="本说明解释 openIndu社区如何使用 Cookies 及本地存储技术，以支持登录态保持、账号安全和基础用户体验。"
      canonicalPath="/cookies"
      updatedAt="2026-06-20"
      contactNote=""
      sections={[
        {
          title: "一、什么是 Cookie",
          paragraphs: [
            "Cookie 是网络服务器存储在用户计算机或移动设备上的纯文本文件，其内容只能由创建它的服务器读取和访问。",
            "Cookie 的常见用途包括：登录身份验证（允许跨页面无缝导航）、存储用户偏好设置，以及用于统计分析的访问计数。",
            "openIndu社区不使用跨站跟踪 Cookie，不向第三方广告平台通过 Cookie 传送个人数据。",
          ],
        },
        {
          title: "二、类似技术：浏览器本地存储",
          paragraphs: [
            "除 Cookie 外，openIndu社区主要使用浏览器本地存储（Web Storage / localStorage）保存登录令牌和用户基本信息。本地存储可容纳更大量的数据，且不会像 Cookie 一样随每次请求自动发送到服务器，因此具有更好的安全隔离性。",
          ],
        },
        {
          title: "三、我们存储的数据项",
          paragraphs: ["下表列出 openIndu社区当前在浏览器本地存储中保存的数据项："],
          subSections: [
            {
              title: "openindu_portal_token（访问令牌）",
              items: [
                "用途：API 请求身份验证，附加在 Authorization 请求头中。",
                "有效期：15 分钟（由后端签发，前端按需刷新）。",
                "内容：JWT 格式，包含用户 ID 和过期时间，不含手机号明文。",
              ],
            },
            {
              title: "openindu_portal_refresh_token（刷新令牌）",
              items: [
                "用途：在访问令牌过期后，自动向后端换取新的访问令牌，维持登录态。",
                "有效期：7 天（每次使用后轮换，旧令牌失效）。",
                "安全机制：后端维护令牌黑名单，注销后立即失效，无法复用。",
              ],
            },
            {
              title: "openindu_portal_user（用户信息缓存）",
              items: [
                "用途：缓存登录用户的基本信息，供前端页面展示个人中心、角色徽章等 UI。",
                "内容：用户 ID、脱敏手机号、角色（user / member / admin）、昵称（可选）。",
                "注意：手机号在存储和展示时均为脱敏格式，不存储手机号明文。",
              ],
            },
            {
              title: "openindu_client_id（浏览器标识）",
              items: [
                "用途：统计独立访客数（PV/UV）并识别登录设备/浏览器，用于访问统计与登录会话管理。",
                "内容：随机生成的 UUID，不包含手机号、姓名等个人信息。",
                "有效期：长期保留，直至你清除浏览器数据或站点存储；不随登录/退出变化。",
                "说明：该标识存储于本地浏览器，不会主动上传至第三方；清除浏览器缓存或站点数据即可删除。",
              ],
            },
          ],
        },
        {
          title: "四、Do Not Track（请勿追踪）",
          paragraphs: [
            '部分浏览器提供"请勿追踪"（DNT）功能，向网站发送不希望被追踪的信号。目前尚无国际通行标准规定网站必须如何响应 DNT 请求。',
            "openIndu社区目前不根据 DNT 设置改变数据收集行为，但社区本身不进行跨站行为追踪，不向第三方广告系统共享浏览数据。",
          ],
        },
        {
          title: "五、如何管理本地存储与 Cookie",
          paragraphs: ["你可以通过以下方式管理浏览器本地存储："],
          items: [
            "Chrome / Edge：设置 → 隐私和安全 → Cookie 及其他网站数据 → 查看所有网站数据和权限，找到 openindu.com 后删除。",
            "Firefox：设置 → 隐私与安全 → Cookie 和网站数据 → 管理数据，搜索 openindu 后删除。",
            "Safari：偏好设置 → 隐私 → 管理网站数据，搜索 openindu 后删除。",
            "清除后你将自动退出登录，需要重新进行手机验证码登录。若完全禁用本地存储，登录、下载等需要身份验证的功能将无法正常使用。",
          ],
        },
        {
          title: "六、声明更新",
          paragraphs: [
            "随着功能演进，openIndu社区可能调整本地存储的使用方式，并在本页面更新说明。如有重大变更，将通过网站公告提前告知。",
          ],
        },
      ]}
    />
  );
}

export function LegalIndex() {
  return (
    <section className="bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <SEO
        title="法律与隐私｜openIndu社区"
        description="openIndu社区法律与隐私相关声明。"
        canonicalPath="/legal-center"
        localized={false}
      />
      <div className="mx-auto max-w-4xl rounded-2xl bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-bold text-gray-900">法律与隐私</h1>
        <p className="mt-3 text-gray-600">
          openIndu社区承诺保护用户隐私并遵守适用法律。以下文件说明我们如何收集信息、保护权利及规范使用行为。
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <Link
            to="/privacy"
            className="rounded-xl border border-gray-100 p-5 hover:border-sky-200 hover:bg-sky-50 transition-colors"
          >
            <div className="font-semibold text-gray-900 mb-1">隐私声明</div>
            <div className="text-sm text-gray-500">个人信息收集、使用与保护说明</div>
          </Link>
          <Link
            to="/legal"
            className="rounded-xl border border-gray-100 p-5 hover:border-sky-200 hover:bg-sky-50 transition-colors"
          >
            <div className="font-semibold text-gray-900 mb-1">法律声明</div>
            <div className="text-sm text-gray-500">网站访问条件、知识产权与免责条款</div>
          </Link>
          <Link
            to="/cookies"
            className="rounded-xl border border-gray-100 p-5 hover:border-sky-200 hover:bg-sky-50 transition-colors"
          >
            <div className="font-semibold text-gray-900 mb-1">关于 Cookies</div>
            <div className="text-sm text-gray-500">本地存储与 Cookie 使用说明</div>
          </Link>
        </div>
      </div>
    </section>
  );
}
