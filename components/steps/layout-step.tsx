"use client"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Award, Bookmark } from "lucide-react"
import { useState, useEffect } from "react"

interface LayoutStepProps {
  updateSelection: (key: string, value: string) => void
  currentLayout: string | null
}

export function LayoutStep({ updateSelection, currentLayout }: LayoutStepProps) {
  const [customBgColor, setCustomBgColor] = useState<string>("#f3e8ff") // 기본 배경색 (연한 보라색)
  const [imagePosition, setImagePosition] = useState<string>("left") // 이미지 위치 (left, center, right)
  const [borderStyle, setBorderStyle] = useState<string>("rounded") // 테두리 스타일 (none, rounded, square)
  const [showCustomOptions, setShowCustomOptions] = useState<boolean>(false)

  // 사용자 정의 레이아웃 정보를 문자열로 변환하여 저장
  useEffect(() => {
    if (currentLayout === "custom") {
      const customLayoutData = JSON.stringify({
        bgColor: customBgColor,
        imagePosition,
        borderStyle,
      })
      // 이전 데이터와 비교하여 변경된 경우에만 업데이트
      const prevData = JSON.stringify({
        bgColor: customBgColor,
        imagePosition,
        borderStyle,
      })

      // React 18에서는 useEffect가 개발 모드에서 두 번 실행될 수 있으므로
      // 실제로 데이터가 변경된 경우에만 updateSelection을 호출
      const timer = setTimeout(() => {
        updateSelection("customLayoutData", customLayoutData)
      }, 0)

      return () => clearTimeout(timer)
    }
  }, [currentLayout, customBgColor, imagePosition, borderStyle])

  // 레이아웃 선택 시 사용자 정의 옵션 표시 여부 설정
  useEffect(() => {
    if (showCustomOptions !== (currentLayout === "custom")) {
      setShowCustomOptions(currentLayout === "custom")
    }
  }, [currentLayout, showCustomOptions])

  const layouts = [
    {
      value: "business-card",
      label: "명함 스타일",
      description: "전문적인 명함 형태로 제작됩니다",
      preview: (
        <div className="w-full h-32 bg-gradient-to-r from-purple-100 to-pink-100 rounded-lg p-3 border-2 border-purple-300 shadow-sm">
          <div className="flex h-full">
            <div className="w-1/3 flex items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-purple-200 border-2 border-purple-400 flex items-center justify-center">
                <span className="text-2xl">👩‍⚕️</span>
              </div>
            </div>
            <div className="w-2/3 flex flex-col justify-center">
              <div className="h-3 w-3/4 bg-purple-300 rounded-full mb-2"></div>
              <div className="h-2 w-1/2 bg-pink-300 rounded-full mb-2"></div>
              <div className="h-2 w-2/3 bg-purple-200 rounded-full"></div>
              <div className="flex mt-2">
                <div className="h-4 w-4 rounded-full bg-purple-400 mr-1"></div>
                <div className="h-4 w-4 rounded-full bg-pink-400 mr-1"></div>
                <div className="h-4 w-4 rounded-full bg-purple-400"></div>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      value: "certificate",
      label: "인증서 스타일",
      description: "공식적인 인증서 형태로 제작됩니다",
      preview: (
        <div className="w-full h-32 bg-gradient-to-b from-yellow-50 to-yellow-100 rounded-lg p-3 border-2 border-yellow-300 shadow-sm">
          <div className="border-4 border-double border-yellow-400 h-full rounded-sm flex flex-col items-center justify-center p-2">
            <div className="w-full flex justify-center mb-1">
              <Award className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="h-2 w-3/4 bg-yellow-300 rounded-full mb-2"></div>
            <div className="h-2 w-1/2 bg-yellow-400 rounded-full mb-2"></div>
            <div className="flex justify-between w-full px-4 mt-1">
              <div className="h-3 w-8 bg-yellow-300 rounded-sm"></div>
              <div className="h-3 w-8 bg-yellow-300 rounded-sm"></div>
            </div>
          </div>
        </div>
      ),
    },
    {
      value: "magazine",
      label: "잡지 커버 스타일",
      description: "잡지 표지처럼 제작됩니다",
      preview: (
        <div className="w-full h-32 bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg p-3 border-2 border-blue-300 shadow-sm">
          <div className="h-full flex flex-col">
            <div className="h-6 bg-blue-400 rounded-t-sm flex items-center justify-center">
              <div className="h-2 w-16 bg-white rounded-full"></div>
            </div>
            <div className="flex-1 flex">
              <div className="w-2/3 p-2 flex flex-col justify-center">
                <div className="h-2 w-full bg-blue-300 rounded-full mb-1"></div>
                <div className="h-2 w-3/4 bg-purple-300 rounded-full mb-1"></div>
                <div className="h-2 w-1/2 bg-blue-300 rounded-full"></div>
              </div>
              <div className="w-1/3 flex items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-purple-200 border-2 border-purple-400 flex items-center justify-center">
                  <span className="text-xl">👨‍🚀</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      value: "bookmark",
      label: "북마크 스타일",
      description: "책갈피 형태로 제작됩니다",
      preview: (
        <div className="w-full h-32 flex justify-center">
          <div className="w-20 h-full bg-gradient-to-b from-pink-200 to-purple-200 rounded-t-lg relative border-2 border-b-0 border-purple-300 shadow-sm flex flex-col items-center pt-2">
            <Bookmark className="h-6 w-6 text-purple-500 absolute -top-3" />
            <div className="w-12 h-12 rounded-full bg-white border-2 border-pink-300 flex items-center justify-center mt-2">
              <span className="text-xl">👩‍🏫</span>
            </div>
            <div className="h-2 w-12 bg-purple-300 rounded-full mt-2"></div>
            <div className="h-2 w-8 bg-pink-300 rounded-full mt-1"></div>
            <div className="absolute -bottom-1 left-0 right-0 h-4 bg-purple-100 rounded-b-xl border-2 border-t-0 border-purple-300"></div>
          </div>
        </div>
      ),
    },
    {
      value: "korea-job-world",
      label: "한국잡월드 레이아웃",
      description: "한국잡월드 공식 로고가 포함됩니다",
      preview: (
        <div className="w-full h-32 bg-gradient-to-br from-green-100 to-blue-100 rounded-lg p-3 border-2 border-green-300 shadow-sm">
          <div className="h-full flex flex-col relative">
            <div className="flex-1 flex items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-green-200 border-2 border-green-400 flex items-center justify-center">
                <span className="text-2xl">👨‍💼</span>
              </div>
            </div>
            <div className="absolute bottom-1 right-1">
              <div className="w-8 h-6 bg-green-400 rounded-sm flex items-center justify-center">
                <span className="text-xs font-bold text-white">로고</span>
              </div>
            </div>
            
          </div>
        </div>
      ),
    },
    {
      value: "custom",
      label: "직접 디자인하기",
      description: "나만의 레이아웃을 직접 만들어보세요",
      preview: (
        <div className="w-full h-32 bg-white rounded-lg p-3 border-2 border-purple-300 shadow-sm flex items-center justify-center">
          <div className="text-center">
            <div className="flex justify-center mb-2">
              <div className="w-8 h-8 bg-purple-200 rounded-full mr-1"></div>
              <div className="w-8 h-8 bg-pink-200 rounded-full mr-1"></div>
              <div className="w-8 h-8 bg-blue-200 rounded-full"></div>
            </div>
            <div className="text-purple-500 font-medium text-sm">나만의 디자인 만들기</div>
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

      {showCustomOptions && (
        <div className="mt-6 p-4 bg-purple-50 rounded-xl border-2 border-purple-200">
          <h3 className="text-lg font-medium text-purple-700 mb-4">나만의 레이아웃 디자인하기</h3>

          <div className="space-y-4">
            {/* 배경색 선택 */}
            <div>
              <label className="block text-sm font-medium text-purple-600 mb-2">배경색 선택</label>
              <div className="flex space-x-2">
                {["#f3e8ff", "#fce7f3", "#e0f2fe", "#ecfccb", "#fef3c7"].map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`w-8 h-8 rounded-full border-2 ${
                      customBgColor === color ? "border-purple-600" : "border-gray-300"
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setCustomBgColor(color)}
                    aria-label={`배경색 ${color}`}
                  />
                ))}
                <input
                  type="color"
                  value={customBgColor}
                  onChange={(e) => setCustomBgColor(e.target.value)}
                  className="w-8 h-8 rounded-full cursor-pointer"
                  aria-label="직접 색상 선택"
                />
              </div>
            </div>

            {/* 이미지 위치 선택 */}
            <div>
              <label className="block text-sm font-medium text-purple-600 mb-2">이미지 위치</label>
              <div className="flex space-x-2">
                <button
                  type="button"
                  className={`px-3 py-1 rounded-md ${
                    imagePosition === "left"
                      ? "bg-purple-500 text-white"
                      : "bg-white border border-purple-300 text-purple-600"
                  }`}
                  onClick={() => setImagePosition("left")}
                >
                  왼쪽
                </button>
                <button
                  type="button"
                  className={`px-3 py-1 rounded-md ${
                    imagePosition === "center"
                      ? "bg-purple-500 text-white"
                      : "bg-white border border-purple-300 text-purple-600"
                  }`}
                  onClick={() => setImagePosition("center")}
                >
                  가운데
                </button>
                <button
                  type="button"
                  className={`px-3 py-1 rounded-md ${
                    imagePosition === "right"
                      ? "bg-purple-500 text-white"
                      : "bg-white border border-purple-300 text-purple-600"
                  }`}
                  onClick={() => setImagePosition("right")}
                >
                  오른쪽
                </button>
              </div>
            </div>

            {/* 테두리 스타일 선택 */}
            <div>
              <label className="block text-sm font-medium text-purple-600 mb-2">테두리 스타일</label>
              <div className="flex space-x-2">
                <button
                  type="button"
                  className={`px-3 py-1 rounded-md ${
                    borderStyle === "none"
                      ? "bg-purple-500 text-white"
                      : "bg-white border border-purple-300 text-purple-600"
                  }`}
                  onClick={() => setBorderStyle("none")}
                >
                  없음
                </button>
                <button
                  type="button"
                  className={`px-3 py-1 rounded-md ${
                    borderStyle === "rounded"
                      ? "bg-purple-500 text-white"
                      : "bg-white border border-purple-300 text-purple-600"
                  }`}
                  onClick={() => setBorderStyle("rounded")}
                >
                  둥근 모서리
                </button>
                <button
                  type="button"
                  className={`px-3 py-1 rounded-md ${
                    borderStyle === "square"
                      ? "bg-purple-500 text-white"
                      : "bg-white border border-purple-300 text-purple-600"
                  }`}
                  onClick={() => setBorderStyle("square")}
                >
                  각진 모서리
                </button>
              </div>
            </div>

            {/* 미리보기 */}
            <div>
              <label className="block text-sm font-medium text-purple-600 mb-2">미리보기</label>
              <div
                className={`w-full h-40 p-4 ${
                  borderStyle === "rounded" ? "rounded-xl" : borderStyle === "square" ? "rounded-none" : ""
                } border-2 border-purple-300`}
                style={{ backgroundColor: customBgColor }}
              >
                <div
                  className={`h-full flex ${
                    imagePosition === "left"
                      ? "flex-row"
                      : imagePosition === "center"
                        ? "flex-col items-center"
                        : "flex-row-reverse"
                  }`}
                >
                  <div className={`${imagePosition === "center" ? "mb-2" : "w-1/3"} flex items-center justify-center`}>
                    <div className="w-16 h-16 rounded-full bg-white border-2 border-purple-400 flex items-center justify-center">
                      <span className="text-2xl">👩‍⚕️</span>
                    </div>
                  </div>
                  <div
                    className={`${
                      imagePosition === "center" ? "text-center" : "w-2/3"
                    } flex flex-col justify-center p-2`}
                  >
                    <div className="h-3 w-3/4 bg-purple-300 rounded-full mb-2 mx-auto"></div>
                    <div className="h-2 w-1/2 bg-pink-300 rounded-full mb-2 mx-auto"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-yellow-100 border-l-4 border-yellow-500 p-4 text-sm text-yellow-800 mt-6 rounded-r">
        <p className="font-medium">도움말</p>
        <p>레이아웃은 최종 이미지의 형태를 결정합니다. 원하는 용도에 맞게 선택하세요!</p>
      </div>
    </div>
  )
}
