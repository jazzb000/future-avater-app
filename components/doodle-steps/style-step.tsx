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
      value: "realistic",
      label: "사실적인 스타일",
      icon: "🖼️",
      description: "낙서를 사실적인 이미지로 변환합니다",
    },
    {
      value: "cartoon",
      label: "만화 스타일",
      icon: "🎨",
      description: "낙서를 귀여운 만화 스타일로 변환합니다",
    },
    {
      value: "3d",
      label: "3D 렌더링",
      icon: "🧊",
      description: "낙서를 3D 모델처럼 렌더링합니다",
    },
    {
      value: "painting",
      label: "유화 스타일",
      icon: "🖌️",
      description: "낙서를 유화 그림처럼 변환합니다",
    },
    {
      value: "digital-art",
      label: "디지털 아트",
      icon: "💻",
      description: "낙서를 현대적인 디지털 아트로 변환합니다",
    },
    {
      value: "sketch",
      label: "스케치 향상",
      icon: "✏️",
      description: "낙서를 더 세련된 스케치로 향상시킵니다",
    },
  ]

  return (
    <div className="space-y-4">
      <p className="text-teal-500 font-medium">어떤 스타일로 변환할까요?</p>

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
              className="flex flex-col items-center justify-center rounded-xl border-3 border-teal-200 bg-white p-4 hover:bg-teal-50 hover:border-teal-300 peer-data-[state=checked]:border-teal-500 peer-data-[state=checked]:bg-teal-100 [&:has([data-state=checked])]:border-teal-500 [&:has([data-state=checked])]:bg-teal-100 cursor-pointer transition-all h-full"
            >
              <span className="text-4xl mb-2">{style.icon}</span>
              <span className="text-lg font-medium text-teal-700 text-center">{style.label}</span>
              <span className="text-xs text-teal-500 text-center mt-1">{style.description}</span>
            </Label>
          </div>
        ))}
      </RadioGroup>
    </div>
  )
}
