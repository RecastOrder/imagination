import type { Source } from "./types"

/**
 * 演示数据。标题和基本信息参考真实资料，
 * 但正文段落全部是【示例占位文本】，不是原文，不能作为设计依据。
 * 接入真实知识库后，这个文件会被 API 调用替换。
 */

const placeholder = (topic: string): string[] => [
  `【示例占位文本】本段用于演示“${topic}”在阅读模式中的排版效果：衬线字体、约 40 字的行宽、1.9 倍行高，适合长时间阅读。`,
  "【示例占位文本】接入真实知识库后，这里会显示资料原文。引用段落会带有锚点，对话中的引用编号可以直接跳转到对应段落并高亮。",
  "【示例占位文本】长文阅读的关键不是字大，而是行宽和行距：一行太长眼睛容易串行，太短则频繁换行打断节奏。",
]

export const SOURCES: Source[] = [
  {
    id: "gb50352-2019",
    kind: "standard",
    title: "民用建筑设计统一标准",
    code: "GB 50352-2019",
    publisher: "中国建筑工业出版社",
    region: "全国",
    year: 2019,
    tags: ["通用", "术语", "层高", "日照"],
    summary: "民用建筑设计的通用技术要求，涵盖基地、总平面、建筑物设计、室内环境等方面。",
    access: "public",
    sections: [
      { id: "s1", title: "1 总则", paragraphs: placeholder("总则") },
      { id: "s2", title: "4 规划控制", paragraphs: placeholder("规划控制") },
      { id: "s3", title: "6 建筑物设计", paragraphs: placeholder("建筑物设计") },
      { id: "s4", title: "7 室内环境", paragraphs: placeholder("室内环境") },
    ],
  },
  {
    id: "gb50016-2014",
    kind: "standard",
    title: "建筑设计防火规范（2018 年版）",
    code: "GB 50016-2014",
    publisher: "中国计划出版社",
    region: "全国",
    year: 2018,
    tags: ["防火", "疏散", "防火分区"],
    summary: "工业与民用建筑防火设计的基本规定，包括防火分区、安全疏散、耐火等级等。",
    access: "member",
    sections: [
      { id: "s1", title: "1 总则", paragraphs: placeholder("总则") },
      { id: "s2", title: "5 民用建筑", paragraphs: placeholder("民用建筑防火") },
      { id: "s3", title: "5.5 安全疏散和避难", paragraphs: placeholder("安全疏散") },
    ],
  },
  {
    id: "gb50096-2011",
    kind: "standard",
    title: "住宅设计规范",
    code: "GB 50096-2011",
    publisher: "中国计划出版社",
    region: "全国",
    year: 2011,
    tags: ["住宅", "套型", "日照"],
    summary: "住宅建筑的套内空间、共用部分、室内环境与建筑设备等设计要求。",
    access: "member",
    sections: [
      { id: "s1", title: "5 套内空间", paragraphs: placeholder("套内空间") },
      { id: "s2", title: "7 室内环境", paragraphs: placeholder("室内环境") },
    ],
  },
  {
    id: "dgj08-sh-housing",
    kind: "standard",
    title: "上海市住宅设计标准",
    code: "DGJ 08-20",
    region: "上海",
    year: 2019,
    tags: ["住宅", "地方标准", "日照"],
    summary: "上海地区住宅设计的地方性补充要求，常与国家标准对照使用。",
    access: "member",
    sections: [
      { id: "s1", title: "总则", paragraphs: placeholder("地方标准总则") },
      { id: "s2", title: "日照与间距", paragraphs: placeholder("日照与间距") },
    ],
  },
  {
    id: "atlas-12j201",
    kind: "atlas",
    title: "平屋面建筑构造",
    code: "12J201",
    publisher: "中国建筑标准设计研究院",
    region: "全国",
    year: 2012,
    tags: ["构造", "屋面", "防水"],
    summary: "平屋面常用构造做法的标准图集，包含保温、防水、排水节点。",
    access: "public",
    sections: [
      { id: "s1", title: "说明", paragraphs: placeholder("图集说明") },
      { id: "s2", title: "节点索引", paragraphs: placeholder("节点索引") },
    ],
  },
  {
    id: "book-timeless-way",
    kind: "book",
    title: "建筑的永恒之道",
    authors: ["克里斯托弗·亚历山大"],
    publisher: "知识产权出版社",
    region: "美国",
    year: 1979,
    tags: ["理论", "模式语言"],
    summary: "提出“无名特质”与模式语言的思想，讨论建筑与城镇如何获得生命力。",
    access: "public",
    sections: [
      { id: "s1", title: "永恒之道", paragraphs: placeholder("永恒之道") },
      { id: "s2", title: "无名特质", paragraphs: placeholder("无名特质") },
      { id: "s3", title: "模式语言", paragraphs: placeholder("模式语言") },
    ],
  },
  {
    id: "report-church-of-light",
    kind: "report",
    title: "光之教堂：混凝土与光的对话",
    authors: ["编辑部"],
    region: "日本·大阪",
    year: 1989,
    tags: ["安藤忠雄", "宗教建筑", "清水混凝土", "光"],
    summary: "关于安藤忠雄设计的茨木春日丘教会（光之教堂）的项目报道。",
    access: "public",
    sections: [
      { id: "s1", title: "项目概况", paragraphs: placeholder("项目概况") },
      { id: "s2", title: "光的十字", paragraphs: placeholder("光的十字") },
    ],
  },
  {
    id: "mag-jianzhuxuebao-2023-08",
    kind: "magazine",
    title: "建筑学报 · 城市更新专辑",
    code: "2023 年第 8 期",
    region: "全国",
    year: 2023,
    tags: ["城市更新", "既有建筑改造"],
    summary: "围绕城市更新与既有建筑改造的专题文章合集。",
    access: "member",
    sections: [
      { id: "s1", title: "卷首", paragraphs: placeholder("卷首") },
      { id: "s2", title: "专题：城市更新", paragraphs: placeholder("城市更新专题") },
    ],
  },
  {
    id: "article-sunlight-sh",
    kind: "article",
    title: "高密度住区日照分析方法比较",
    authors: ["示例作者"],
    region: "上海",
    year: 2021,
    tags: ["住宅", "日照", "分析方法"],
    summary: "比较多种日照分析工具与方法在高密度住区中的适用性。",
    access: "public",
    sections: [
      { id: "s1", title: "引言", paragraphs: placeholder("引言") },
      { id: "s2", title: "方法比较", paragraphs: placeholder("方法比较") },
    ],
  },
]

export function getSource(id: string): Source | undefined {
  return SOURCES.find((s) => s.id === id)
}

export const REGIONS = Array.from(new Set(SOURCES.map((s) => s.region)))
export const YEAR_RANGE = {
  min: Math.min(...SOURCES.map((s) => s.year)),
  max: Math.max(...SOURCES.map((s) => s.year)),
}
