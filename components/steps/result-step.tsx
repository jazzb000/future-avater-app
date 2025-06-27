"use client"

import { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import { Button } from "@/components/ui/button"
import { Loader2, Download, Share2, Globe, RefreshCw, Maximize2, QrCode } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/contexts/auth-context"
import { supabase } from "@/lib/supabase"
import { QRCodeSVG } from "qrcode.react"

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
  const [imageLoadError, setImageLoadError] = useState<string | null>(null)
  const [imageLoadAttempts, setImageLoadAttempts] = useState(0)
  
  const [generatedImage, setLocalGeneratedImage] = useState<string | null>(image)

  // 이미지가 변경되면 로컬 상태 동기화
  useEffect(() => {
    if (image) {
      console.log("🖼️ 새 이미지 수신:", { 
        imageUrl: image.substring(0, 100) + "...",
        isBase64: image.startsWith("data:"),
        timestamp: new Date().toISOString()
      })
      setLocalGeneratedImage(image)
      setImageLoadError(null)
      setImageLoadAttempts(0)
    }
  }, [image])

  // 이미지 로딩 에러 핸들러
  const handleImageError = (error: any) => {
    const attemptCount = imageLoadAttempts + 1
    setImageLoadAttempts(attemptCount)
    
    console.error("❌ 이미지 로딩 실패:", {
      error: error.message || error,
      imageUrl: generatedImage?.substring(0, 100) + "...",
      attempt: attemptCount,
      timestamp: new Date().toISOString()
    })
    
    if (attemptCount < 3) { // 3번만 재시도
      setTimeout(() => {
        console.log(`🔄 이미지 로딩 재시도 (${attemptCount}/3)`)
        setImageLoadError(null)
        // 단순 재시도 - 캐시버스터 없이
        const imgElement = document.querySelector('img[alt="시간버스"]') as HTMLImageElement
        if (imgElement && generatedImage) {
          imgElement.src = generatedImage
        }
      }, 1000 * attemptCount) // 1초씩 증가
    } else {
      setImageLoadError("이미지를 로딩할 수 없습니다. 새로고침을 시도해주세요.")
    }
  }

  // 이미지 로딩 성공 핸들러
  const handleImageLoad = () => {
    console.log("✅ 이미지 로딩 성공:", {
      imageUrl: generatedImage?.substring(0, 100) + "...",
      timestamp: new Date().toISOString()
    })
    setImageLoadError(null)
    setImageLoadAttempts(0)
  }

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
            link.download = "시간버스.png"
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
          title: "시간버스",
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

  return (
    <div className="space-y-6">
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="relative">
            <Loader2 className="h-16 w-16 animate-spin text-purple-500 mb-4" />
            <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center">
              <div className="w-8 h-8 bg-pink-300 rounded-full opacity-30 animate-ping"></div>
            </div>
          </div>
                      <p className="text-lg font-medium text-purple-600">시간버스가 이동중이에요...</p>
          <p className="text-purple-400 text-sm mt-2">최대 2분이 걸립니다.</p>

          <Button
            onClick={handleManualRefresh}
            variant="outline"
            size="sm"
            className="mt-4 rounded-full border-2 border-purple-300 hover:bg-purple-100"
          >
            새로고침
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
              <div className="w-full h-[300px] overflow-hidden cursor-pointer group relative z-0" onClick={() => !imageLoadError && handleImageClick(generatedImage!)}>
                {imageLoadError ? (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-gray-100 text-gray-500">
                    <div className="text-center p-4">
                      <p className="text-sm mb-2">⚠️ 이미지 로딩 오류</p>
                      <p className="text-xs mb-4">{imageLoadError}</p>
                      <Button
                        onClick={() => {
                          setImageLoadError(null)
                          setImageLoadAttempts(0)
                          handleManualRefresh()
                        }}
                        size="sm"
                        variant="outline"
                        className="text-xs"
                      >
                        다시 시도
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <img 
                      src={generatedImage || "/placeholder.svg"} 
                      alt="시간버스" 
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
                          <p className="text-xs">재시도 중... ({imageLoadAttempts}/3)</p>
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
                시간버스
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

          {/* QR코드 섹션 */}
          <div className="flex justify-center mt-6">
            <div className="bg-white p-4 rounded-xl border-2 border-purple-200 shadow-sm">
              <div className="text-center mb-3">
                <QrCode className="h-5 w-5 text-purple-600 mx-auto mb-1" />
                <p className="text-sm font-medium text-purple-700">QR코드로 이미지 저장</p>
                <p className="text-xs text-purple-500">스캔하면 바로 저장할 수 있어요!</p>
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
          <div className="relative max-w-[35vw] max-h-[100vh] w-auto h-auto">
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
