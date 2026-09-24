import { SOURCES, getSource } from "@/lib/sources/mock"
import { matchSource } from "@/lib/sources/filters"
import { SOURCE_KINDS } from "@/lib/sources/kinds"
import type { SourceFilters } from "@/lib/sources/types"
import type { ChatMode } from "./modes"
import type { Block } from "./types"

export type Responder = (question: string, mode: ChatMode) => { status: string; blocks: Block[] }

const isAuthoritative = (id: string) => {
  const s = getSource(id)
  return !!s && SOURCE_KINDS[s.kind].authority <= 2
}

/** 引用了“已被替代 / 已废止”的规范时，严谨模式必须提醒 */
function statusNotice(ids: string[]): Block[] {
  const outdated = ids.map(getSource).filter((s) => s && s.status && s.status !== "current")
  return outdated.map((s) => ({
    type: "notice",
    tone: "warning",
    title: `${s!.code} 已被替代`,
    content: `回答中引用的《${s!.title}》不是现行版本，用于施工图前请核对新版条文。`,
  }))
}

/** 演示用的“假 AI”：按关键词和模式返回预设的块。接入真实后端后删除。 */
export const mockRespond: Responder = (question, mode) => {
  const q = question.toLowerCase()

  if (/日照|住宅|间距/.test(q)) {
    const filters: SourceFilters = { q: "日照", kinds: ["standard"], regions: ["全国", "上海"] }
    const cited = ["gb50096-2011", "gb50352-2019", "dgj08-sh-housing"]
    const total = SOURCES.filter((s) => matchSource(s, filters)).length
    if (mode === "rigorous") {
      return {
        status: "正在检索规范库（仅权威资料）…",
        blocks: [
          {
            type: "text",
            content:
              "住宅日照需要同时满足国家标准和项目所在地的地方标准 [1][2]。国家标准规定底线要求，上海地方标准对计算方法和间距系数有更具体的规定 [3]。\n\n（演示回答：接入真实知识库后，这里会逐条列出条文编号和原文。）",
            citations: cited,
          },
          ...statusNotice(cited),
          { type: "sources", sourceIds: cited },
          { type: "filters", filters, total },
        ],
      }
    }
    return {
      status: "正在检索规范、论文与案例…",
      blocks: [
        {
          type: "text",
          content: "先说硬性要求：住宅日照要同时满足国家标准和地方标准 [1][2]。在满足规范的前提下，高密度住区可以从形体上争取更多日照 [3]。",
          citations: ["gb50096-2011", "dgj08-sh-housing", "article-sunlight-sh"],
        },
        {
          type: "idea",
          content:
            "可以试试把板楼切成“退台 + 错位”的形体：南侧逐层退台，让后排楼的底层也能“看到”太阳；北侧用光井把光引进进深较大的房间。安藤忠雄在小住宅里常用类似的“光的切口”，这种手法也可以放大到住区尺度去推敲。",
          refs: ["report-church-of-light"],
        },
        { type: "sources", sourceIds: ["gb50096-2011", "dgj08-sh-housing", "article-sunlight-sh", "book-timeless-way"] },
      ],
    }
  }

  if (/安藤|光之教堂|混凝土|教堂/.test(q)) {
    if (mode === "rigorous") {
      return {
        status: "正在检索规范库（仅权威资料）…",
        blocks: [
          {
            type: "notice",
            tone: "info",
            title: "权威资料中没有找到可引用的内容",
            content: "这个问题更偏向案例和设计手法，规范和图集里没有直接相关的条文。我不会在没有出处的情况下作答。",
            action: { label: "换成发散模式再问一次", switchTo: "divergent" },
          },
        ],
      }
    }
    const filters: SourceFilters = { q: "安藤忠雄", kinds: ["report", "magazine"], regions: [] }
    return {
      status: "正在检索项目报道与图片…",
      blocks: [
        {
          type: "text",
          content: "光之教堂（茨木春日丘教会）建成于 1989 年，以清水混凝土墙体上切出的十字形光缝著称 [1]。下面是相关图片和报道，点击可在右侧预览。",
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
        {
          type: "idea",
          content: "“用减法做光”的思路可以借用到你的项目里：先做一个完整、封闭的体量，再只切一道缝，让光成为空间里唯一的装饰。",
        },
        { type: "filters", filters, total: SOURCES.filter((s) => matchSource(s, filters)).length },
      ],
    }
  }

  const hits = SOURCES.filter((s) => matchSource(s, { q: question.slice(0, 12), kinds: [], regions: [] }))
  if (mode === "rigorous") {
    const picked = hits.filter((s) => isAuthoritative(s.id)).slice(0, 3)
    if (!picked.length) {
      return {
        status: "正在检索规范库（仅权威资料）…",
        blocks: [
          {
            type: "notice",
            tone: "info",
            title: "权威资料中没有找到可引用的内容",
            content: "规范、规章和图集里没有和这个问题直接相关的条文。你可以换个说法，或者切换到发散模式查找论文和案例。",
            action: { label: "换成发散模式再问一次", switchTo: "divergent" },
          },
        ],
      }
    }
    return {
      status: "正在检索规范库（仅权威资料）…",
      blocks: [
        {
          type: "text",
          content: `（演示回答）在权威资料中找到 ${picked.length} 份相关内容 [1]，每条结论都附有出处。`,
          citations: [picked[0].id],
        },
        { type: "sources", sourceIds: picked.map((s) => s.id) },
      ],
    }
  }

  const picked = (hits.length ? hits : SOURCES).slice(0, 3)
  return {
    status: "正在检索知识库…",
    blocks: [
      {
        type: "text",
        content: `这是一段演示回答。我在知识库中找到了 ${picked.length} 份可能相关的资料 [1]，点击引用编号或下方卡片，可以在右侧预览原文。`,
        citations: [picked[0].id],
      },
      { type: "idea", content: "（演示）发散模式下，这里会给出类比、案例联想和可以尝试的设计方向。" },
      { type: "sources", sourceIds: picked.map((s) => s.id) },
    ],
  }
}
