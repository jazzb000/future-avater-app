"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Upload, Camera } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface UploadStepProps {
  updateSelection: (key: string, value: string) => void
  currentPhoto: string | null
}

export function UploadStep({ updateSelection, currentPhoto }: UploadStepProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentPhoto)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<string>("upload")
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null)
  const [isCameraActive, setIsCameraActive] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // 카메라 스트림 정리 함수
  const stopCameraStream = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop())
      setCameraStream(null)
      setIsCameraActive(false)
    }
  }

  // 컴포넌트 언마운트 시 카메라 스트림 정리
  useEffect(() => {
    return () => {
      stopCameraStream()
    }
  }, [])

  // 탭 변경 시 카메라 비활성화만 (수동 시작으로 변경)
  useEffect(() => {
    if (activeTab !== "camera") {
      stopCameraStream()
    }
  }, [activeTab])

  // activeTab이 변경될 때마다 강제로 카메라 상태 초기화
  const handleTabChange = (value: string) => {
    console.log(`탭 변경: ${activeTab} -> ${value}`)
    setActiveTab(value)
    
    if (value !== "camera") {
      // 카메라 탭이 아닌 경우에만 스트림 정리
      stopCameraStream()
    }
  }

  // 카메라 시작 함수 (모바일 최적화)
  const startCamera = async (retryCount = 0) => {
    try {
      console.log(`카메라 시작 함수 호출됨 (시도 ${retryCount + 1})`)
      setError(null)
      
      // 이미 카메라가 활성화되어 있다면 종료
      if (cameraStream) {
        console.log("기존 카메라 스트림 정리 중...")
        stopCameraStream()
        // 모바일에서 더 긴 대기 시간
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
      
      // 미디어 장치 지원 여부 확인
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("이 브라우저는 카메라를 지원하지 않습니다.")
      }
      
      // 권한 확인 (지원하는 브라우저만)
      try {
        if (navigator.permissions) {
          const permissionStatus = await navigator.permissions.query({ name: 'camera' as PermissionName })
          console.log("카메라 권한 상태:", permissionStatus.state)
          
          if (permissionStatus.state === 'denied') {
            throw new Error("카메라 권한이 거부되었습니다. 브라우저 설정에서 카메라 권한을 허용해주세요.")
          }
        }
      } catch (permissionError) {
        console.log("권한 확인 중 오류 (무시):", permissionError)
      }
      
      // 모바일 최적화된 카메라 설정
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
      const constraints = {
        video: {
          facingMode: "user",
          ...(isMobile ? {
            // 모바일에서는 더 낮은 해상도로 시작
            width: { ideal: 640, min: 480 },
            height: { ideal: 480, min: 360 },
            frameRate: { ideal: 15, max: 30 }
          } : {
            // 데스크톱에서는 높은 해상도
            width: { ideal: 1280, min: 640 },
            height: { ideal: 720, min: 480 },
            frameRate: { ideal: 30, min: 15 }
          })
        }
      }

      console.log("카메라 스트림 요청 중... (모바일:", isMobile, ")")
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      console.log("카메라 스트림 획득 성공")

      // 스트림이 활성 상태인지 확인
      if (!stream.active) {
        throw new Error("카메라 스트림이 활성화되지 않았습니다.")
      }

      setCameraStream(stream)
      setIsCameraActive(true)

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        
        // 모바일 최적화 속성 설정
        videoRef.current.setAttribute('playsinline', 'true')
        videoRef.current.setAttribute('webkit-playsinline', 'true')
        
        // 비디오 로드 대기
        await new Promise((resolve, reject) => {
          const timeoutId = setTimeout(() => {
            reject(new Error("비디오 로드 타임아웃"))
          }, 10000) // 10초 타임아웃
          
          const handleLoaded = () => {
            clearTimeout(timeoutId)
            console.log("비디오 메타데이터 로드 완료:", {
              width: videoRef.current?.videoWidth,
              height: videoRef.current?.videoHeight
            })
            resolve(undefined)
          }
          
          if (videoRef.current) {
            videoRef.current.addEventListener('loadedmetadata', handleLoaded, { once: true })
          }
        })

        // 비디오 재생 시도
        try {
          await videoRef.current.play()
          console.log("비디오 재생 시작됨")
        } catch (playError) {
          console.log("비디오 자동 재생 실패:", playError)
        }
      }
    } catch (err) {
      console.error("카메라 접근 오류:", err)
      
      // 재시도 로직 (최대 2회)
      if (retryCount < 2) {
        console.log(`카메라 시작 재시도... (${retryCount + 1}/2)`)
        await new Promise(resolve => setTimeout(resolve, 2000))
        return startCamera(retryCount + 1)
      }
      
      // 모바일에서 더 구체적인 에러 메시지
      if (err instanceof DOMException) {
        switch (err.name) {
          case 'NotAllowedError':
            setError("❌ 카메라 권한이 필요합니다.\n브라우저 주소창 옆의 카메라 아이콘을 클릭하여 권한을 허용해주세요.")
            break
          case 'NotFoundError':
            setError("❌ 카메라를 찾을 수 없습니다.\n다른 앱에서 카메라를 사용 중이지 않은지 확인해주세요.")
            break
          case 'NotReadableError':
            setError("❌ 카메라가 사용 중입니다.\n다른 앱이나 탭에서 카메라를 사용 중이지 않은지 확인해주세요.")
            break
          case 'OverconstrainedError':
            setError("❌ 카메라 설정을 지원하지 않습니다.\n다른 카메라나 브라우저를 사용해보세요.")
            break
          default:
            setError(`❌ 카메라 오류 (${err.name})\n새로고침 후 다시 시도해주세요.`)
        }
      } else {
        setError("❌ 카메라 연결 실패\n• 브라우저를 새로고침해보세요\n• 다른 앱에서 카메라 사용을 종료해보세요\n• 브라우저 설정에서 카메라 권한을 확인해보세요")
      }
    }
  }

  // 사진 촬영 함수
  const capturePhoto = () => {
    if (!canvasRef.current || !videoRef.current) {
      console.error("캔버스 또는 비디오 요소를 찾을 수 없습니다.")
      return
    }

    const canvas = canvasRef.current
    const video = videoRef.current
    const context = canvas.getContext("2d")

    if (!context) {
      console.error("캔버스 컨텍스트를 가져올 수 없습니다.")
      return
    }

    // 비디오가 로드되었는지 확인
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      console.error("비디오가 아직 로드되지 않았습니다.")
      setError("비디오가 준비되지 않았습니다. 잠시 후 다시 시도해주세요.")
      return
    }

    try {
      // 모바일에서 더 안정적인 캔버스 크기 설정
      const videoWidth = video.videoWidth
      const videoHeight = video.videoHeight
      
      // 최대 크기 제한 (모바일 성능 고려)
      const maxWidth = 1280
      const maxHeight = 720
      
      let canvasWidth = videoWidth
      let canvasHeight = videoHeight
      
      // 비율 유지하면서 크기 조정
      if (canvasWidth > maxWidth || canvasHeight > maxHeight) {
        const ratio = Math.min(maxWidth / canvasWidth, maxHeight / canvasHeight)
        canvasWidth = Math.floor(canvasWidth * ratio)
        canvasHeight = Math.floor(canvasHeight * ratio)
      }

      canvas.width = canvasWidth
      canvas.height = canvasHeight

    // 비디오 프레임을 캔버스에 그리기
      context.drawImage(video, 0, 0, canvasWidth, canvasHeight)

      // 캔버스에서 이미지 데이터 추출 (모바일에서 더 나은 품질)
      const imageData = canvas.toDataURL("image/jpeg", 0.9)

      if (imageData && imageData !== "data:,") {
    setPreviewUrl(imageData)
    updateSelection("photo", imageData)

    // 카메라 스트림 정지
    stopCameraStream()
      } else {
        console.error("이미지 데이터를 생성할 수 없습니다.")
        setError("사진을 촬영할 수 없습니다. 다시 시도해주세요.")
      }
    } catch (error) {
      console.error("사진 촬영 중 오류 발생:", error)
      setError("사진 촬영 중 오류가 발생했습니다. 다시 시도해주세요.")
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result as string
        setPreviewUrl(result)
        updateSelection("photo", result)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const file = e.dataTransfer.files?.[0]
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result as string
        setPreviewUrl(result)
        updateSelection("photo", result)
      }
      reader.readAsDataURL(file)
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-purple-500 font-medium">내 사진을 올려서 미래의 직업에서의 모습을 확인해보세요!</p>

      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 p-4 mb-4 rounded-r">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-red-700 font-medium mb-1">카메라 오류</p>
              <pre className="text-red-600 text-sm whitespace-pre-wrap font-sans">{error}</pre>
            </div>
          </div>
          {activeTab === "camera" && (
            <div className="mt-3 pt-3 border-t border-red-200 flex gap-2">
              <Button
                onClick={() => startCamera()}
                size="sm"
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                🔄 다시 시도
              </Button>
              <Button
                onClick={() => setError(null)}
                size="sm"
                variant="outline"
                className="border-red-300 text-red-600 hover:bg-red-50"
              >
                ✕ 닫기
              </Button>
            </div>
          )}
        </div>
      )}

      {previewUrl ? (
        <div className="flex flex-col items-center">
          <div className="relative w-40 h-40 mb-4 overflow-hidden rounded-full border-4 border-pink-300">
            <img src={previewUrl || "/placeholder.svg"} alt="미리보기" className="w-full h-full object-cover" />
          </div>
          <Button
            onClick={() => {
              setPreviewUrl(null)
              updateSelection("photo", "")
            }}
            className="rounded-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
          >
            사진 바꾸기
          </Button>
        </div>
      ) : (
        <Tabs defaultValue="upload" value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid grid-cols-2 mb-4 bg-purple-100">
            <TabsTrigger value="upload" className="data-[state=active]:bg-purple-500 data-[state=active]:text-white">
              사진 올리기
            </TabsTrigger>
            <TabsTrigger value="camera" className="data-[state=active]:bg-purple-500 data-[state=active]:text-white">
              사진 찍기
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload">
            <div
              className={`border-4 border-dashed rounded-2xl p-8 text-center ${
                isDragging ? "border-purple-400 bg-purple-100" : "border-purple-300"
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <div className="flex flex-col items-center">
                <div className="w-24 h-24 bg-purple-100 rounded-full flex items-center justify-center mb-4 border-4 border-purple-300">
                  <Upload size={36} className="text-purple-500" />
                </div>
                <p className="mb-4 text-purple-500 font-medium">여기에 사진을 끌어다 놓거나, 클릭해서 선택하세요</p>
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
                >
                  <Upload className="mr-2 h-4 w-4" /> 사진 올리기
                </Button>
                <input
                  ref={fileInputRef}
                  id="photo-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="camera">
            <div className="border-4 border-dashed rounded-2xl p-8 text-center border-purple-300">
              <div className="flex flex-col items-center">
                {isCameraActive ? (
                  <div className="relative w-full max-w-md mb-4">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      onLoadedData={() => console.log("비디오 데이터 로드 완료")}
                      onCanPlay={() => console.log("비디오 재생 가능")}
                      onLoadedMetadata={() => console.log("비디오 메타데이터 로드 완료")}
                      className="w-full rounded-xl border-4 border-pink-300 touch-none"
                      style={{ 
                        WebkitUserSelect: 'none',
                        userSelect: 'none',
                        WebkitTouchCallout: 'none'
                      }}
                    />
                    <canvas ref={canvasRef} className="hidden" />

                    <div className="absolute bottom-4 left-0 right-0 flex justify-center">
                      <Button
                        onClick={capturePhoto}
                        className="rounded-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white w-14 h-14 flex items-center justify-center"
                      >
                        <Camera size={24} />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center py-8">
                    <div className="w-24 h-24 bg-purple-100 rounded-full flex items-center justify-center mb-4 border-4 border-purple-300">
                      <Camera size={36} className="text-purple-500" />
                    </div>
                    <p className="mb-4 text-purple-500 font-medium">카메라를 활성화하여 사진을 촬영하세요</p>
                    <Button
                      onClick={() => startCamera()}
                      className="rounded-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
                    >
                      <Camera className="mr-2 h-4 w-4" /> 카메라 켜기
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      )}

      <div className="bg-yellow-100 border-l-4 border-yellow-500 p-4 text-sm text-yellow-800 mt-4 rounded-r">
        <p className="font-medium">도움말</p>
        <p>얼굴이 잘 보이는 정면 사진을 사용하면 더 좋은 결과를 얻을 수 있어요.</p>
        <p className="mt-1">웹 카메라로 사진을 찍을 때는 밝은 곳에서 촬영하세요.</p>
      </div>
    </div>
  )
}
