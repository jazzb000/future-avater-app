"use client"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"

interface LayoutStepProps {
  updateSelection: (key: string, value: string) => void
  currentLayout: string | null
}

export function LayoutStep({ updateSelection, currentLayout }: LayoutStepProps) {
  const layouts = [
    // 임시로 한국잡월드 레이아웃 주석처리
    // {
    //   value: "korea-job-world",
    //   label: "한국잡월드 레이아웃",
    //   description: "한국잡월드 공식 로고가 포함됩니다",
    //   preview: (
    //     <div className="w-full h-32 bg-gradient-to-br from-green-100 to-blue-100 rounded-lg p-3 border-2 border-green-300 shadow-sm">
    //       <div className="h-full flex flex-col relative">
    //         <div className="flex-1 flex items-center justify-center">
    //           <div className="w-16 h-16 rounded-full bg-green-200 border-2 border-green-400 flex items-center justify-center">
    //             <span className="text-2xl">👨‍💼</span>
    //           </div>
    //         </div>
    //         <div className="absolute bottom-1 right-1">
    //           <div className="w-8 h-6 bg-green-400 rounded-sm flex items-center justify-center">
    //             <span className="text-xs font-bold text-white">로고</span>
    //           </div>
    //         </div>
    //       </div>
    //     </div>
    //   ),
    // },
    {
      value: "dolphin-ai",
      label: "돌핀인캘리 AI 레이아웃",
      description: "돌핀인캘리 AI 공식 로고가 포함됩니다",
      preview: (
        <div className="w-full h-32 bg-gradient-to-br from-purple-100 to-pink-100 rounded-lg p-3 border-2 border-purple-300 shadow-sm">
          <div className="h-full flex flex-col relative">
            <div className="flex-1 flex items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-purple-200 border-2 border-purple-400 flex items-center justify-center">
                <span className="text-2xl">🐬</span>
              </div>
                </div>
            <div className="absolute bottom-1 right-1">
              <div className="w-8 h-6 bg-purple-400 rounded-sm flex items-center justify-center">
                <span className="text-xs font-bold text-white">로고</span>
              </div>
            </div>
          </div>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <p className="text-purple-500 font-medium">미래의 이미지를 어떤 모양으로 만들고 싶나요?</p>

      <RadioGroup
        value={currentLayout || ""}
        onValueChange={(value) => updateSelection("layout", value)}
        className="grid grid-cols-1 md:grid-cols-2 gap-6"
      >
        {layouts.map((layout) => (
          <div key={layout.value}>
            <RadioGroupItem value={layout.value} id={`layout-${layout.value}`} className="peer sr-only" />
            <Label
              htmlFor={`layout-${layout.value}`}
              className="flex flex-col rounded-xl border-3 border-purple-200 bg-white p-4 hover:bg-purple-50 hover:border-purple-300 peer-data-[state=checked]:border-purple-500 peer-data-[state=checked]:bg-purple-100 [&:has([data-state=checked])]:border-purple-500 [&:has([data-state=checked])]:bg-purple-100 cursor-pointer transition-all h-full"
            >
              <div className="mb-3">{layout.preview}</div>
              <div className="text-center">
                <span className="text-lg font-medium text-purple-700 block">{layout.label}</span>
                <span className="text-xs text-purple-500 mt-1 block">{layout.description}</span>
              </div>
            </Label>
          </div>
        ))}
      </RadioGroup>

      <div className="bg-yellow-100 border-l-4 border-yellow-500 p-4 text-sm text-yellow-800 mt-6 rounded-r">
        <p className="font-medium">도움말</p>
        <p>레이아웃은 최종 이미지의 형태를 결정합니다. 원하는 용도에 맞게 선택하세요!</p>
      </div>
    </div>
  )
}
