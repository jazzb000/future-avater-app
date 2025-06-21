"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Loader2, Download, Share2, Globe, RefreshCw, Maximize2 } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/contexts/auth-context"
import { supabase } from "@/lib/supabase"
import { useImageStatus } from "@/hooks/use-image-status"

interface ResultStepProps {
  image: string | null
  isLoading: boolean
  imageId?: string | null
  setIsLoading?: (isLoading: boolean) => void
  setGeneratedImage?: (image: string | null) => void
  originalPhoto?: string | null
}

export function ResultStep({ 
  image, 
  isLoading, 
  imageId, 
  setIsLoading, 
  setGeneratedImage,
  originalPhoto 
}: ResultStepProps) {
  const { user } = useAuth()
  const [isPublic, setIsPublic] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [showFullscreen, setShowFullscreen] = useState(false)
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null)
  
  // 실시간 이미지 상태 추적
  const { status: imageStatus, loading: statusLoading, error: statusError } = useImageStatus(imageId || null)
  
  const [generatedImage, setLocalGeneratedImage] = useState<string | null>(image)

  // 이미지 상태가 업데이트되면 로컬 상태 동기화
  useEffect(() => {
    if (imageStatus) {
      if (imageStatus.status === "completed" && imageStatus.imageUrl) {
        setLocalGeneratedImage(imageStatus.imageUrl)
        setGeneratedImage && setGeneratedImage(imageStatus.imageUrl)
        setIsLoading && setIsLoading(false)
      } else if (imageStatus.status === "error") {
        setIsLoading && setIsLoading(false)
      }
    }
  }, [imageStatus, setGeneratedImage, setIsLoading])

  // 이미지가 변경되면 로컬 상태 동기화 (백업)
  useEffect(() => {
    if (image) {
      setLocalGeneratedImage(image)
    }
  }, [image])

  const handleDownload = () => {
    if (generatedImage) {
      // Base64 이미지인 경우 직접 다운로드
      if (generatedImage.startsWith("data:")) {
        const link = document.createElement("a")
        link.href = generatedImage
        link.download = "미래의-나.png"
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      } else {
        // URL 이미지인 경우 fetch를 통해 다운로드
        fetch(generatedImage)
          .then((response) => response.blob())
          .then((blob) => {
            const url = window.URL.createObjectURL(blob)
            const link = document.createElement("a")
            link.href = url
            link.download = "미래의-나.png"
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            window.URL.revokeObjectURL(url)
          })
          .catch((error) => {
            console.error("이미지 다운로드 중 오류:", error)
            alert("이미지 다운로드에 실패했습니다.")
          })
      }
    }
  }

  const handleShare = async () => {
    if (generatedImage && navigator.share) {
      try {
        let blob: Blob

        if (generatedImage.startsWith("data:")) {
          // Base64 이미지를 Blob으로 변환
          const response = await fetch(generatedImage)
          blob = await response.blob()
        } else {
          // URL 이미지를 Blob으로 변환
          const response = await fetch(generatedImage)
          blob = await response.blob()
        }

        const file = new File([blob], "미래의-나.png", { type: "image/png" })

        await navigator.share({
          title: "미래의 나",
          text: "내 미래 직업을 확인해보세요!",
          files: [file],
        })
      } catch (error) {
        console.error("공유 중 오류:", error)
        // 공유 실패 시 클립보드에 복사
        if (navigator.clipboard && window.location.href) {
          try {
            await navigator.clipboard.writeText(window.location.href)
            alert("링크가 클립보드에 복사되었습니다.")
          } catch (clipboardError) {
            console.error("클립보드 복사 실패:", clipboardError)
          }
        }
      }
    } else {
      alert("이 브라우저에서는 공유 기능을 지원하지 않습니다")
    }
  }

  const handleTogglePublic = async () => {
    if (!user || !imageId) return

    try {
      setIsSaving(true)
      const { error } = await supabase
        .from("generated_images")
        .update({ is_public: !isPublic })
        .eq("id", imageId)
        .eq("user_id", user.id)

      if (error) throw error
      setIsPublic(!isPublic)
    } catch (error) {
      console.error("이미지 공개 설정 변경 중 오류가 발생했습니다:", error)
    } finally {
      setIsSaving(false)
    }
  }

  // 수동 새로고침 (Realtime에서는 거의 필요 없음)
  const handleManualRefresh = () => {
    window.location.reload()
  }

  const handleImageClick = (imageUrl: string) => {
    setFullscreenImage(imageUrl)
    setShowFullscreen(true)
    }

  const handleCloseFullscreen = () => {
    setShowFullscreen(false)
    setFullscreenImage(null)
  }

  // 로딩 상태 결정
  const isCurrentlyLoading = isLoading || (imageStatus?.status === 'processing') || statusLoading

  return (
    <div className="space-y-6">
      {isCurrentlyLoading ? (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="relative">
            <Loader2 className="h-16 w-16 animate-spin text-purple-500 mb-4" />
            <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center">
              <div className="w-8 h-8 bg-pink-300 rounded-full opacity-30 animate-ping"></div>
            </div>
          </div>
          <p className="text-lg font-medium text-purple-600">미래의 나를 만들고 있어요...</p>
          <p className="text-purple-400 text-sm mt-2">이미지 생성에는 최대 2분 정도 소요될 수 있습니다</p>
          
          {imageStatus?.status && (
            <div className="mt-4 text-sm text-purple-500">
              상태: {imageStatus.status === 'processing' ? '처리 중...' : imageStatus.status}
              {imageStatus.status === 'processing' && (
                <span className="ml-2">🔄 실시간 업데이트 중</span>
              )}
            </div>
          )}

          <Button
            onClick={handleManualRefresh}
            variant="outline"
            size="sm"
            className="mt-4 rounded-full border-2 border-purple-300 hover:bg-purple-100"
            disabled={statusLoading}
          >
            {statusLoading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            새로고침
          </Button>
        </div>
      ) : imageStatus?.status === 'error' || statusError ? (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="text-red-500 mb-4">
            <svg className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <p className="text-lg font-medium text-red-600 mb-2">이미지 생성 중 오류가 발생했습니다</p>
          <p className="text-red-400 text-sm text-center mb-4">
            {imageStatus?.errorMessage || statusError || "알 수 없는 오류가 발생했습니다"}
          </p>
          <Button
            onClick={handleManualRefresh}
            variant="outline"
            size="sm"
            className="rounded-full border-2 border-red-300 hover:bg-red-100"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            다시 시도
          </Button>
        </div>
      ) : generatedImage ? (
        <div className="space-y-4">
          <div className="flex justify-center gap-4 flex-col lg:flex-row">
            {/* 원본 사진 */}
            {originalPhoto && (
              <div className="relative max-w-md overflow-hidden rounded-2xl shadow-lg border-4 border-purple-300 bg-gray-900">
                <div className="w-full h-[300px] overflow-hidden cursor-pointer group" onClick={() => handleImageClick(originalPhoto)}>
                  <img
                    src={originalPhoto}
                    alt="원본 사진"
                    className="w-full h-full object-contain transition-transform group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center">
                    <Maximize2 className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                  </div>
                </div>
                <div className="absolute top-2 left-2 bg-purple-500 text-white px-2 py-1 rounded-full text-xs">
                  원본 사진
                </div>
              </div>
            )}

            {/* 미래의 나 이미지 */}
            <div className="relative max-w-md overflow-hidden rounded-2xl shadow-lg border-4 border-purple-300 bg-gray-900">
              <div className="absolute -top-4 -right-4 w-12 h-12 bg-yellow-300 rounded-full opacity-70 z-10"></div>
              <div className="absolute -bottom-4 -left-4 w-12 h-12 bg-pink-300 rounded-full opacity-70 z-10"></div>
              <div className="w-full h-[300px] overflow-hidden cursor-pointer group relative z-0" onClick={() => handleImageClick(generatedImage)}>
                <img 
                  src={generatedImage || "/placeholder.svg"} 
                  alt="미래의 나" 
                  className="w-full h-full object-contain transition-transform group-hover:scale-105" 
                />
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center">
                  <Maximize2 className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                </div>
              </div>
              <div className="absolute top-2 left-2 bg-purple-500 text-white px-2 py-1 rounded-full text-xs">
                미래의 나
              </div>
            </div>
          </div>

          {user && imageId && (
            <div className="flex justify-center items-center gap-2 mt-4">
              <div className="flex items-center space-x-2">
                <Switch id="public-mode" checked={isPublic} onCheckedChange={handleTogglePublic} disabled={isSaving} />
                <Label htmlFor="public-mode" className="flex items-center cursor-pointer">
                  <Globe className="h-4 w-4 mr-1 text-purple-600" />
                  갤러리에 공개하기
                </Label>
              </div>
            </div>
          )}

          <div className="flex justify-center space-x-4 mt-6">
            <Button
              onClick={handleDownload}
              className="rounded-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
            >
              <Download className="mr-2 h-4 w-4" /> 저장하기
            </Button>
            <Button
              variant="outline"
              onClick={handleShare}
              className="rounded-full border-2 border-purple-300 hover:bg-purple-100"
            >
              <Share2 className="mr-2 h-4 w-4" /> 공유하기
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-purple-400">
          <p>이미지가 생성되면 여기에 표시됩니다</p>
        </div>
      )}

      {/* 전체화면 모달 */}
      {showFullscreen && fullscreenImage && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4"
          onClick={handleCloseFullscreen}
        >
          <div className="relative max-w-full max-h-full">
            <img
              src={fullscreenImage}
              alt="전체화면 이미지"
              className="max-w-full max-h-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />
            <Button
              onClick={handleCloseFullscreen}
              variant="outline"
              size="sm"
              className="absolute top-4 right-4 bg-white hover:bg-gray-100"
            >
              ✕
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
