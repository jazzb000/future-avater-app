"use client"

import type React from "react"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { UploadStep } from "./doodle-steps/upload-step-client"
import { StyleStep } from "./doodle-steps/style-step"
import { ResultStep } from "./doodle-steps/result-step"
import { Check, ChevronLeft, ChevronRight } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { useTicket } from "@/contexts/ticket-context"
import Link from "next/link"

type WizardStep = {
  id: number
  title: string
  component: React.ReactNode
}

export type DoodleSelections = {
  doodle: string | null
  style: string | null
}

export function DoodleWizard() {
  const { user } = useAuth()
  const { remainingTickets } = useTicket()
  const [currentStep, setCurrentStep] = useState(0)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedImage, setGeneratedImage] = useState<string | null>(null)
  const [generatedImageId, setGeneratedImageId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selections, setSelections] = useState<DoodleSelections>({
    doodle: null,
    style: null,
  })
  const router = useRouter()

  const updateSelection = useCallback((key: string, value: string) => {
    setSelections((prev) => {
      // 이전 값과 동일하면 상태를 업데이트하지 않음
      if (prev[key as keyof DoodleSelections] === value) {
        return prev
      }
      return { ...prev, [key]: value }
    })
  }, [])

  const steps: WizardStep[] = [
    {
      id: 1,
      title: "낙서 업로드",
      component: <UploadStep updateSelection={updateSelection} currentDoodle={selections.doodle} />,
    },
    {
      id: 2,
      title: "스타일 선택",
      component: <StyleStep updateSelection={updateSelection} currentStyle={selections.style} />,
    },
    {
      id: 3,
      title: "결과 확인",
      component: (
        <ResultStep
          image={generatedImage}
          originalDoodle={selections.doodle}
          isLoading={isGenerating}
          imageId={generatedImageId}
          setIsLoading={setIsGenerating}
          setGeneratedImage={setGeneratedImage}
        />
      ),
    },
  ]

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleGenerate = async () => {
    if (!user) {
      router.push("/login")
      return
    }

    if (remainingTickets <= 0) {
      setError("티켓이 부족합니다. 티켓을 구매해주세요.")
      return
    }

    if (currentStep === steps.length - 2) {
      setCurrentStep(currentStep + 1)
      setIsGenerating(true)
      setError(null)
      // 새로운 생성 시작 시 기존 이미지 초기화
      setGeneratedImage(null)
      setGeneratedImageId(null)

      try {
        // 이미지 데이터 검증 및 전처리
        if (!selections.doodle) {
          throw new Error("낙서가 선택되지 않았습니다.")
        }

        // Base64 데이터 검증
        if (!selections.doodle.startsWith("data:image/")) {
          throw new Error("잘못된 이미지 형식입니다.")
        }

        // 이미지 크기 검증 (10MB 제한)
        const base64Data = selections.doodle.split(",")[1]
        if (base64Data) {
          const sizeInBytes = Math.ceil((base64Data.length * 3) / 4)
          const sizeInMB = sizeInBytes / (1024 * 1024)
          
          if (sizeInMB > 10) {
            throw new Error("이미지 크기가 10MB를 초과합니다. 더 작은 이미지를 사용해주세요.")
          }
        }

        console.log("🚀 API 요청 시작 (낙서현실화):", {
          timestamp: new Date().toISOString(),
          userId: user.id.substring(0, 8) + "...",
          hasDoodle: !!selections.doodle,
          doodleType: selections.doodle?.startsWith("data:") ? "base64" : "url",
          doodleSize: base64Data ? `${(base64Data.length * 3 / 4 / 1024 / 1024).toFixed(2)}MB` : "unknown",
          style: selections.style
        })

        // 타임아웃 설정 (5분)
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 300000) // 5분 타임아웃

        const requestBody = {
          doodle: selections.doodle,
          style: selections.style,
          userId: user.id,
        }

        const response = await fetch("/api/doodle-to-reality", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal, // 타임아웃 신호 추가
        })

        clearTimeout(timeoutId) // 응답이 오면 타임아웃 해제

        if (!response.ok) {
          const errorData = await response.json()
          console.error("❌ API 응답 에러 (낙서현실화):", {
            status: response.status,
            statusText: response.statusText,
            error: errorData.error
          })
          throw new Error(errorData.error || "이미지 생성 요청에 실패했습니다")
        }

        const data = await response.json()

        console.log("📥 API 응답 수신 (낙서현실화):", {
          success: data.success,
          hasImageUrl: !!data.imageUrl,
          imageUrl: data.imageUrl?.substring(0, 100) + "...",
          isBase64: data.imageUrl?.startsWith("data:"),
          debug: data.debug,
          timestamp: new Date().toISOString()
        })

        if (data.success) {
          console.log("✅ 낙서현실화 성공, 상태 업데이트 중...")
          setGeneratedImage(data.imageUrl)
          setGeneratedImageId(data.imageId)
          setIsGenerating(false) // 시간버스와 동일하게 성공 시에만 로딩 해제
          
          // 이미지 URL 유효성 검증
          if (data.imageUrl) {
            const img = new Image()
            img.onload = () => {
              console.log("✅ 응답 이미지 URL 유효성 확인 완료 (낙서현실화)")
            }
            img.onerror = (error) => {
              console.error("❌ 응답 이미지 URL 유효성 검증 실패 (낙서현실화):", error)
            }
            img.src = data.imageUrl
          }
        } else {
          console.error("❌ API 응답 에러 (낙서현실화):", data.error)
          setError(data.error || "이미지 생성에 실패했습니다.")
          setIsGenerating(false) // 에러 시에도 로딩 해제
        }
      } catch (error: any) {
        console.error("❌ 이미지 생성 중 오류 (낙서현실화):", {
          error: error.message,
          name: error.name,
          stack: error.stack?.substring(0, 500),
          timestamp: new Date().toISOString()
        })
        
        let errorMessage = "이미지 생성 중 오류가 발생했습니다"
        
        if (error.name === 'AbortError') {
          errorMessage = "요청이 시간 초과되었습니다. 네트워크 연결을 확인하고 다시 시도해주세요."
        } else if (error.message?.includes("네트워크") || error.message?.includes("network")) {
          errorMessage = "네트워크 연결에 문제가 있습니다. 인터넷 연결을 확인해주세요."
        } else if (error.message) {
          errorMessage = `${error.message}`
        }
        
        setError(errorMessage)
        setIsGenerating(false) // catch 블록에서도 로딩 해제
      }
    } else {
      handleNext()
    }
  }

  const isNextDisabled = () => {
    switch (currentStep) {
      case 0:
        return !selections.doodle
      case 1:
        return !selections.style
      default:
        return false
    }
  }

  return (
    <Card className="p-8 shadow-xl rounded-3xl bg-white border-4 border-teal-300 relative overflow-hidden max-w-6xl mx-auto w-full">
      {/* 장식용 도형들 */}
      <div className="absolute -top-10 -right-10 w-20 h-20 rounded-full bg-yellow-300 opacity-50"></div>
      <div className="absolute -bottom-10 -left-10 w-20 h-20 rounded-full bg-blue-300 opacity-50"></div>
      <div className="absolute top-1/2 right-0 w-8 h-8 rounded-full bg-green-300 opacity-50"></div>
      <div className="absolute bottom-1/3 left-0 w-12 h-12 rounded-full bg-teal-300 opacity-50"></div>

      {user && (
        <div className="bg-teal-100 rounded-lg p-3 mb-4 flex justify-between items-center">
          <p className="text-sm text-teal-700">
            <span className="font-medium">남은 티켓:</span> {remainingTickets}개
          </p>
          <Button 
            variant="outline" 
            size="sm" 
            className="text-xs h-7 rounded-full border-gray-300 hover:bg-gray-200 cursor-not-allowed opacity-50"
            disabled
          >
            티켓 구매 (준비중)
            </Button>
        </div>
      )}

      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 p-4 mb-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
              {error.includes("티켓") && (
                <div className="mt-2">
                    <Button
                      size="sm"
                  className="rounded-full bg-gray-400 text-white text-xs cursor-not-allowed opacity-50"
                  disabled
                    >
                  티켓 구매하기 (준비중)
                    </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between mb-6 relative z-10">
        {steps.map((step) => (
          <div
            key={step.id}
            className={`flex flex-col items-center ${step.id <= currentStep + 1 ? "text-teal-600" : "text-gray-400"}`}
          >
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${
                step.id <= currentStep + 1
                  ? "bg-gradient-to-r from-teal-500 to-green-500 text-white"
                  : "bg-gray-200 text-gray-400"
              }`}
            >
              {step.id <= currentStep ? <Check size={16} /> : step.id}
            </div>
            <span className="text-xs hidden md:block font-medium">{step.title}</span>
          </div>
        ))}
      </div>

      <div className="min-h-[500px] flex flex-col justify-between relative z-10">
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4 text-teal-600">{steps[currentStep].title}</h2>
          {steps[currentStep].component}
        </div>

        <div className="flex justify-between mt-4">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 0}
            className="rounded-full border-2 border-teal-300 hover:bg-teal-100"
          >
            <ChevronLeft className="mr-2 h-4 w-4" /> 이전
          </Button>

          <Button
            onClick={currentStep === steps.length - 2 ? handleGenerate : handleNext}
            disabled={isNextDisabled() || isGenerating}
            className="rounded-full bg-gradient-to-r from-teal-500 to-green-500 hover:from-teal-600 hover:to-green-600 text-white"
          >
            {currentStep === steps.length - 2 ? (
              "낙서 현실화하기"
            ) : (
              <>
                다음 <ChevronRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </div>
    </Card>
  )
}
