#!/usr/bin/env node

import { chromium } from "playwright";
import { writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const BASE_URL = "http://localhost:4173";

const pages = [
  { url: "/", label: "home" },
  { url: "/architecture", label: "architecture" },
  { url: "/motion-control", label: "motion-control" },
];

const viewports = [
  { width: 1280, height: 720, name: "Desktop" },
  { width: 768, height: 1024, name: "Tablet" },
  { width: 375, height: 667, name: "Mobile" },
];

async function auditAccessibility(page, pagePath) {
  const issues = [];

  // 检查按钮大小 (包括所有交互元素: 按钮、链接、tab索引)
  const buttons = await page.evaluate(() => {
    const selectors = [
      "button",
      "a", // 所有链接 (包括LanguageSwitcherCompact)
      '[role="button"]',
      '[tabindex="0"]',
    ];

    const els = new Set();
    selectors.forEach((sel) => {
      document.querySelectorAll(sel).forEach((el) => els.add(el));
    });

    return Array.from(els)
      .filter((el) => {
        // 排除隐藏和不可见的元素
        const style = window.getComputedStyle(el);
        return style.display !== "none" && style.visibility !== "hidden" && el.offsetHeight > 0;
      })
      .map((el) => ({
        tag: el.tagName,
        width: el.offsetWidth,
        height: el.offsetHeight,
        text: el.innerText?.substring(0, 20),
        classes: el.className,
      }));
  });

  buttons.forEach((btn) => {
    if (btn.width < 44 || btn.height < 44) {
      issues.push({
        type: "touch-target-small",
        element: btn.tag,
        size: `${btn.width}x${btn.height}`,
        text: btn.text,
        classes: btn.classes,
      });
    }
  });

  // 检查键盘焦点
  const keyboardIssues = await page.evaluate(() => {
    const issues = [];

    // 检查是否有可点击元素
    const clickables = document.querySelectorAll("button, a, input, select, textarea, [tabindex]");
    if (clickables.length === 0) {
      issues.push({ type: "no-focusable-elements" });
    }

    // 检查焦点指示器
    let hasFocusStyle = false;
    document.querySelectorAll("*").forEach((el) => {
      const style = window.getComputedStyle(el);
      const focusStyle = getComputedStyle(el, ":focus");
      if (focusStyle && focusStyle.outline !== "none") {
        hasFocusStyle = true;
      }
    });

    if (!hasFocusStyle) {
      issues.push({ type: "no-focus-indicator" });
    }

    return issues;
  });

  issues.push(...keyboardIssues);

  // 移动端字号检查。
  //
  // WCAG 没有规定最小字号（它管的是对比度和缩放，两者另有检查），所以这里
  // 用分级规则而不是一刀切 14px：段落级正文 <14px 判不合格；标签 chip、
  // eyebrow、caption 这类辅助文字允许到 12px，低于 12px 才判不合格。
  // 一刀切 14px 会逼着把 chip 撑成正文大小，反而破坏排版层级。
  const textSizeIssues = await page.evaluate(() => {
    const ABSOLUTE_FLOOR = 12;
    const BODY_MIN = 14;
    const issues = [];
    document.querySelectorAll("p, span, li, button").forEach((el) => {
      const text = el.innerText?.trim();
      if (!text) return;
      const fontSize = parseFloat(window.getComputedStyle(el).fontSize);
      // Paragraph-length copy is held to the body minimum; short labels are not.
      const isBodyCopy = el.tagName === "P" && text.length > 30;
      const min = isBodyCopy ? BODY_MIN : ABSOLUTE_FLOOR;
      if (fontSize < min) {
        issues.push({
          type: "text-too-small",
          size: fontSize,
          min,
          kind: isBodyCopy ? "body" : "label",
          text: text.substring(0, 20),
        });
      }
    });
    return issues.slice(0, 3);
  });

  issues.push(...textSizeIssues);

  return issues;
}

async function main() {
  let browser;

  try {
    console.log("📱 Mobile & Accessibility Audit\n");
    browser = await chromium.launch({ headless: true });

    const results = {
      timestamp: new Date().toISOString(),
      audits: {},
    };

    for (const pageInfo of pages) {
      console.log(`\n📄 Testing: ${pageInfo.label}`);
      results.audits[pageInfo.label] = {};

      for (const viewport of viewports) {
        const context = await browser.newContext({
          viewport: { width: viewport.width, height: viewport.height },
        });
        const page = await context.newPage();

        try {
          await page.goto(`${BASE_URL}${pageInfo.url}`, { waitUntil: "networkidle" });
          const issues = await auditAccessibility(page, pageInfo.url);

          results.audits[pageInfo.label][viewport.name] = {
            viewport: `${viewport.width}x${viewport.height}`,
            issueCount: issues.length,
            issues: issues.slice(0, 5),
          };

          const status = issues.length === 0 ? "✅" : "⚠️";
          console.log(`  ${status} ${viewport.name}: ${issues.length} 个问题`);
        } catch (error) {
          console.error(`  ❌ Error: ${error.message}`);
        } finally {
          await context.close();
        }
      }
    }

    // 生成建议
    console.log("\n📋 修复建议:\n");

    const allIssues = [];
    Object.entries(results.audits).forEach(([page, viewports]) => {
      Object.entries(viewports).forEach(([vp, data]) => {
        if (data.issues) {
          data.issues.forEach((issue) => {
            allIssues.push({ page, viewport: vp, ...issue });
          });
        }
      });
    });

    if (allIssues.length === 0) {
      console.log("✅ 无无障碍问题检测到！");
    } else {
      const touchTargets = allIssues.filter((i) => i.type === "touch-target-small");
      const focusIssues = allIssues.filter((i) => i.type === "no-focus-indicator");
      const textIssues = allIssues.filter((i) => i.type === "text-too-small");

      if (touchTargets.length > 0) {
        console.log(`【触控目标太小】${touchTargets.length} 个\n  需要确保按钮/链接最小 44x44px\n`);
      }
      if (focusIssues.length > 0) {
        console.log(`【缺少焦点指示器】${focusIssues.length} 个\n  需要添加 :focus 样式\n`);
      }
      if (textIssues.length > 0) {
        console.log(`【文本太小】${textIssues.length} 个\n  移动端文字应 ≥14px\n`);
      }
    }

    // 保存报告
    const reportPath = resolve(__dirname, "../screenshots/visual-eval/mobile-a11y-audit.json");
    writeFileSync(reportPath, JSON.stringify(results, null, 2));
    console.log(`\n📂 详细报告: ${reportPath}`);

    await browser.close();
  } catch (error) {
    console.error("❌ 审计失败:", error.message);
  }
}

main();
