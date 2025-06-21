"use client"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"

interface StyleStepProps {
  updateSelection: (key: string, value: string) => void
  currentStyle: string | null
}

export function StyleStep({ updateSelection, currentStyle }: StyleStepProps) {
  const styles = [
    {
      value: "cartoon",
      label: "만화 카툰 ���타일",
      icon: "🎨",
      description: "귀엽고 친근한 만화 캐릭터 스타일",
    },
    {
      value: "anime",
      label: "애니메이션 스타일",
      icon: "✨",
      description: "일본 애니메이션 스타일",
    },
    {
      value: "pixar",
      label: "픽사 3D 스타일",
      icon: "🧸",
      description: "픽사 애니메이션 같은 3D 스타일",
    },
    {
      value: "comic",
      label: "만화책 스타일",
      icon: "📚",
      description: "만화책 페이지 같은 스타일",
    },
    {
      value: "poster",
      label: "영화 포스터 스타일",
      icon: "🎬",
      description: "영화 포스터 같은 화려한 스타일",
    },
    {
      value: "caricature",
      label: "캐리커쳐 스타일",
      icon: "🖌️",
      description: "특징을 과장한 재미있는 스타일",
    },
  ]

  return (
    <div className="space-y-4">
      <p className="text-purple-500 font-medium">어떤 이미지 스타일로 만들고 싶나요?</p>

      <RadioGroup
        value={currentStyle || ""}
        onValueChange={(value) => updateSelection("style", value)}
        className="grid grid-cols-2 md:grid-cols-3 gap-4"
      >
        {styles.map((style) => (
          <div key={style.value}>
            <RadioGroupItem value={style.value} id={`style-${style.value}`} className="peer sr-only" />
            <Label
              htmlFor={`style-${style.value}`}
              className="flex flex-col items-center justify-center rounded-xl border-3 border-purple-200 bg-white p-4 hover:bg-purple-50 hover:border-purple-300 peer-data-[state=checked]:border-purple-500 peer-data-[state=checked]:bg-purple-100 [&:has([data-state=checked])]:border-purple-500 [&:has([data-state=checked])]:bg-purple-100 cursor-pointer transition-all h-full"
            >
              <span className="text-4xl mb-2">{style.icon}</span>
              <span className="text-lg font-medium text-purple-700 text-center">{style.label}</span>
              <span className="text-xs text-purple-500 text-center mt-1">{style.description}</span>
            </Label>
          </div>
        ))}
      </RadioGroup>
    </div>
  )
}
