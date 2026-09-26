# 019 资料库接 hold：规范 · 图集 · 媒体

## 要解决的问题
资料库原来只有 Cairn 的 3,413 张规范卡片。owner 2026-09-26：「把规范接入规范， 图集接入图集，媒体接入媒体。 后续最好是对应接口自动接入。」这些资料的正本都在 hold 上，合计二十多万条。

## 方案

```
浏览器 ── /api/sources/search?q&kind&region&from&to ──▶ 本平台服务器 ──┬─ 本机资料（cairn-kb 卡片）在进程里筛
                                                                          └─ tailnet 直连 hold:8740（令牌）── holdlib
                                                                                      目录每 30 分钟从台账现算：
                                                                                      pdf-ledger + 名录 ⇒ 规范 / 图集
                                                                                      yingzao/*/cards   ⇒ 媒体
```

- **检索改到服务端**：以前整张清单一次发到浏览器再筛，二十多万条装不下（本服务限额 700 MB，已用 570 MB）。现在只回前 100 条 + 每个筛选项的计数。
- **「报道」改名「媒体」**（owner 用词），内部 id 仍是 `report`。
- **没有原件就不显示「原版」**：原版视图此刻只有演示页面，拿它显示真资料等于编一张图。hold 资料标 `hasOriginal: false` ⇒ 从文本打开，「原版」置灰并说明；正文上方写「数字请以原件为准」。原件 PDF 是下一刀。
- **hold 那一路出错时如实说**：页面顶部写「这一路暂时没取到，只显示本机资料 —— 不代表没有」，不把它显示成空。

## 用到的设计知识
- **分面检索（Faceted search）**：每个选项后的数字 =「保留其他条件、只改这一项」时的条数，点之前就知道会不会筛没（Nielsen Norman Group 对分面导航的建议）。
- **诚实的系统状态**（Nielsen 第 1 条）：原件没接入、hold 连不上，都写在资料旁边。

## 备选方案与取舍
| 方案 | 结论 |
|---|---|
| 把 hold 的资料拷到 safe-codes | 不用：正本在 hold（R18），而且 2 GB 的机器放不下 |
| 目录装进本平台进程 | 不用：内存不够（上次 3,000 条就 OOM 过一次） |
| 手写一份「要接入的清单」 | 不用：清单会腐烂；从台账现算，新抓的自动出现 |

## 待你决定
- [ ] 同一本规范的英文版、局部修订版现在各算一条（编号不同）。要不要合并显示成「一本 + 几个版本」？（推荐要，下一刀一起做）

## 改动位置
`src/lib/server/hold-library.ts` · `src/app/api/sources/search/route.ts` · `src/app/api/sources/[id]/route.ts` · `src/app/(focus)/library/[id]/page.tsx` · `src/components/library/{library-view,facets}.tsx` · `src/components/reader/reader-view.tsx` · `src/components/ui/segmented.tsx` · `src/lib/sources/{filters,kinds,types}.ts` · hold 端 `~/fleet/holdlib/holdlib.py`
