"use client"

import { useState } from "react"
import { ArrowRightIcon, EyeIcon, PlusIcon, Trash2Icon, UsersIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Kbd } from "@/components/ui/kbd"
import { Skeleton } from "@/components/ui/skeleton"
import { Meter } from "@/components/ui/meter"
import { OtpInput } from "@/components/ui/otp-input"
import { Segmented } from "@/components/ui/segmented"
import { Switch } from "@/components/ui/switch"
import { Citation } from "@/components/blocks/citation"
import { FiltersBlock } from "@/components/blocks/filters-block"
import { IdeaBlock } from "@/components/blocks/idea-block"
import { NoticeBlock } from "@/components/blocks/notice-block"
import { ModeSwitch } from "@/components/chat/mode-switch"
import { GhRequestItem, type GhRequest } from "@/components/projects/gh-generator"
import { AnnotationLayer } from "@/components/drive/annotate/annotation-layer"
import { IssueLayer } from "@/components/drive/annotate/issue-layer"
import { IssuesTab } from "@/components/projects/issues-tab"
import type { Issue } from "@/lib/drive/issues"
import { FormatMatrix } from "@/components/drive/format-matrix"
import { UploadRow } from "@/components/files/upload-row"
import type { UploadItem } from "@/components/files/use-uploader"
import { SourceStatusTag } from "@/components/source/source-meta"
import { LevelSelect, RoleSelect } from "@/components/share/access-menu"
import { ShareDialog } from "@/components/share/share-dialog"
import type { AccessLevel } from "@/lib/access"
import type { Share } from "@/lib/drive/shares"
import type { MemberRole } from "@/lib/projects/types"
import type { ChatMode } from "@/lib/chat/modes"
import { Composer } from "@/components/chat/composer"
import { SourceCard } from "@/components/source/source-card"
import { ProvenanceLine } from "@/components/reader/provenance-line"
import { getSource } from "@/lib/sources/mock"

/**
 * 设计系统样张（活的规范）。
 * 这里展示的就是产品里真正在用的令牌和组件——改了令牌，这一页和整个产品一起变。
 * 以后可以迁移到 Storybook，但对早期项目，一页“活样张”更轻便。
 */
