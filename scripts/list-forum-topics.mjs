#!/usr/bin/env node
/**
 * Enumerate every topic in every public forum category via the Discourse API,
 * so page content can link to posts that actually exist. Hand-guessed
 * category sub-paths were 404ing.
 */
const BASE = "https://forum.openindu.com";

const site = await fetch(`${BASE}/site.json`).then((r) => r.json());
const cats = site.categories.filter((c) => c.slug);

for (const c of cats) {
  let topics = [];
  try {
    const j = await fetch(`${BASE}/c/${c.slug}/${c.id}.json`).then((r) => r.json());
    topics = j.topic_list?.topics ?? [];
  } catch {
    console.log(`\n### ${c.name} (${c.slug}/${c.id}) — 读取失败`);
    continue;
  }
  const real = topics.filter((t) => !t.pinned_globally && t.posts_count >= 1);
  console.log(`\n### ${c.name}  (/c/${c.slug}/${c.id})  ${real.length} 个主题`);
  for (const t of real) {
    console.log(`  ${BASE}/t/topic/${t.id}`);
    console.log(`      ${t.title}`);
    console.log(
      `      回复 ${t.reply_count ?? 0} · 浏览 ${t.views ?? 0} · 建于 ${String(t.created_at).slice(0, 10)}`,
    );
  }
}
