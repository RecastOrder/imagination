"use client"

import { createContext, useCallback, useContext, useState } from "react"
import { useRouter } from "next/navigation"

import { toast } from "@/components/ui/toast"

import type { Feature } from "@/lib/auth/permissions"
import type { AccountPrefs } from "@/lib/server/prefs"

interface AccountContextValue {
  email: string
  name: string
  roleLabel: string
  /** 能否看到“管理”入口。只影响界面显示，接口会在服务端再校验 */
  isAdmin: boolean
  /** 真正的管理员（不受对比视角影响）：只决定“对比视角”按钮显不显示 */
  realAdmin: boolean
  /** 当前是否在“以普通成员视角查看” */
  viewingAsMember: boolean
  /** 打开 / 关闭对比视角：保存到服务器后整页按新身份重新渲染 */
  setViewAsMember: (on: boolean) => Promise<void>
  /** 各功能是否可用（同样只用于界面显示） */
  features: Record<Feature, boolean>
  /** 我参与的项目；canEdit = 我能往里加内容（“加入项目”只列这些） */
  projects: { id: string; name: string; canEdit: boolean }[]
  prefs: AccountPrefs
  setPref: <K extends keyof AccountPrefs>(key: K, value: AccountPrefs[K]) => void
  logout: () => Promise<void>
}

const AccountContext = createContext<AccountContextValue | null>(null)

/**
 * 当前账户（邮箱）和偏好。初始值由服务端在渲染时读好传进来，
 * 所以页面一打开就是你上次的设置，不会先显示默认值再跳变。
 * 修改偏好：界面立即更新（乐观更新），同时保存到服务器；保存失败则回滚。
 */
export function AccountProvider({
  email,
  name,
  roleLabel,
  isAdmin,
  realAdmin,
  viewingAsMember,
  features,
  projects,
  initialPrefs,
  children,
}: {
  email: string
  name: string
  roleLabel: string
  isAdmin: boolean
  realAdmin: boolean
  viewingAsMember: boolean
  features: Record<Feature, boolean>
  projects: AccountContextValue["projects"]
  initialPrefs: AccountPrefs
  children: React.ReactNode
}) {
  const [prefs, setPrefs] = useState(initialPrefs)
  const router = useRouter()

  const setPref = useCallback<AccountContextValue["setPref"]>((key, value) => {
    let before: AccountPrefs | undefined
    setPrefs((p) => {
      before = p
      return { ...p, [key]: value }
    })
    fetch("/api/account/prefs", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ [key]: value }),
    })
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status))
      })
      .catch(() => before && setPrefs(before))
  }, [])

  const setViewAsMember = useCallback(
    async (on: boolean) => {
      const r = await fetch("/api/account/prefs", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ viewAsMember: on }),
      })
      if (r.ok) router.refresh()
      else toast(r.status === 403 ? "只有管理员可以切换对比视角" : `切换没有成功（${r.status}），请再试一次`)
    },
    [router],
  )

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" })
    router.push("/login")
    router.refresh()
  }, [router])

  return <AccountContext.Provider value={{ email, name, roleLabel, isAdmin, realAdmin, viewingAsMember, setViewAsMember, features, projects, prefs, setPref, logout }}>{children}</AccountContext.Provider>
}

export function useAccount() {
  const ctx = useContext(AccountContext)
  if (!ctx) throw new Error("useAccount 必须在 AccountProvider 内使用")
  return ctx
}
