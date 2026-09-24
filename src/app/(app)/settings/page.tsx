import type { Metadata } from "next"

import { SettingsView } from "@/components/account/settings-view"

export const metadata: Metadata = { title: "账户设置" }

export default function SettingsPage() {
  return <SettingsView />
}
