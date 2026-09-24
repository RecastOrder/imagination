"use client"

import { createContext, useCallback, useContext, useState } from "react"
import { useRouter } from "next/navigation"

import type { Feature } from "@/lib/auth/permissions"
import type { AccountPrefs } from "@/lib/server/prefs"

interface AccountContextValue {
  email: string
  name: string
  roleLabel: string
  /** 能否看到“管理”入口。只影响界面显示，接口会在服务端再校验 */
  isAdmin: boolean
  /** 各功能是否可用（同样只用于界面显示） */
  features: Record<Feature, boolean>
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
  features,
  initialPrefs,
  children,
}: {
  email: string
  name: string
  roleLabel: string
  isAdmin: boolean
  features: Record<Feature, boolean>
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

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" })
    router.push("/login")
    router.refresh()
  }, [router])

  return <AccountContext.Provider value={{ email, name, roleLabel, isAdmin, features, prefs, setPref, logout }}>{children}</AccountContext.Provider>
}

export function useAccount() {
  const ctx = useContext(AccountContext)
  if (!ctx) throw new Error("useAccount 必须在 AccountProvider 内使用")
  return ctx
}
