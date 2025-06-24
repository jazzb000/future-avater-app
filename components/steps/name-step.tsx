"use client"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"

interface NameStepProps {
  updateSelection: (key: string, value: string) => void
  currentName: string | null
  currentJob?: string | null
}

export function NameStep({ updateSelection, currentName, currentJob }: NameStepProps) {
  // 한국어 직업명 매핑
  const jobNames: { [key: string]: string } = {
    doctor: "의사",
    teacher: "선생님", 
    astronaut: "우주비행사",
    chef: "요리사",
    firefighter: "소방관",
    scientist: "과학자",
    artist: "예술가",
    athlete: "운동선수",
    announcer: "아나운서"
  }

  const jobKorean = currentJob ? (jobNames[currentJob] || currentJob) : "선택한 직업"
  return (
    <div className="space-y-4">
      <p className="text-purple-500 font-medium">명함에 들어갈 이름을 입력해주세요</p>
      
      <Card className="p-6 border-2 border-purple-200">
        <div className="space-y-4">
          <Label htmlFor="name-input" className="text-lg font-medium text-purple-700">
            이름
          </Label>
          <Input
            id="name-input"
            type="text"
            placeholder="예: 홍길동"
            value={currentName || ""}
            onChange={(e) => updateSelection("name", e.target.value)}
            className="text-lg p-4 border-2 border-purple-200 focus:border-purple-500 rounded-xl"
          />
          
          {/* 미리보기 */}
          <div className="mt-6">
            <Label className="text-sm font-medium text-purple-600 mb-2 block">미리보기</Label>
            <div className="w-full max-w-lg mx-auto bg-white rounded-lg border-2 border-purple-300 shadow-lg overflow-hidden">
              {/* 명함 비율에 맞춘 컨테이너 (약 5:3 비율) */}
              <div className="relative w-full" style={{ aspectRatio: '5/3' }}>
                {/* 명함 배경 */}
                <div className="absolute inset-0 bg-gradient-to-r from-gray-50 to-white flex">
                  {/* 왼쪽 이미지 영역 */}
                  <div className="w-2/5 flex items-center justify-start pl-3">
                    <div 
                      className="bg-purple-200 border-2 border-purple-300 flex items-center justify-center relative overflow-hidden"
                      style={{ 
                        width: '80%', 
                        aspectRatio: '1/1',
                        borderRadius: '50% 0 0 50%' // 왼쪽만 둥글게
                      }}
                    >
                      <span className="text-xl">📷</span>
                    </div>
                  </div>
                  
                  {/* 오른쪽 텍스트 영역 */}
                  <div className="w-3/5 flex flex-col justify-center pl-4 pr-3">
                    <div className="text-lg font-bold text-gray-800 mb-1 leading-tight">
                      {currentName || "이름을 입력하세요"}
                    </div>
                    <div className="text-sm text-gray-600 mb-3 leading-tight">
                      {jobKorean}
                    </div>
                    
                    {/* 한국잡월드 로고 영역 */}
                    <div className="flex items-end justify-start">
                      <div className="text-xs text-blue-600 font-semibold">
                        🌟 Korea JobWorld
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
} 