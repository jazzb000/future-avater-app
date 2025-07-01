"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Upload, Camera, RotateCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface UploadStepProps {
  updateSelection: (key: string, value: any) => void
  currentDoodle: string | null
}

export function UploadStep({ updateSelection, currentDoodle }: UploadStepProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentDoodle)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<string>("upload")
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null)
  const [isCameraActive, setIsCameraActive] = useState(false)
  const [isLoadingCamera, setIsLoadingCamera] = useState(false)
  const [isCapturing, setIsCapturing] = useState(false)
  const [showMobileCameraModal, setShowMobileCameraModal] = useState(false)
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user')
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([])
  const [currentCameraId, setCurrentCameraId] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // 모바일 감지 함수
  const isMobile = () => {
    if (typeof window === 'undefined') return false
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      window.innerWidth <= 768
  }

  // 카메라 스트림 정리 함수
  const stopCameraStream = () => {
    console.log("카메라 스트림 정리 시작")
    
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => {
        console.log(`트랙 정리: ${track.kind} - ${track.readyState}`)
        track.stop()
      })
      setCameraStream(null)
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null
      videoRef.current.src = ""
    }
    
    setIsCameraActive(false)
    setIsLoadingCamera(false)
    setIsCapturing(false)
    setShowMobileCameraModal(false)
    console.log("카메라 스트림 정리 완료")
  }

  // 컴포넌트 언마운트 시 카메라 스트림 정리
  useEffect(() => {
    return () => {
      stopCameraStream()
    }
  }, [])

  // 탭 변경 시 초기화
  useEffect(() => {
    if (activeTab !== "camera") {
      stopCameraStream()
    }
  }, [activeTab])

  // 탭 변경 핸들러 - 카메라 탭 클릭시 즉시 카메라 시작
  const handleTabChange = async (value: string) => {
    console.log(`탭 변경: ${activeTab} -> ${value}`)
    setActiveTab(value)
    
    if (value === "camera") {
      stopCameraStream()
      setError(null)
      
      // 🚀 카메라 탭 클릭 즉시 카메라 시작! (시간버스와 동일)
      console.log("🎥 낙서현실화 카메라 탭 선택됨 - 즉시 카메라 시작!")
      
      // 짧은 지연 후 카메라 시작 (UI 업데이트 후)
      setTimeout(async () => {
        const result = await startCamera()
        if (result) {
          console.log("✅ 낙서현실화 카메라 자동 시작 성공!")
        } else {
          console.log("❌ 낙서현실화 카메라 자동 시작 실패 - 사용자가 수동으로 시도 가능")
        }
      }, 100)
    } else {
      stopCameraStream()
    }
  }

  // 사용 가능한 카메라 목록 가져오기
  const getAvailableCameras = async () => {
    if (typeof window === 'undefined') return []
    
    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      const cameras = devices.filter(device => device.kind === 'videoinput')
      setAvailableCameras(cameras)
      return cameras
    } catch (error) {
      console.error("카메라 목록 가져오기 실패:", error)
      return []
    }
  }

  // 카메라 시작 함수
  const startCamera = async (retryCount = 0): Promise<boolean> => {
    // 모바일에서는 전체화면 모달 먼저 표시
    if (isMobile()) {
      setShowMobileCameraModal(true)
    }
    
    try {
      console.log(`카메라 시작 함수 호출됨 (시도 ${retryCount + 1})`)
      setError(null)
      setIsLoadingCamera(true)
      
      // 이미 카메라가 활성화되어 있다면 종료
      if (cameraStream) {
        console.log("기존 카메라 스트림 정리 중...")
        stopCameraStream()
        await new Promise(resolve => setTimeout(resolve, isMobile() ? 1500 : 500))
      }
      
      // 미디어 장치 지원 여부 확인
      if (typeof window === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("이 브라우저는 카메라를 지원하지 않습니다.")
      }
      
      // 사용 가능한 카메라 목록 가져오기
      await getAvailableCameras()

      // 카메라 설정
      const isMobileDevice = isMobile()
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: facingMode,
          ...(currentCameraId ? { deviceId: { exact: currentCameraId } } : {}),
          ...(isMobileDevice ? {
            width: { ideal: 640, min: 480 },
            height: { ideal: 480, min: 360 },
            frameRate: { ideal: 15, max: 30 }
          } : {
            width: { ideal: 1280, min: 640 },
            height: { ideal: 720, min: 480 },
            frameRate: { ideal: 30, min: 15 }
          })
        }
      }

      console.log("카메라 스트림 요청 중...")
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      console.log("카메라 스트림 획득 성공")

      if (!stream.active) {
        throw new Error("카메라 스트림이 활성화되지 않았습니다.")
      }

      setCameraStream(stream)
      setIsCameraActive(true)
      setIsLoadingCamera(false)

      if (videoRef.current) {
        // 먼저 스트림 설정
        videoRef.current.srcObject = stream
        
        // 중요한 비디오 속성들 설정
        videoRef.current.setAttribute('autoplay', 'true')
        videoRef.current.setAttribute('playsinline', 'true')
        videoRef.current.setAttribute('webkit-playsinline', 'true')
        videoRef.current.setAttribute('muted', 'true')
        videoRef.current.muted = true // JavaScript 속성도 설정
        
        // 비디오 크기 강제 설정 (검은 화면 방지)
        videoRef.current.style.width = '100%'
        videoRef.current.style.height = '100%'
        videoRef.current.style.objectFit = 'cover'
        videoRef.current.style.transform = 'scaleX(-1)' // 거울 모드 (셀카처럼)
        
        console.log("🎥 낙서현실화 비디오 요소 설정 완료, 스트림 연결 중...")
        
        // 비디오 재생 시도 (더 적극적)
        try {
          console.log("🎬 낙서현실화 비디오 재생 시작...")
          await videoRef.current.play()
          console.log("🎉 낙서현실화 카메라 준비 완료!")
        } catch (playError) {
          console.log("⚠️ 낙서현실화 비디오 자동 재생 실패:", playError)
          // 자동 재생 실패해도 스트림은 있으니 진행
        }
      }

      return true
    } catch (err) {
      console.error("카메라 접근 오류:", err)
      
      if (retryCount < 2) {
        console.log(`카메라 시작 재시도... (${retryCount + 1}/2)`)
        await new Promise(resolve => setTimeout(resolve, 2000))
        return startCamera(retryCount + 1)
      }
      
      if (err instanceof DOMException) {
        switch (err.name) {
          case 'NotAllowedError':
            setError("❌ 카메라 권한이 필요합니다.\n브라우저 주소창 옆의 카메라 아이콘을 클릭하여 권한을 허용해주세요.")
            break
          case 'NotFoundError':
            setError("❌ 카메라를 찾을 수 없습니다.")
            break
          case 'NotReadableError':
            setError("❌ 카메라가 사용 중입니다.")
            break
          default:
            setError(`❌ 카메라 오류: ${err.message}`)
        }
      } else {
        setError("❌ 카메라 연결 실패")
      }

      return false
    }
  }

  // 사진 촬영 함수
  const capturePhoto = async () => {
    if (isCapturing) return
    
    setIsCapturing(true)
    setError(null)
    
    try {
      if (!canvasRef.current || !videoRef.current) {
        setError("촬영 준비가 되지 않았습니다.")
        return
      }

      const canvas = canvasRef.current
      const video = videoRef.current
      const context = canvas.getContext("2d")

      if (!context) {
        setError("촬영 기능에 문제가 있습니다.")
        return
      }

      if (!cameraStream || !cameraStream.active) {
        setError("카메라가 연결되지 않았습니다.")
        return
      }

      // 비디오가 로드될 때까지 대기
      let retryCount = 0
      const maxRetries = 25
      
      while ((video.videoWidth === 0 || video.videoHeight === 0 || video.readyState < 2) && retryCount < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 200))
        retryCount++
      }

      if (video.videoWidth === 0 || video.videoHeight === 0) {
        setError("카메라 영상을 불러올 수 없습니다.")
        return
      }

      // 캔버스 크기 설정
      const videoWidth = video.videoWidth
      const videoHeight = video.videoHeight
      const maxWidth = 1280
      const maxHeight = 720
      
      let canvasWidth = videoWidth
      let canvasHeight = videoHeight
      
      if (canvasWidth > maxWidth || canvasHeight > maxHeight) {
        const ratio = Math.min(maxWidth / canvasWidth, maxHeight / canvasHeight)
        canvasWidth = Math.floor(canvasWidth * ratio)
        canvasHeight = Math.floor(canvasHeight * ratio)
      }

      canvas.width = canvasWidth
      canvas.height = canvasHeight
      context.drawImage(video, 0, 0, canvasWidth, canvasHeight)

      const imageData = canvas.toDataURL("image/jpeg", 0.9)

      if (imageData && imageData !== "data:,") {
        setPreviewUrl(imageData)
        updateSelection("doodle", imageData)

        stopCameraStream()
        
        if (isMobile()) {
          setShowMobileCameraModal(false)
        }
        
        console.log("사진 촬영 성공!")
      } else {
        setError("사진을 촬영할 수 없습니다.")
      }
    } catch (error) {
      console.error("사진 촬영 중 오류:", error)
      setError("사진 촬영 중 오류가 발생했습니다.")
    } finally {
      setIsCapturing(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // 파일 타입 검증
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
      if (!validTypes.includes(file.type)) {
        setError("JPG, JPEG, PNG, WebP 파일만 업로드 가능합니다.")
        return
      }

      // 파일 크기 검증 (10MB)
      if (file.size > 10 * 1024 * 1024) {
        setError("파일 크기는 10MB 이하여야 합니다.")
        return
      }

      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result as string
        
        // 이미지를 Canvas로 변환하여 PNG로 통일
        const img = new Image()
        img.onload = () => {
          const canvas = document.createElement('canvas')
          const ctx = canvas.getContext('2d')
          
          if (ctx) {
            // 최대 해상도 제한 (2048x2048)
            const maxSize = 2048
            let { width, height } = img
            
            if (width > maxSize || height > maxSize) {
              const ratio = Math.min(maxSize / width, maxSize / height)
              width = Math.floor(width * ratio)
              height = Math.floor(height * ratio)
            }
            
            canvas.width = width
            canvas.height = height
            
            // 고품질 렌더링
            ctx.imageSmoothingEnabled = true
            ctx.imageSmoothingQuality = 'high'
            
            // 흰색 배경 (JPEG 투명도 처리)
            ctx.fillStyle = 'white'
            ctx.fillRect(0, 0, width, height)
            
            // 이미지 그리기
            ctx.drawImage(img, 0, 0, width, height)
            
            // PNG로 변환 (고품질)
            const optimizedImage = canvas.toDataURL('image/png', 1.0)
            setPreviewUrl(optimizedImage)
            updateSelection("doodle", optimizedImage)
            setError(null)
          }
        }
        img.onerror = () => {
          setError("이미지 파일을 읽을 수 없습니다.")
        }
        img.src = result
      }
      reader.onerror = () => {
        setError("파일을 읽는 중 오류가 발생했습니다.")
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
      // 드래그앤드롭에서도 같은 처리 로직 사용
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
      if (!validTypes.includes(file.type)) {
        setError("JPG, JPEG, PNG, WebP 파일만 업로드 가능합니다.")
        return
      }

      // 파일 크기 검증 (10MB)
      if (file.size > 10 * 1024 * 1024) {
        setError("파일 크기는 10MB 이하여야 합니다.")
        return
      }

      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result as string
        
        // 이미지를 Canvas로 변환하여 PNG로 통일
        const img = new Image()
        img.onload = () => {
          const canvas = document.createElement('canvas')
          const ctx = canvas.getContext('2d')
          
          if (ctx) {
            // 최대 해상도 제한 (2048x2048)
            const maxSize = 2048
            let { width, height } = img
            
            if (width > maxSize || height > maxSize) {
              const ratio = Math.min(maxSize / width, maxSize / height)
              width = Math.floor(width * ratio)
              height = Math.floor(height * ratio)
            }
            
            canvas.width = width
            canvas.height = height
            
            // 고품질 렌더링
            ctx.imageSmoothingEnabled = true
            ctx.imageSmoothingQuality = 'high'
            
            // 흰색 배경 (JPEG 투명도 처리)
            ctx.fillStyle = 'white'
            ctx.fillRect(0, 0, width, height)
            
            // 이미지 그리기
            ctx.drawImage(img, 0, 0, width, height)
            
            // PNG로 변환 (고품질)
            const optimizedImage = canvas.toDataURL('image/png', 1.0)
            setPreviewUrl(optimizedImage)
            updateSelection("doodle", optimizedImage)
            setError(null)
          }
        }
        img.onerror = () => {
          setError("이미지 파일을 읽을 수 없습니다.")
        }
        img.src = result
      }
      reader.onerror = () => {
        setError("파일을 읽는 중 오류가 발생했습니다.")
      }
      reader.readAsDataURL(file)
    } else {
      setError("이미지 파일만 업로드 가능합니다.")
    }
  }

  return (
    <div className="space-y-6">
      {/* 에러 메시지 */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg flex justify-between items-start">
          <div className="flex-1">
            <p className="font-medium text-sm">업로드 오류</p>
            <p className="text-sm whitespace-pre-line">{error}</p>
          </div>
        </div>
      )}

      {previewUrl ? (
        <div className="flex flex-col items-center">
          <div className="relative w-40 h-40 mb-4 overflow-hidden rounded-full border-4 border-teal-300">
            <img src={previewUrl || "/placeholder.svg"} alt="미리보기" className="w-full h-full object-cover" />
          </div>
          <Button
            onClick={() => {
              setPreviewUrl(null)
              updateSelection("doodle", "")
              setActiveTab("upload")
              setError(null)
            }}
            className="rounded-full bg-gradient-to-r from-teal-500 to-green-500 hover:from-teal-600 hover:to-green-600 text-white"
          >
            낙서 바꾸기
          </Button>
        </div>
      ) : (
        <Tabs defaultValue="upload" value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className={`grid ${isMobile() ? 'grid-cols-1' : 'grid-cols-2'} mb-4 bg-teal-100`}>
            {!isMobile() && (
              <TabsTrigger value="upload" className="data-[state=active]:bg-teal-500 data-[state=active]:text-white">
                <Upload className="mr-2 h-4 w-4" />
                업로드
              </TabsTrigger>
            )}
            {!isMobile() && (
              <TabsTrigger
                value="camera"
                className="data-[state=active]:bg-teal-500 data-[state=active]:text-white"
                onClick={async () => {
                  setTimeout(() => {
                    startCamera();
                  }, 100);
                }}
              >
                <Camera className="mr-2 h-4 w-4" />
                사진 찍기
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="upload">
            <div
              className={`border-4 border-dashed rounded-2xl p-8 text-center ${
                isDragging ? "border-teal-400 bg-teal-100" : "border-teal-300"
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <div className="flex flex-col items-center">
                <div className="w-24 h-24 bg-teal-100 rounded-full flex items-center justify-center mb-4 border-4 border-teal-300">
                  <Upload size={36} className="text-teal-500" />
                </div>
                <p className="mb-4 text-teal-500 font-medium">여기에 낙서를 끌어다 놓거나, 클릭해서 선택하세요</p>
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-full bg-gradient-to-r from-teal-500 to-green-500 hover:from-teal-600 hover:to-green-600 text-white"
                >
                  <Upload className="mr-2 h-4 w-4" /> 낙서 올리기
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.jpg,.jpeg,.png,.webp"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>
            </div>
          </TabsContent>

          {!isMobile() && (
            <TabsContent value="camera">
              <div className="border-4 border-dashed rounded-2xl p-8 text-center border-teal-300">
                <div className="flex flex-col items-center">
                  {isCameraActive ? (
                    <div className="relative w-full max-w-md mb-4">
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full rounded-xl border-4 border-teal-300"
                      />
                      <canvas ref={canvasRef} className="hidden" />

                      <div className="absolute bottom-4 left-0 right-0 flex justify-center">
                        <Button
                          onClick={capturePhoto}
                          disabled={isCapturing}
                          className="rounded-full bg-gradient-to-r from-teal-500 to-green-500 hover:from-teal-600 hover:to-green-600 text-white w-14 h-14 flex items-center justify-center disabled:opacity-50"
                        >
                          {isCapturing ? (
                            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Camera size={24} />
                          )}
                        </Button>
                      </div>
                    </div>
                  ) : isLoadingCamera ? (
                    <div className="flex flex-col items-center py-8">
                      <div className="w-24 h-24 bg-teal-100 rounded-full flex items-center justify-center mb-4 border-4 border-teal-300 animate-pulse">
                        <Camera size={36} className="text-teal-500 animate-bounce" />
                      </div>
                      <p className="mb-4 text-teal-500 font-medium">카메라를 준비하고 있습니다...</p>
                      <div className="flex gap-1 justify-center">
                        <div className="w-2 h-2 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-2 h-2 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-2 h-2 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center py-8">
                      <div className="w-24 h-24 bg-teal-100 rounded-full flex items-center justify-center mb-4 border-4 border-teal-300">
                        <Camera size={36} className="text-teal-500" />
                      </div>
                      <p className="mb-4 text-teal-500 font-medium">
                        카메라 탭을 누르면 자동으로 카메라가 켜집니다
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
          )}
        </Tabs>
      )}

      <div className="bg-yellow-100 border-l-4 border-yellow-500 p-4 text-sm text-yellow-800 mt-4 rounded-r">
        <p className="font-medium">도움말</p>
        <p>간단한 낙서나 스케치를 업로드하면 AI가 실제 이미지로 변환해줍니다.</p>
        <p className="mt-1">선명한 낙서일수록 더 좋은 결과를 얻을 수 있어요.</p>
      </div>
    </div>
  )
}
