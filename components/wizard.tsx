"use client"

import type React from "react"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { UploadStep } from "./steps/upload-step"
import { AgeStep } from "./steps/age-step"
import { JobStep } from "./steps/job-step"
import { StyleStep } from "./steps/style-step"
import { LayoutStep } from "./steps/layout-step"
import { ResultStep } from "./steps/result-step"
import { Check, ChevronLeft, ChevronRight } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { useTicket } from "@/contexts/ticket-context"
import Link from "next/link"

type WizardStep = {
  id: number
  title: string
  component: React.ReactNode
}

export type UserSelections = {
  photo: string | null
  age: string | null
  job: string | null
  style: string | null
  layout: string | null
  customLayoutData: string | null
}

export function Wizard() {
  const { user } = useAuth()
  const { remainingTickets, refreshTickets } = useTicket()
  const [currentStep, setCurrentStep] = useState(0)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedImage, setGeneratedImage] = useState<string | null>(null)
  const [generatedImageId, setGeneratedImageId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selections, setSelections] = useState<UserSelections>({
    photo: null,
    age: null,
    job: null,
    style: null,
    layout: null,
    customLayoutData: null,
  })
  const router = useRouter()

  const updateSelection = useCallback((key: string, value: string) => {
    setSelections((prev) => {
      // 이전 값과 동일하면 상태를 업데이트하지 않음
      if (prev[key as keyof UserSelections] === value) {
        return prev
      }
      return { ...prev, [key]: value }
    })
  }, [])

  const steps: WizardStep[] = [
    {
      id: 1,
      title: "사진 올리기",
      component: <UploadStep updateSelection={updateSelection} currentPhoto={selections.photo} />,
    },
    {
      id: 2,
      title: "나이 선택하기",
      component: <AgeStep updateSelection={updateSelection} currentAge={selections.age} />,
    },
    {
      id: 3,
      title: "직업 선택하기",
      component: <JobStep updateSelection={updateSelection} currentJob={selections.job} />,
    },
    {
      id: 4,
      title: "스타일 고르기",
      component: <StyleStep updateSelection={updateSelection} currentStyle={selections.style} />,
    },
    {
      id: 5,
      title: "레이아웃 선택하기",
      component: <LayoutStep updateSelection={updateSelection} currentLayout={selections.layout} />,
    },
    {
      id: 6,
      title: "미래의 나!",
      component: (
        <ResultStep
          image={generatedImage}
          isLoading={isGenerating}
          imageId={generatedImageId}
          setIsLoading={setIsGenerating}
          setGeneratedImage={setGeneratedImage}
          originalPhoto={selections.photo}
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

      try {
        const response = await fetch("/api/generate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            photo: selections.photo,
            age: selections.age,
            job: selections.job,
            style: selections.style,
            layout: selections.layout,
            customLayoutData: selections.customLayoutData,
            userId: user.id,
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || "이미지 생성 요청에 실패했습니다")
        }

        const data = await response.json()

        if (data.success) {
          setGeneratedImageId(data.imageId)
          setGeneratedImage(data.imageUrl)
          setIsGenerating(false)
          refreshTickets && refreshTickets()
        } else {
          setError(data.error || "이미지 생성에 실패했습니다.")
          setIsGenerating(false)
        }
      } catch (error: any) {
        console.error("이미지 생성 요청 중 오류:", error)
        setError(`이미지 생성 중 오류가 발생했습니다: ${error.message || ""}`)
        setIsGenerating(false)
      }
    } else {
      handleNext()
    }
  }

  const isNextDisabled = () => {
    switch (currentStep) {
      case 0:
        return !selections.photo
      case 1:
        return !selections.age
      case 2:
        return !selections.job
      case 3:
        return !selections.style
      case 4:
        return !selections.layout
      default:
        return false
    }
  }

  return (
    <Card className="p-6 shadow-lg rounded-3xl bg-white border-4 border-purple-300 relative overflow-hidden">
      {/* 장식용 도형들 */}
      <div className="absolute -top-10 -right-10 w-20 h-20 rounded-full bg-yellow-300 opacity-50"></div>
      <div className="absolute -bottom-10 -left-10 w-20 h-20 rounded-full bg-blue-300 opacity-50"></div>
      <div className="absolute top-1/2 right-0 w-8 h-8 rounded-full bg-green-300 opacity-50"></div>
      <div className="absolute bottom-1/3 left-0 w-12 h-12 rounded-full bg-pink-300 opacity-50"></div>

      {user && (
        <div className="bg-purple-100 rounded-lg p-3 mb-4 flex justify-between items-center">
          <p className="text-sm text-purple-700">
            <span className="font-medium">남은 티켓:</span> {remainingTickets}개
          </p>
          <Link href="/tickets">
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-7 rounded-full border-purple-300 hover:bg-purple-200"
            >
              티켓 구매
            </Button>
          </Link>
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
                  <Link href="/tickets">
                    <Button
                      size="sm"
                      className="rounded-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white text-xs"
                    >
                      티켓 구매하기
                    </Button>
                  </Link>
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
            className={`flex flex-col items-center ${step.id <= currentStep + 1 ? "text-purple-600" : "text-gray-400"}`}
          >
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${
                step.id <= currentStep + 1
                  ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white"
                  : "bg-gray-200 text-gray-400"
              }`}
            >
              {step.id <= currentStep ? <Check size={16} /> : step.id}
            </div>
            <span className="text-xs hidden md:block font-medium">{step.title}</span>
          </div>
        ))}
      </div>

      <div className="min-h-[400px] flex flex-col justify-between relative z-10">
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4 text-purple-600">{steps[currentStep].title}</h2>
          {steps[currentStep].component}
        </div>

        <div className="flex justify-between mt-4">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 0}
            className="rounded-full border-2 border-purple-300 hover:bg-purple-100"
          >
            <ChevronLeft className="mr-2 h-4 w-4" /> 이전
          </Button>

          <Button
            onClick={currentStep === steps.length - 2 ? handleGenerate : handleNext}
            disabled={isNextDisabled() || isGenerating}
            className="rounded-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
          >
            {currentStep === steps.length - 2 ? (
              "미래의 나 만들기"
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
