"use client"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"

interface GenderStepProps {
  updateSelection: (key: string, value: string) => void
  currentGender: string | null
}

export function GenderStep({ updateSelection, currentGender }: GenderStepProps) {
  const genders = [
    {
      value: "male",
      label: "남성",
      emoji: "👨",
      description: "남성으로 변환해드려요"
    },
    {
      value: "female", 
      label: "여성",
      emoji: "👩",
      description: "여성으로 변환해드려요"
    }
  ]

  return (
    <div className="space-y-4">
      <p className="text-purple-500 font-medium">어떤 성별로 변환하고 싶나요?</p>

      <RadioGroup
        value={currentGender || ""}
        onValueChange={(value) => updateSelection("gender", value)}
        className="grid grid-cols-1 md:grid-cols-2 gap-6"
      >
        {genders.map((gender) => (
          <div key={gender.value}>
            <RadioGroupItem value={gender.value} id={`gender-${gender.value}`} className="peer sr-only" />
            <Label
              htmlFor={`gender-${gender.value}`}
              className="flex flex-col items-center rounded-xl border-3 border-purple-200 bg-white p-6 hover:bg-purple-50 hover:border-purple-300 peer-data-[state=checked]:border-purple-500 peer-data-[state=checked]:bg-purple-100 [&:has([data-state=checked])]:border-purple-500 [&:has([data-state=checked])]:bg-purple-100 cursor-pointer transition-all h-full"
            >
              <div className="text-6xl mb-4">{gender.emoji}</div>
              <span className="text-xl font-bold text-purple-700 mb-2">{gender.label}</span>
              <span className="text-sm text-purple-500 text-center">{gender.description}</span>
            </Label>
          </div>
        ))}
      </RadioGroup>

      <div className="bg-purple-100 border-l-4 border-purple-500 p-4 text-sm text-purple-800 mt-6 rounded-r">
        <p className="font-medium mb-1">💡 안내</p>
        <p>선택한 성별에 맞는 특성으로 이미지가 생성됩니다.</p>
      </div>
    </div>
  )
} 