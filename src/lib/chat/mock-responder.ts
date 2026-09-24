import { SOURCES } from "@/lib/sources/mock"
import { matchSource } from "@/lib/sources/filters"
import type { SourceFilters } from "@/lib/sources/types"
import type { Block } from "./types"

/** 演示用的“假 AI”：按关键词返回预设的块。接入真实后端后删除。 */
export function mockRespond(question: string): { status: string; blocks: Block[] } {
  const q = question.toLowerCase()

  if (/日照|住宅|间距/.test(q)) {
    const filters: SourceFilters = { q: "日照", kinds: ["standard"], regions: ["全国", "上海"] }
    return {
      status: "正在检索规范库…",
      blocks: [
        {
          type: "text",
          content:
            "住宅日照一般需要同时对照国家标准和项目所在地的地方标准 [1][2]。国家标准给出底线要求，地方标准往往在计算方法和间距系数上更具体 [3]。\n\n（演示回答：接入真实知识库后，这里会给出具体条文与引用段落。）",
          citations: ["gb50096-2011", "gb50352-2019", "dgj08-sh-housing"],
        },
        { type: "filters", filters, total: SOURCES.filter((s) => matchSource(s, filters)).length },
        { type: "sources", sourceIds: ["gb50096-2011", "gb50352-2019", "dgj08-sh-housing", "article-sunlight-sh"] },
      ],
    }
  }

  if (/安藤|光之教堂|混凝土|教堂/.test(q)) {
    const filters: SourceFilters = { q: "安藤忠雄", kinds: ["report", "magazine"], regions: [] }
    return {
      status: "正在检索项目报道与图片…",
      blocks: [
        {
          type: "text",
          content:
            "光之教堂（茨木春日丘教会）建成于 1989 年，以清水混凝土墙体上切出的十字形光缝著称 [1]。下面是相关图片和报道，点击可在右侧预览。",
          citations: ["report-church-of-light"],
        },
        {
          type: "images",
          images: [
            { id: "i1", caption: "礼拜堂内部 · 光的十字", sourceId: "report-church-of-light", tone: 0 },
            { id: "i2", caption: "入口斜墙", sourceId: "report-church-of-light", tone: 1 },
            { id: "i3", caption: "平面图", sourceId: "report-church-of-light", tone: 2 },
            { id: "i4", caption: "剖面图", sourceId: "report-church-of-light", tone: 3 },
          ],
        },
        { type: "filters", filters, total: SOURCES.filter((s) => matchSource(s, filters)).length },
      ],
    }
  }

  const hits = SOURCES.filter((s) => matchSource(s, { q: question.slice(0, 12), kinds: [], regions: [] }))
  const picked = (hits.length ? hits : SOURCES).slice(0, 3)
  return {
    status: "正在检索知识库…",
    blocks: [
      {
        type: "text",
        content: `这是一段演示回答。我在知识库中找到了 ${picked.length} 份可能相关的资料 [1]，点击引用编号或下方卡片，可以在右侧预览原文。`,
        citations: [picked[0].id],
      },
      { type: "sources", sourceIds: picked.map((s) => s.id) },
    ],
  }
}
