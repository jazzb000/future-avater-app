"use client"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"

interface AgeStepProps {
  updateSelection: (key: string, value: string) => void
  currentAge: string | null
}

export function AgeStep({ updateSelection, currentAge }: AgeStepProps) {
  const ages = [
    { value: "5years", label: "5살", icon: "🧒" },
    { value: "teen", label: "10대", icon: "🧑‍🎓" },
    { value: "20s", label: "20대", icon: "👩‍🎓" },
    { value: "30s", label: "30대", icon: "👨‍💼" },
    { value: "40s", label: "40대", icon: "👩‍💼" },
  ]

  return (
    <div className="space-y-4">
      <p className="text-purple-500 font-medium">시간버스를 타고 몇 살로 가고 싶나요?</p>

      <RadioGroup
        value={currentAge || ""}
        onValueChange={(value) => updateSelection("age", value)}
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
      >
        {ages.map((age) => (
          <div key={age.value}>
            <RadioGroupItem value={age.value} id={`age-${age.value}`} className="peer sr-only" />
            <Label
              htmlFor={`age-${age.value}`}
              className="flex flex-col items-center justify-center rounded-xl border-3 border-purple-200 bg-white p-4 hover:bg-purple-50 hover:border-purple-300 peer-data-[state=checked]:border-purple-500 peer-data-[state=checked]:bg-purple-100 [&:has([data-state=checked])]:border-purple-500 [&:has([data-state=checked])]:bg-purple-100 cursor-pointer transition-all"
            >
              <span className="text-5xl mb-2">{age.icon}</span>
              <span className="text-lg font-medium text-purple-700">{age.label}</span>
            </Label>
          </div>
        ))}
      </RadioGroup>
    </div>
  )
}
