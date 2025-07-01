"use client"

import { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import { Button } from "@/components/ui/button"
import { Loader2, Download, Share2, Globe, RefreshCw, Maximize2, QrCode } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/contexts/auth-context"
import { supabase } from "@/lib/supabase"
import { useDoodleStatus } from "@/hooks/use-doodle-status"
import { QRCodeSVG } from "qrcode.react"

interface ResultStepProps {
  image: string | null
  originalDoodle: string | null
  isLoading: boolean
  imageId?: string | null
  setIsLoading?: (isLoading: boolean) => void
  setGeneratedImage?: (image: string | null) => void
}

export function ResultStep({ 
  image, 
  originalDoodle, 
  isLoading, 
  imageId, 
  setIsLoading, 
  setGeneratedImage 
}: ResultStepProps) {
  const { user } = useAuth()
  const [isPublic, setIsPublic] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [showFullscreen, setShowFullscreen] = useState(false)
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null)
  const [imageLoadError, setImageLoadError] = useState<string | null>(null)
  const [imageLoadAttempts, setImageLoadAttempts] = useState(0)
  
  // 실시간 이미지 상태 추적
  const { status: imageStatus, loading: statusLoading, error: statusError } = useDoodleStatus(imageId || null)
  
  const [generatedImage, setLocalGeneratedImage] = useState<string | null>(image)

  // 이미지 공개 상태 가져오기
  useEffect(() => {
    const fetchImagePublicStatus = async () => {
      if (!imageId) return
      
      try {
        const { data, error } = await supabase
          .from("doodle_images")
          .select("is_public")
          .eq("id", imageId)
          .single()
        
        if (error) throw error
        setIsPublic(data?.is_public || false)
      } catch (error) {
        console.error("이미지 공개 상태를 가져오는 중 오류:", error)
      }
    }

    fetchImagePublicStatus()
  }, [imageId])

  // 이미지 상태가 업데이트되면 로컬 상태 동기화
  useEffect(() => {
    if (imageStatus) {
      if (imageStatus.status === "completed" && imageStatus.imageUrl) {
        console.log("🖼️ 새 이미지 수신 (낙서현실화):", { 
          imageUrl: imageStatus.imageUrl.substring(0, 100) + "...",
          isBase64: imageStatus.imageUrl.startsWith("data:"),
          timestamp: new Date().toISOString()
        })
        setLocalGeneratedImage(imageStatus.imageUrl)
        setGeneratedImage && setGeneratedImage(imageStatus.imageUrl)
        setIsLoading && setIsLoading(false)
        setImageLoadError(null)
        setImageLoadAttempts(0)
      } else if (imageStatus.status === "error") {
        setIsLoading && setIsLoading(false)
      }
    }
  }, [imageStatus, setGeneratedImage, setIsLoading])

  // 이미지 로딩 에러 핸들러 (강화된 버전)
  const handleImageError = (error: any) => {
    const attemptCount = imageLoadAttempts + 1
    setImageLoadAttempts(attemptCount)
    
    console.error("❌ 이미지 로딩 실패 (낙서현실화):", {
      error: error.message || error,
      imageUrl: generatedImage?.substring(0, 100) + "...",
      attempt: attemptCount,
      timestamp: new Date().toISOString()
    })
    
    if (attemptCount < 5) { // 5번까지 재시도 (더 많은 기회)
      setTimeout(() => {
        console.log(`🔄 이미지 로딩 재시도 (${attemptCount}/5)`)
        setImageLoadError(null)
        
        // 캐시버스터와 함께 재시도
        const imgElement = document.querySelector('img[alt="현실화된 이미지"]') as HTMLImageElement
        if (imgElement && generatedImage) {
          // URL에 타임스탬프 추가하여 캐시 방지
          const cacheBuster = `?t=${Date.now()}&retry=${attemptCount}`
          const imageUrl = generatedImage.includes('?') 
            ? `${generatedImage}&t=${Date.now()}&retry=${attemptCount}`
            : `${generatedImage}${cacheBuster}`
          
          imgElement.src = imageUrl
        }
      }, 2000 * attemptCount) // 2초씩 증가 (더 긴 대기시간)
    } else {
      setImageLoadError("이미지를 로딩할 수 없습니다. 페이지를 새로고침하거나 잠시 후 다시 시도해주세요.")
    }
  }

  // 이미지 로딩 성공 핸들러 (강화된 버전)
  const handleImageLoad = () => {
    console.log("✅ 이미지 로딩 성공 (낙서현실화):", {
      imageUrl: generatedImage?.substring(0, 100) + "...",
      timestamp: new Date().toISOString(),
      attempts: imageLoadAttempts
    })
    setImageLoadError(null)
    setImageLoadAttempts(0)
    
    // 로딩 성공 시 부모 컴포넌트에 알림
    if (setGeneratedImage && generatedImage) {
      setGeneratedImage(generatedImage)
    }
  }

  const handleDownload = () => {
    if (generatedImage) {
      // Base64 이미지인 경우 직접 다운로드
      if (generatedImage.startsWith("data:")) {
        const link = document.createElement("a")
        link.href = generatedImage
        link.download = "낙서-현실화.png"
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
      link.download = "낙서-현실화.png"
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
    if (generatedImage && typeof window !== 'undefined' && navigator.share) {
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

        const file = new File([blob], "낙서-현실화.png", { type: "image/png" })

        await navigator.share({
          title: "낙서 현실화",
          text: "내 낙서가 실제 이미지로 변신했어요!",
          files: [file],
        })
      } catch (error) {
        console.error("공유 중 오류:", error)
        // 공유 실패 시 클립보드에 복사
        if (typeof window !== 'undefined' && navigator.clipboard && window.location.href) {
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

    setIsSaving(true)

    try {
      const response = await fetch(`/api/user/images/${imageId}/toggle-public`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user.id,
          isPublic: !isPublic,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setIsPublic(!isPublic)
      } else {
        throw new Error(data.error || "이미지 공개 설정 변경에 실패했습니다.")
      }
    } catch (error) {
      console.error("이미지 공개 설정 변경 중 오류가 발생했습니다:", error)
      alert("이미지 공개 설정 변경에 실패했습니다. 다시 시도해주세요.")
    } finally {
      setIsSaving(false)
    }
  }

  const handleImageClick = (imageUrl: string) => {
    setFullscreenImage(imageUrl)
    setShowFullscreen(true)
  }

  const handleCloseFullscreen = () => {
    setShowFullscreen(false)
    setFullscreenImage(null)
  }

  // 수동 새로고침
  const handleManualRefresh = () => {
    window.location.reload()
  }

  return (
    <div className="space-y-6">
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="relative">
            <Loader2 className="h-16 w-16 animate-spin text-teal-500 mb-4" />
            <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center">
              <div className="w-8 h-8 bg-green-300 rounded-full opacity-30 animate-ping"></div>
            </div>
          </div>
          <p className="text-lg font-medium text-teal-600">낙서를 현실화하고 있어요...</p>
          <p className="text-teal-400 text-sm mt-2">이미지 생성에는 최대 2분 정도 소요될 수 있습니다</p>
          
          {imageStatus?.status && (
            <div className="mt-4 text-sm text-teal-500">
              상태: {imageStatus.status === 'processing' ? '처리 중...' : imageStatus.status}
              {imageStatus.status === 'processing' && (
                <span className="ml-2">🔄 실시간 업데이트 중</span>
              )}
            </div>
          )}
        </div>
      ) : imageStatus?.status === 'error' || statusError ? (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="text-red-500 text-center">
            <p className="text-lg font-medium mb-2">이미지 생성 중 오류가 발생했습니다</p>
            <p className="text-sm">{imageStatus?.errorMessage || statusError}</p>
          </div>
        </div>
      ) : generatedImage ? (
        <div className="space-y-4">
          <div className="flex justify-center gap-4 flex-col lg:flex-row">
            {/* 원본 낙서 */}
            {originalDoodle && (
              <div className="relative max-w-md overflow-hidden rounded-2xl shadow-lg border-4 border-purple-300 bg-gray-900">
                <div className="w-full h-[300px] overflow-hidden cursor-pointer group" onClick={() => handleImageClick(originalDoodle)}>
                <img
                    src={originalDoodle}
                  alt="원본 낙서"
                    className="w-full h-full object-contain transition-transform group-hover:scale-105"
                />
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center">
                    <Maximize2 className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                  </div>
              </div>
                <div className="absolute top-2 left-2 bg-purple-500 text-white px-2 py-1 rounded-full text-xs">
                원본 낙서
              </div>
            </div>
            )}

            {/* 현실화된 이미지 */}
            <div className="relative max-w-md overflow-hidden rounded-2xl shadow-lg border-4 border-purple-300 bg-gray-900">
              <div className="absolute -top-4 -right-4 w-12 h-12 bg-yellow-300 rounded-full opacity-70 z-10"></div>
              <div className="absolute -bottom-4 -left-4 w-12 h-12 bg-pink-300 rounded-full opacity-70 z-10"></div>
              <div className="w-full h-[300px] overflow-hidden cursor-pointer group relative z-0" onClick={() => !imageLoadError && handleImageClick(generatedImage)}>
                {imageLoadError ? (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-gray-100 text-gray-500">
                    <div className="text-center p-4">
                      <p className="text-sm mb-2">⚠️ 이미지 로딩 오류</p>
                      <p className="text-xs">{imageLoadError}</p>
                    </div>
                  </div>
                ) : (
                  <>
                <img
                  src={generatedImage || "/placeholder.svg"} 
                  alt="현실화된 이미지"
                  className="w-full h-full object-contain transition-transform group-hover:scale-105" 
                  onLoad={handleImageLoad}
                  onError={(e) => handleImageError(e)}
                  loading="eager"
                  style={{ 
                    opacity: imageLoadAttempts > 0 ? 0.7 : 1,
                    transition: 'opacity 0.3s ease'
                  }}
                />
                                    {imageLoadAttempts > 0 && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                        <div className="text-white text-center">
                          <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                          <p className="text-xs">재시도 중... ({imageLoadAttempts}/5)</p>
                        </div>
                      </div>
                    )}
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center">
                  <Maximize2 className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                </div>
                  </>
                )}
              </div>
              <div className="absolute top-2 left-2 bg-purple-500 text-white px-2 py-1 rounded-full text-xs">
                현실화된 이미지
              </div>

            </div>
          </div>

          {user && imageId && (
            <div className="flex justify-center items-center gap-2 mt-4">
              <div className="flex items-center space-x-2">
                <Switch id="public-mode" checked={isPublic} onCheckedChange={handleTogglePublic} disabled={isSaving} />
                <Label htmlFor="public-mode" className="flex items-center cursor-pointer">
                  <Globe className="h-4 w-4 mr-1 text-teal-600" />
                  갤러리에 공개하기
                </Label>
              </div>
            </div>
          )}

          {/* QR코드 섹션 */}
          <div className="flex justify-center mt-6">
            <div className="bg-white p-4 rounded-xl border-2 border-teal-200 shadow-sm">
              <div className="text-center mb-3">
                <QrCode className="h-5 w-5 text-teal-600 mx-auto mb-1" />
                <p className="text-sm font-medium text-teal-700">QR코드로 이미지 저장</p>
                <p className="text-xs text-teal-500">스캔하면 바로 저장할 수 있어요!</p>
              </div>
              {generatedImage && (
                <QRCodeSVG
                  value={generatedImage}
                  size={120}
                  bgColor="#ffffff"
                  fgColor="#000000"
                  level="M"
                  includeMargin={true}
                />
              )}
            </div>
          </div>

          <div className="flex justify-center space-x-4 mt-6">
            <Button
              onClick={handleDownload}
              className="rounded-full bg-gradient-to-r from-teal-500 to-green-500 hover:from-teal-600 hover:to-green-600 text-white"
            >
              <Download className="mr-2 h-4 w-4" /> 저장하기
            </Button>
            <Button
              variant="outline"
              onClick={handleShare}
              className="rounded-full border-2 border-teal-300 hover:bg-teal-100"
            >
              <Share2 className="mr-2 h-4 w-4" /> 공유하기
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-teal-400">
          <p>이미지가 생성되면 여기에 표시됩니다</p>
        </div>
      )}

      {/* 전체화면 모달 - Portal로 body에 직접 렌더링 */}
      {showFullscreen && fullscreenImage && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 bg-black bg-opacity-70 z-[9999] flex items-center justify-center p-4"
          onClick={handleCloseFullscreen}
          style={{ 
            position: 'fixed', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0,
            width: '100vw',
            height: '100vh',
            margin: 0,
            padding: 0
          }}
        >
          <div className="relative max-w-[60vw] max-h-[100vh] w-auto h-auto">
            <img
              src={fullscreenImage}
              alt="전체화면 이미지"
              className="w-full h-full object-contain rounded-lg shadow-2xl"
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
        </div>,
        document.body
      )}
    </div>
  )
}