export function DesignGallery() {
  const [active, setActive] = useState<string | null>("gb50352-2019")
  const [mode, setMode] = useState<ChatMode>("rigorous")
  const [view, setView] = useState<"text" | "original">("text")
  const [sw, setSw] = useState(true)
  const [otp, setOtp] = useState("")
  const [role, setRole] = useState<MemberRole>("editor")
  const [level, setLevel] = useState<AccessLevel>("view")
  const [shareOpen, setShareOpen] = useState(false)
  const [shares, setShares] = useState<Share[]>(DEMO_SHARES)
  const noop = { peekId: null, openPeek: () => {}, onSwitchMode: () => {} }
  const s1 = getSource("gb50352-2019")!
  const s2 = getSource("report-church-of-light")!

  return (
    <div className="space-y-16">
      <Section
        id="layers"
        title="1. 令牌的三层结构"
        note="改品牌色只改第 1 层的一个值；做暗色模式只重新映射第 2 层；组件永远只认第 2 层的名字。"
      >
        <div className="grid items-stretch gap-3 md:grid-cols-[1fr_auto_1fr_auto_1fr]">
          <LayerBox title="第 1 层 · 原始值" sub="这是什么颜色" rows={["--stone-50", "--stone-900", "--terracotta-600"]} />
          <Arrow />
          <LayerBox title="第 2 层 · 语义" sub="用在哪里" rows={["--background", "--foreground", "--primary"]} highlight />
          <Arrow />
          <LayerBox title="组件" sub="只引用语义" rows={["bg-background", "text-foreground", "bg-primary"]} />
        </div>
      </Section>

      <Section id="color" title="2. 颜色：90% 中性 + 1 个强调色" note="切换左下角的深浅色，看同一个语义名字如何映射到不同的原始值。">
        <h3 className="mb-3 text-sm font-medium">中性色（界面主体）</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Swatch token="background" cls="bg-background" />
          <Swatch token="surface" cls="bg-surface" />
          <Swatch token="surface-sunken" cls="bg-surface-sunken" />
          <Swatch token="secondary" cls="bg-secondary" />
          <Swatch token="border" cls="bg-border" />
          <Swatch token="border-strong" cls="bg-border-strong" />
          <Swatch token="muted-foreground" cls="bg-muted-foreground" />
          <Swatch token="foreground" cls="bg-foreground" />
        </div>
        <h3 className="mt-8 mb-3 text-sm font-medium">强调色：只用在三个地方</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          <Rule title="① 主操作" desc="一屏最多一个">
            <Button size="sm">登录并开始</Button>
          </Rule>
          <Rule title="② 当前位置 / 选中" desc="浅底 + 强调色图标">
            <span className="inline-flex h-8 items-center gap-2 rounded-md bg-primary-subtle px-2.5 text-sm text-primary-subtle-foreground">
              <span className="size-2 rounded-full bg-primary" />
              资料库
            </span>
          </Rule>
          <Rule title="③ 焦点 / 引用" desc="键盘焦点环、引用高亮">
            <Input placeholder="聚焦时出现强调色的环" className="border-ring ring-[3px] ring-ring/25" />
          </Rule>
        </div>
        <h3 className="mt-8 mb-3 text-sm font-medium">状态色：只在表达状态时出现</h3>
        <div className="flex flex-wrap gap-3">
          <Swatch token="success" cls="bg-success" small />
          <Swatch token="warning" cls="bg-warning" small />
          <Swatch token="destructive" cls="bg-destructive" small />
        </div>
      </Section>

      <Section id="type" title="3. 字体与字号阶梯" note="界面用无衬线（清晰、紧凑）；长文阅读用衬线宋体（有笔画粗细变化，长时间阅读更不累）。">
        <div className="space-y-3">
          {[
            ["32 / 标题", "text-[32px] font-semibold tracking-tight"],
            ["24 / 页面标题", "text-2xl font-semibold"],
            ["18 / 小节标题", "text-lg font-semibold"],
            ["15 / 正文", "text-[15px]"],
            ["14 / 界面文字", "text-sm"],
            ["12 / 辅助信息", "text-xs text-muted-foreground"],
          ].map(([label, cls]) => (
            <div key={label} className="flex items-baseline gap-6 border-b pb-3">
              <span className="w-28 shrink-0 font-mono text-xs text-muted-foreground">{label}</span>
              <span className={cls}>建筑的永恒之道</span>
            </div>
          ))}
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border bg-surface p-5">
            <p className="text-xs text-muted-foreground">font-sans · 界面</p>
            <p className="mt-2 text-[15px] leading-relaxed">住宅日照需同时对照国家标准和地方标准。</p>
          </div>
          <div className="rounded-lg border bg-surface p-5">
            <p className="text-xs text-muted-foreground">font-serif · 阅读</p>
            <p className="mt-2 font-serif text-[17px] leading-[1.9]">住宅日照需同时对照国家标准和地方标准。</p>
          </div>
        </div>
      </Section>

      <Section id="space" title="4. 间距与圆角" note="间距只用 4 的倍数；圆角全部从一个 --radius 推导，改它就能整体变“方”或变“圆”。">
        <div className="flex flex-wrap items-end gap-4">
          {[1, 2, 3, 4, 6, 8, 12, 16].map((n) => (
            <div key={n} className="text-center">
              <div className="bg-primary/70" style={{ width: n * 4, height: n * 4 }} />
              <p className="mt-1 font-mono text-[11px] text-muted-foreground">{n * 4}</p>
            </div>
          ))}
        </div>
        <div className="mt-6 flex flex-wrap gap-4">
          {[
            ["sm", "rounded-sm"],
            ["md", "rounded-md"],
            ["lg", "rounded-lg"],
            ["xl", "rounded-xl"],
            ["2xl", "rounded-2xl"],
          ].map(([n, cls]) => (
            <div key={n} className="text-center">
              <div className={`size-16 border-2 border-border-strong bg-surface ${cls}`} />
              <p className="mt-1 font-mono text-[11px] text-muted-foreground">{n}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section id="button" title="5. 基础组件：按钮的变体" note="页面里只选 variant，不临时改颜色。改按钮风格 = 只改 button.tsx。">
        <div className="flex flex-wrap items-center gap-3">
          <Button>主操作</Button>
          <Button variant="secondary">次要</Button>
          <Button variant="outline">描边</Button>
          <Button variant="ghost">幽灵</Button>
          <Button variant="link">链接</Button>
          <Button variant="destructive">
            <Trash2Icon />
            删除
          </Button>
          <Button disabled>禁用</Button>
          <Button size="icon" variant="outline" aria-label="添加">
            <PlusIcon />
          </Button>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Badge>标签</Badge>
          <Badge variant="outline">描边标签</Badge>
          <Badge variant="primary">生效的条件</Badge>
          <Kbd>⌘K</Kbd>
        </div>
      </Section>

      <Section
        id="business"
        title="6. 业务组件与状态"
        note="同一个组件要把每种状态都画出来：默认、选中、加载、空、错误。这张表就是“状态矩阵”。"
      >
        <div className="grid gap-6 md:grid-cols-2">
          <State label="资料卡片 · 默认">
            <SourceCard source={s2} onOpen={setActive} active={active === s2.id} />
          </State>
          <State label="资料卡片 · 选中（右侧正在预览）">
            <SourceCard source={s1} onOpen={setActive} active={active === s1.id} />
          </State>
          <State label="资料卡片 · 紧凑（对话里的引用）">
            <SourceCard source={s1} index={1} density="compact" onOpen={setActive} />
          </State>
          <State label="资料卡片 · 加载中（骨架屏）">
            <div className="flex gap-3 rounded-lg border p-4">
              <Skeleton className="size-10" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-1/3" />
                <Skeleton className="h-3 w-full" />
              </div>
            </div>
          </State>
          <State label="引用编号 · 默认 / 当前">
            <p className="text-[15px]">
              国家标准给出底线要求
              <Citation n={1} sourceId={s1.id} onOpen={setActive} />
              <Citation n={2} sourceId={s2.id} active onOpen={setActive} />
              。
            </p>
          </State>
          <State label="检索条件（对话 → 资料库的桥）">
            <FiltersBlock block={{ type: "filters", filters: { q: "日照", kinds: ["standard"], regions: ["上海"] }, total: 3 }} ctx={{ peekId: null, openPeek: () => {} }} />
          </State>
          <State label="输入框 · 空闲">
            <Composer onSend={() => {}} size="md" />
          </State>
          <State label="输入框 · 生成中（可停止）">
            <Composer onSend={() => {}} size="md" busy />
          </State>
        </div>
      </Section>

      <Section
        id="v02"
        title="7. v0.2 新增：模式、联想、提示、上传"
        note="严谨与发散的回答在视觉上必须能一眼区分；上传的每个阶段都要让用户知道“现在在干什么、出错了怎么办”。"
      >
        <div className="grid gap-6 md:grid-cols-2">
          <State label="分段控件 · 模式切换（记住个人偏好）">
            <ModeSwitch value={mode} onChange={setMode} />
          </State>
          <State label="分段控件 · 视图切换">
            <Segmented label="视图" value={view} onChange={setView} options={[{ value: "text", label: "文本" }, { value: "original", label: "原版" }]} />
          </State>
          <State label="有出处的正文（实线引用）">
            <p className="text-[15px] leading-[1.75]">
              住宅日照需同时满足国家标准和地方标准
              <Citation n={1} sourceId="gb50096-2011" onOpen={() => {}} />。
            </p>
          </State>
          <State label="联想块（虚线 + 标签，没有权威出处）">
            <IdeaBlock block={{ type: "idea", content: "南侧逐层退台，让后排楼的底层也能“看到”太阳。" }} ctx={noop} />
          </State>
          <State label="提示 · 未找到出处（可换模式重问）">
            <NoticeBlock
              block={{ type: "notice", tone: "info", title: "权威资料中没有找到可引用的内容", content: "不会在没有出处的情况下作答。", action: { label: "换成发散模式再问一次", switchTo: "divergent" } }}
              ctx={noop}
            />
          </State>
          <State label="提示 · 引用的规范已被替代">
            <NoticeBlock block={{ type: "notice", tone: "warning", title: "GB 50096-2011 已被替代", content: "用于施工图前请核对新版条文。" }} ctx={noop} />
          </State>
          <State label="规范状态标签">
            <p className="flex gap-4 text-xs">
              <SourceStatusTag status="current" />
              <SourceStatusTag status="superseded" />
              <SourceStatusTag status="abolished" />
              <SourceStatusTag status="unverified" />
            </p>
          </State>
          <State label="阅读高亮（荧光笔色，独立令牌）">
            <p className="font-serif text-[17px] leading-[1.9]">
              长文阅读的关键是<mark className="rounded-[2px] bg-highlight px-0.5 text-inherit">行宽和行距</mark>。
            </p>
          </State>
          <State label="开关（立即生效的设置）">
            <label className="flex items-center gap-3 text-sm">
              <Switch checked={sw} onCheckedChange={setSw} />
              AI 对话 {sw ? "已开通" : "未开通"}
            </label>
          </State>
          <State label="用量条（>85% 变警示色）">
            <div className="space-y-3">
              <Meter value={21} max={50} label="存储" />
              <Meter value={46} max={50} label="存储" />
            </div>
          </State>
        </div>
        <p className="mt-8 mb-2 font-mono text-xs text-muted-foreground">上传行 · 各阶段状态</p>
        <ul className="divide-y rounded-xl border bg-surface">
          {UPLOAD_SAMPLES.map((it) => (
            <UploadRow key={it.id} item={it} onPause={() => {}} onResume={() => {}} onRemove={() => {}} />
          ))}
        </ul>
      </Section>

      <Section
        id="v03"
        title="8. v0.3 新增：验证码输入、文件版本"
        note="验证码输入满 6 位自动提交；出错时整组变红并轻微抖动（系统设置了“减少动态效果”时不抖）。同名不同内容的文件自动加版本号。"
      >
        <div className="grid gap-6 md:grid-cols-2">
          <State label="验证码 · 可输入（试试粘贴 6 位数字）">
            <OtpInput value={otp} onChange={setOtp} />
          </State>
          <State label="验证码 · 错误">
            <OtpInput value="428913" onChange={() => {}} invalid />
            <p className="mt-2 text-sm text-destructive">验证码不正确</p>
          </State>
          <State label="验证码 · 验证中（禁用）">
            <OtpInput value="428913" onChange={() => {}} disabled />
          </State>
          <State label="文件版本标记">
            <p className="flex items-center gap-2 text-sm font-medium">
              某住宅项目-总平面.dwg
              <Badge variant="outline" className="font-mono">
                v2
              </Badge>
            </p>
            <p className="mt-1 text-xs text-muted-foreground">历史版本 1 · 同名但内容不同的文件自动保存为新版本</p>
          </State>
        </div>
      </Section>

      <Section
        id="formats"
        title="9. 文件浏览：格式支持矩阵"
        note="“可直接打开”的格式在浏览器里完成，不需要服务器；其余格式会显示说明页和下载按钮，而不是空白或报错（逐级降级）。"
      >
        <FormatMatrix />
      </Section>

      <Section
        id="markup"
        title="10. 标注与测量"
        note="红色（--markup）专门用于批注和测量，沿用设计院“红笔改图”的习惯；它不是强调色，也不表示错误。线宽和文字不随缩放变粗变大。"
      >
        <div className="relative mx-auto aspect-[3/2] max-w-xl overflow-hidden rounded-lg border bg-paper">
          <AnnotationLayer
            page={1}
            pageW={600}
            pageH={400}
            displayScale={1}
            mmPerUnit={10}
            tool="browse"
            selectedId="d2"
            onSelect={() => {}}
            onCreate={() => {}}
            onCalibrate={() => {}}
            marks={[
              { id: "d1", kind: "measure", page: 1, x1: 60, y1: 60, x2: 540, y2: 60, text: "" },
              { id: "d2", kind: "measure", page: 1, x1: 40, y1: 90, x2: 40, y2: 360, text: "" },
              { id: "d3", kind: "rect", page: 1, x: 120, y: 130, w: 220, h: 150, text: "这里再推敲" },
              { id: "d4", kind: "pin", page: 1, x: 450, y: 220, text: "" },
            ]}
          />
        </div>
        <p className="mt-3 text-center text-xs text-muted-foreground">示例：已校准（每单位 10 mm）· 两条测量线（右边一条为选中状态）· 一个框选 · 一个编号标记</p>
      </Section>

      <Section
        id="access"
        title="11. 权限：三档角色与平台内共享"
        note="项目和个人文件用同一套词：仅浏览 / 浏览 + 编辑；“管理”（改信息、调权限）只属于负责人、文件主人和管理员。下拉里每档都带一句“能做什么”。"
      >
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <State label="项目角色（可改）">
            <RoleSelect value={role} onChange={setRole} label="示例成员的权限" />
          </State>
          <State label="最后一位负责人（降级被禁用）">
            <RoleSelect value="lead" onChange={() => {}} label="示例负责人" disabledRoles={["editor", "viewer"]} disabledHint="项目至少要有一位负责人" />
          </State>
          <State label="访客视角（只读）">
            <RoleSelect value="viewer" label="示例成员的权限" readOnly />
          </State>
          <State label="共享档位">
            <LevelSelect value={level} onChange={setLevel} label="共享档位" />
          </State>
          <State label="查看器 · 仅浏览">
            <span className="flex h-7 items-center gap-1 text-xs text-muted-foreground">
              <EyeIcon className="size-3.5" />
              仅浏览，不能标注
            </span>
          </State>
          <State label="目录树 · 共享标记">
            <span className="flex items-center gap-3 text-sm">
              参考图片
              <span className="flex items-center gap-0.5 text-[11px] text-muted-foreground">
                <UsersIcon className="size-3" />2
              </span>
            </span>
          </State>
          <State label="共享面板（示例，不会真的保存）">
            <Button variant="outline" size="sm" onClick={() => setShareOpen(true)}>
              <UsersIcon />
              打开访问权限面板
            </Button>
          </State>
        </div>
        <ShareDialog
          open={shareOpen}
          onOpenChange={setShareOpen}
          item={{ id: "me/demo@studio.cn/ref", name: "参考图片", folder: true }}
          owner="demo@studio.cn"
          me="demo@studio.cn"
          shares={shares}
          onSharesChange={setShares}
          demo
          directory={[
            { email: "li.na@studio.cn", name: "李娜" },
            { email: "wang.lei@studio.cn", name: "王磊" },
          ]}
        />
      </Section>

      <Section
        id="issues"
        title="12. 问题：把标注交给别人看"
        note="个人标注是实线、只有自己看得到；发起为问题后变成虚线 + “#编号”标签，能看这个文件的人都看得到；已关闭的变淡。"
      >
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="relative aspect-[3/2] overflow-hidden rounded-lg border bg-paper">
            <IssueLayer pageW={600} pageH={400} displayScale={1} issues={DEMO_ISSUES} selectedId="i1" onSelect={() => {}} />
            <AnnotationLayer
              page={1}
              pageW={600}
              pageH={400}
              displayScale={1}
              mmPerUnit={10}
              tool="browse"
              selectedId={null}
              onSelect={() => {}}
              onCreate={() => {}}
              onCalibrate={() => {}}
              marks={[{ id: "p1", kind: "rect", page: 1, x: 380, y: 80, w: 160, h: 110, text: "自己的标注" }]}
            />
          </div>
          <IssuesTab issues={DEMO_ISSUES} />
        </div>
      </Section>

      <Section
        id="gh"
        title="13. Grasshopper 生成器：一单的四种状态"
        note="交单后先排队，舰队上的 Rhino 一次只跑一单；完成后两张图直接显示、.gh/.3dm 下载，没有成功时写出原因。排队和生成中每 10 秒自动刷新。"
      >
        <div className="grid gap-3 md:grid-cols-2">
          {GH_SAMPLES.map((r) => (
            <State key={r.id} label={r.status}>
              <ul>
                <GhRequestItem r={r} fileUrl={() => GH_PLACEHOLDER} />
              </ul>
            </State>
          ))}
        </div>
      </Section>

      <Section
        id="provenance"
        title="14. 出处一行：对外只放有出处的资料（R154）"
        note="阅读页正文和原版上方各一行：哪条抓取车道 · 何时取回 · 原网址。车道名是标识符，原样不截断；台账没记时刻就写「台账没记」，不猜。说不出车道和网址的资料根本不进资料库，所以没有「无出处」这一态。"
      >
        <div className="grid gap-3">
          <State label="有文件原址和所在页面（省厅车道）">
            <ProvenanceLine source={{ provenance: { lane: "anhui-dohurd-att", at: "2026-08-31T20:16:20+0800", page: "https://dohurd.ah.gov.cn/public/6991/53904241.html", url: "https://dohurd.ah.gov.cn/group4/M00/00/93/example.pdf" } }} />
          </State>
          <State label="只有原网址（地标备案）">
            <ProvenanceLine source={{ provenance: { lane: "dbba-fulltext", at: "2026-09-03T00:32:53Z", url: "https://dbba.sacinfo.org.cn/portal/download/example" } }} />
          </State>
          <State label="台账没记时刻（杂志镜像）">
            <ProvenanceLine source={{ provenance: { lane: "usmodernist-mirror", url: "https://www.usmodernist.org/AA/AA-1967-07-08.pdf" } }} />
          </State>
        </div>
      </Section>

      <p className="flex items-center gap-1 text-sm text-muted-foreground">
        设计决策记录见仓库 <code className="font-mono">docs/design-journal/</code>
        <ArrowRightIcon className="size-3.5" />
      </p>
    </div>
  )
}

const DEMO_ISSUES: Issue[] = [
  {
    id: "i1", scope: "proj:demo", number: 1, fileId: "proj/demo/plan", fileName: "户型平面草图.png",
    mark: { id: "m1", kind: "rect", page: 1, x: 60, y: 80, w: 220, h: 170, text: "" },
    title: "起居室开间偏小，请复核", status: "open", author: "li.na@studio.cn", authorName: "李娜", createdAt: Date.UTC(2026, 8, 24),
    replies: [{ id: "r1", author: "chen.jing@studio.cn", authorName: "陈静", text: "已看到", at: Date.UTC(2026, 8, 24, 3) }],
  },
  {
    id: "i2", scope: "proj:demo", number: 2, fileId: "proj/demo/plan", fileName: "户型平面草图.png",
    mark: { id: "m2", kind: "measure", page: 1, x1: 60, y1: 320, x2: 520, y2: 320, text: "" }, scale: 10,
    title: "总面宽核对", status: "closed", author: "zhang.ming@studio.cn", authorName: "张明", createdAt: Date.UTC(2026, 8, 23), replies: [],
  },
]

const DEMO_SHARES: Share[] = [
  { id: "demo1", owner: "demo@studio.cn", itemId: "me/demo@studio.cn/ref", itemName: "参考图片", folder: true, grantee: "li.na@studio.cn", level: "edit", createdAt: 0 },
]

const base: Omit<UploadItem, "id" | "name" | "stage"> = {
  size: 160 * 1024 * 1024,
  origin: "local",
  chunksTotal: 40,
  hashed: 40,
  chunkHashes: [],
  transferred: 0,
  retries: 0,
  fingerprint: "3f2a9d6c1b8e7f4a5d2c9b6e3a0f7d4c1b8e5a2f9c6d3b0e7a4f1c8d5b2e9a6f",
}
const UPLOAD_SAMPLES: UploadItem[] = [
  { ...base, id: "a", name: "总平面-v5.dwg", stage: "hashing", hashed: 14, fingerprint: undefined },
  { ...base, id: "b", name: "立面模型.3dm", stage: "uploading", transferred: 23, speed: 24, retries: 1, lastRetryChunk: 7 },
  { ...base, id: "c", name: "效果图合集.zip", stage: "paused", resumeStage: "uploading", transferred: 12 },
  { ...base, id: "d", name: "GB 50016-2014.pdf", stage: "fetching", origin: "baidu", transferred: 9, speed: 5.6 },
  { ...base, id: "e", name: "平屋面构造.pdf", stage: "instant" },
  { ...base, id: "f", name: "立面参数化-v4.gh", stage: "done" },
  { ...base, id: "g", name: "扫描件.pdf", stage: "error", error: "网络中断，已上传的块会保留，可以继续" },
]

function Section({ id, title, note, children }: { id: string; title: string; note: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-8">
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      <p className="mt-1.5 mb-6 max-w-3xl text-sm leading-relaxed text-muted-foreground">{note}</p>
      {children}
    </section>
  )
}

function LayerBox({ title, sub, rows, highlight }: { title: string; sub: string; rows: string[]; highlight?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 ${highlight ? "border-primary/60 bg-primary-subtle/40" : "bg-surface"}`}>
      <p className="text-sm font-semibold">{title}</p>
      <p className="text-xs text-muted-foreground">{sub}</p>
      <ul className="mt-3 space-y-1.5 font-mono text-xs">
        {rows.map((r) => (
          <li key={r} className="rounded bg-surface-sunken px-2 py-1">
            {r}
          </li>
        ))}
      </ul>
    </div>
  )
}

function Arrow() {
  return (
    <div className="flex items-center justify-center text-muted-foreground" aria-hidden>
      <ArrowRightIcon className="size-5 rotate-90 md:rotate-0" />
    </div>
  )
}

function Swatch({ token, cls, small }: { token: string; cls: string; small?: boolean }) {
  return (
    <div className={small ? "w-28" : ""}>
      <div className={`h-14 rounded-lg border ${cls}`} />
      <p className="mt-1.5 font-mono text-xs">{token}</p>
    </div>
  )
}

function Rule({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-surface p-4">
      <div className="flex h-12 items-center">{children}</div>
      <p className="mt-3 text-sm font-medium">{title}</p>
      <p className="text-xs text-muted-foreground">{desc}</p>
    </div>
  )
}

function State({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 font-mono text-xs text-muted-foreground">{label}</p>
      {children}
    </div>
  )
}

const GH_PLACEHOLDER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='9'/%3E"
const ghBase: GhRequest = {
  id: "ghr-20260926T120000-a1b2c3",
  text: "一排竖向遮阳百叶，20 片，间距 600，高 3000，截面 50×200，沿一条曲线排布",
  status: "pending",
  error: null,
  files: [],
  assumptions: [],
  model_confirmed: null,
  created_at: "2026-09-26T12:00:00+0800",
  finished_at: null,
}
const GH_SAMPLES: GhRequest[] = [
  ghBase,
  { ...ghBase, id: "ghr-20260926T120000-a1b2c4", status: "claimed" },
  {
    ...ghBase,
    id: "ghr-20260926T120000-a1b2c5",
    status: "done",
    finished_at: "2026-09-26T12:07:00+0800",
    files: ["ghr-20260926T120000-a1b2c5-canvas.png", "ghr-20260926T120000-a1b2c5-persp.png", "ghr-20260926T120000-a1b2c5.3dm", "ghr-20260926T120000-a1b2c5.gh"],
    assumptions: ["曲线取为 XY 平面上的一段圆弧", "百叶朝向沿曲线法向"],
    model_confirmed: true,
  },
  { ...ghBase, id: "ghr-20260926T120000-a1b2c6", status: "failed", finished_at: "2026-09-26T12:09:00+0800", error: "生成失败（build）：找不到名为 Divide Curve 的电池" },
]
