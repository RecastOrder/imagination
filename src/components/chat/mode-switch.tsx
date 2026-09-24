"use client"

import { Segmented } from "@/components/ui/segmented"
import { CHAT_MODES, type ChatMode } from "@/lib/chat/modes"

/** 严谨 | 发散 切换。放在输入框里：模式是“这次提问”的属性，要在发送前看得到 */
export function ModeSwitch({ value, onChange }: { value: ChatMode; onChange: (m: ChatMode) => void }) {
  return (
    <Segmented
      label="回答模式"
      size="sm"
      value={value}
      onChange={onChange}
      options={(Object.keys(CHAT_MODES) as ChatMode[]).map((m) => {
        const { short, desc, icon: Icon } = CHAT_MODES[m]
        return {
          value: m,
          title: desc,
          label: (
            <>
              <Icon />
              {short}
            </>
          ),
        }
      })}
    />
  )
}
