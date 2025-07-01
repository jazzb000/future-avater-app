"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Upload, Camera, Pencil, RotateCw } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card } from "@/components/ui/card"

interface UploadStepProps {
  updateSelection: (key: string, value: string) => void
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
  const [isDrawing, setIsDrawing] = useState(false)
  const [drawingMode, setDrawingMode] = useState(false)
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user') // 전면/후면 카메라
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([])
  const [currentCameraId, setCurrentCameraId] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawingCanvasRef = useRef<HTMLCanvasElement>(null)
  const contextRef = useRef<CanvasRenderingContext2D | null>(null)

  // 모바일 감지 함수
  const isMobile = () => {
    if (typeof window === 'undefined') return false
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
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
    
    // 비디오 요소 정리
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

  // 모바일 카메라 모달 닫기
  const closeMobileCameraModal = () => {
    setShowMobileCameraModal(false)
    stopCameraStream()
  }

  // 컴포넌트 언마운트 시 카메라 스트림 정리
  useEffect(() => {
    return () => {
      stopCameraStream()
    }
  }, [])

  // 탭 변경 시 초기화만 수행 (자동 카메라 시작 제거)
  useEffect(() => {
    if (activeTab === "draw") {
      initializeDrawing()
    } else if (activeTab !== "camera") {
      stopCameraStream()
    }
  }, [activeTab])

  // activeTab이 변경될 때마다 강제로 카메라 상태 초기화
  const handleTabChange = (value: string) => {
    console.log(`탭 변경: ${activeTab} -> ${value}`)
    setActiveTab(value)
    
    if (value === "camera") {
      // 이전 스트림이 있다면 정리
      stopCameraStream()
      setError(null) // 이전 에러 상태 초기화
      
      // 모바일과 데스크톱 모두 수동 카메라 시작 (사용자 명시적 액션 요구)
      console.log("카메라 탭 선택됨 - 사용자 액션 대기")
    } else {
      // 다른 탭으로 이동할 때는 카메라 정리
      stopCameraStream()
    }
  }

  // 그리기 캔버스 초기화
  const initializeDrawing = () => {
    if (!drawingCanvasRef.current) return

    const canvas = drawingCanvasRef.current
    canvas.width = canvas.offsetWidth
    canvas.height = canvas.offsetHeight

    const context = canvas.getContext("2d")
    if (!context) return

    // 흰색 배경으로 시작 (OpenAI API에 적합)
    context.fillStyle = "white"
    context.fillRect(0, 0, canvas.width, canvas.height)

    context.strokeStyle = "black"
    context.lineWidth = 5
    context.lineCap = "round"
    context.lineJoin = "round"
    contextRef.current = context
    setDrawingMode(true)
  }

  // 그리기 시작
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!contextRef.current) return
    setIsDrawing(true)

    const canvas = drawingCanvasRef.current
    if (!canvas) return

    let x, y
    if ("touches" in e) {
      // 터치 이벤트
      const rect = canvas.getBoundingClientRect()
      x = e.touches[0].clientX - rect.left
      y = e.touches[0].clientY - rect.top
    } else {
      // 마우스 이벤트
      x = e.nativeEvent.offsetX
      y = e.nativeEvent.offsetY
    }

    contextRef.current.beginPath()
    contextRef.current.moveTo(x, y)
  }

  // 그리기
  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !contextRef.current) return

    const canvas = drawingCanvasRef.current
    if (!canvas) return

    let x, y
    if ("touches" in e) {
      // 터치 이벤트
      const rect = canvas.getBoundingClientRect()
      x = e.touches[0].clientX - rect.left
      y = e.touches[0].clientY - rect.top
    } else {
      // 마우스 이벤트
      x = e.nativeEvent.offsetX
      y = e.nativeEvent.offsetY
    }

    contextRef.current.lineTo(x, y)
    contextRef.current.stroke()
  }

  // 그리기 종료
  const endDrawing = () => {
    if (!contextRef.current) return
    contextRef.current.closePath()
    setIsDrawing(false)

    // 그린 이미지 저장
    const canvas = drawingCanvasRef.current
    if (canvas) {
      const imageData = canvas.toDataURL("image/png")
      setPreviewUrl(imageData)
      updateSelection("doodle", imageData)
    }
  }

  // 그림 지우기
  const clearDrawing = () => {
    if (!contextRef.current || !drawingCanvasRef.current) return

    // 흰색 배경으로 초기화
    contextRef.current.fillStyle = "white"
    contextRef.current.fillRect(0, 0, drawingCanvasRef.current.width, drawingCanvasRef.current.height)

    setPreviewUrl(null)
    updateSelection("doodle", "")
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

  // 카메라 전환 (전면/후면)
  const switchCamera = async () => {
    const newFacingMode = facingMode === 'user' ? 'environment' : 'user'
    setFacingMode(newFacingMode)
    
    // 현재 스트림 정리 후 새 카메라로 시작
    stopCameraStream()
    await new Promise(resolve => setTimeout(resolve, 500))
    startCamera()
  }

  // 카메라 시작 함수 (모바일 최적화)
  const startCamera = async (retryCount = 0) => {
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
        // 모바일에서 더 긴 대기 시간
        await new Promise(resolve => setTimeout(resolve, isMobile() ? 1500 : 500))
      }
      
      // 미디어 장치 지원 여부 확인
      if (typeof window === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
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
      
      // 사용 가능한 카메라 목록 가져오기
      await getAvailableCameras()

      // 모바일 최적화된 카메라 설정
      const isMobileDevice = typeof window !== 'undefined' && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: facingMode, // 전면/후면 카메라 설정
          ...(currentCameraId ? { deviceId: { exact: currentCameraId } } : {}),
          ...(isMobileDevice ? {
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

      console.log("카메라 스트림 요청 중... (모바일:", isMobileDevice, ")")
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      console.log("카메라 스트림 획득 성공")

      // 스트림이 활성 상태인지 확인
      if (!stream.active) {
        throw new Error("카메라 스트림이 활성화되지 않았습니다.")
      }

      setCameraStream(stream)
      setIsCameraActive(true)
      setIsLoadingCamera(false)

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        
        // 모바일 최적화 속성 설정
        videoRef.current.setAttribute('playsinline', 'true')
        videoRef.current.setAttribute('webkit-playsinline', 'true')
        
        // 비디오 로드 대기 (더 빠른 방법)
        const waitForVideoLoad = async () => {
          let attempts = 0
          const maxAttempts = 30 // 100ms * 30 = 3초
          
          while (attempts < maxAttempts) {
            if (videoRef.current && 
                videoRef.current.videoWidth > 0 && 
                videoRef.current.videoHeight > 0 && 
                videoRef.current.readyState >= 2) {
              console.log("비디오 로드 완료:", {
                width: videoRef.current.videoWidth,
                height: videoRef.current.videoHeight,
                readyState: videoRef.current.readyState
              })
              return true
            }
            
            await new Promise(resolve => setTimeout(resolve, 100))
            attempts++
            
            if (attempts % 5 === 0) {
              console.log(`비디오 로드 대기 중... (${attempts}/${maxAttempts})`)
            }
          }
          
          console.warn("비디오 로드 타임아웃 - 강제 진행")
          return true // 타임아웃이어도 진행 (일부 모바일에서 필요)
        }
        
        const videoLoaded = await waitForVideoLoad()
        if (!videoLoaded) {
          console.warn("비디오 로드 실패하지만 계속 진행")
        }

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
  const capturePhoto = async () => {
    if (isCapturing) {
      console.log("이미 촬영 중입니다.")
      return
    }
    
    setIsCapturing(true)
    setError(null)
    
    try {
      if (!canvasRef.current || !videoRef.current) {
        console.error("캔버스 또는 비디오 요소를 찾을 수 없습니다.")
        setError("촬영 준비가 되지 않았습니다. 잠시 후 다시 시도해주세요.")
        return
      }

      const canvas = canvasRef.current
      const video = videoRef.current
      const context = canvas.getContext("2d")

      if (!context) {
        console.error("캔버스 컨텍스트를 가져올 수 없습니다.")
        setError("촬영 기능에 문제가 있습니다. 브라우저를 새로고침해주세요.")
        return
      }

      // 비디오 스트림이 활성화되어 있는지 확인
      if (!cameraStream || !cameraStream.active) {
        console.error("카메라 스트림이 활성화되지 않았습니다.")
        setError("카메라가 연결되지 않았습니다. 카메라를 다시 켜주세요.")
        return
      }

      // 비디오가 로드될 때까지 대기 (최대 5초)
      let retryCount = 0
      const maxRetries = 25 // 200ms * 25 = 5초
      
      while ((video.videoWidth === 0 || video.videoHeight === 0 || video.readyState < 2) && retryCount < maxRetries) {
        console.log(`비디오 로딩 대기 중... (${retryCount + 1}/${maxRetries})`, {
          videoWidth: video.videoWidth,
          videoHeight: video.videoHeight,
          readyState: video.readyState
        })
        
        await new Promise(resolve => setTimeout(resolve, 200))
        retryCount++
      }

      // 최종 비디오 상태 확인
      if (video.videoWidth === 0 || video.videoHeight === 0) {
        console.error("비디오 로딩 실패:", {
          videoWidth: video.videoWidth,
          videoHeight: video.videoHeight,
          readyState: video.readyState,
          srcObject: video.srcObject
        })
        setError("카메라 영상을 불러올 수 없습니다. 카메라를 다시 켜보세요.")
        return
      }

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
        updateSelection("doodle", imageData)

        // 카메라 스트림 정지
        stopCameraStream()
        
        // 모바일 모달 닫기
        if (isMobile()) {
          setShowMobileCameraModal(false)
        }
        
        console.log("사진 촬영 성공!")
      } else {
        console.error("이미지 데이터를 생성할 수 없습니다.")
        setError("사진을 촬영할 수 없습니다. 다시 시도해주세요.")
      }
    } catch (error) {
      console.error("사진 촬영 중 오류 발생:", error)
      setError("사진 촬영 중 오류가 발생했습니다. 다시 시도해주세요.")
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
    } else {
      setError("이미지 파일만 업로드 가능합니다.")
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-teal-500 font-medium">낙서를 업로드하거나 직접 그려보세요!</p>

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
          <div className="relative w-64 h-64 mb-4 overflow-hidden rounded-xl border-4 border-teal-300">
            <img
              src={previewUrl || "/placeholder.svg"}
              alt="미리보기"
              className="w-full h-full object-contain bg-white"
            />
          </div>
          <Button
            onClick={async () => {
              console.log("낙서 바꾸기 버튼 클릭됨")
              
              // 기존 카메라 스트림 완전 정리
              stopCameraStream()
              
              // 비디오 요소 추가 정리
              if (videoRef.current) {
                videoRef.current.pause()
                videoRef.current.srcObject = null
                videoRef.current.src = ""
                videoRef.current.load() // 비디오 요소 완전 초기화
              }
              
              // 상태 완전 초기화
              setPreviewUrl(null)
              updateSelection("doodle", "")
              setActiveTab("upload") // 탭을 업로드로 초기화
              setError(null) // 에러 상태 초기화
              setIsCameraActive(false) // 카메라 상태 초기화
              setIsLoadingCamera(false) // 로딩 상태 초기화
              setIsCapturing(false) // 촬영 상태 초기화
              
              // 짧은 대기 후 상태 확인
              setTimeout(() => {
                console.log("낙서 바꾸기 후 상태:", {
                  activeTab,
                  isCameraActive,
                  isLoadingCamera,
                  isCapturing,
                  hasStream: !!cameraStream,
                  videoSrc: videoRef.current?.src || 'empty'
                })
              }, 100)
            }}
            className="rounded-full bg-gradient-to-r from-teal-500 to-green-500 hover:from-teal-600 hover:to-green-600 text-white"
          >
            낙서 바꾸기
          </Button>
        </div>
      ) : (
        <Tabs defaultValue="upload" value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className={`grid ${isMobile() ? 'grid-cols-2' : 'grid-cols-3'} mb-4 bg-teal-100`}>
            <TabsTrigger value="upload" className="data-[state=active]:bg-teal-500 data-[state=active]:text-white">
              <Upload className="mr-2 h-4 w-4" />
              업로드
            </TabsTrigger>
            <TabsTrigger value="draw" className="data-[state=active]:bg-teal-500 data-[state=active]:text-white">
              <Pencil className="mr-2 h-4 w-4" />
              직접 그리기
            </TabsTrigger>
            {!isMobile() && (
              <TabsTrigger value="camera" className="data-[state=active]:bg-teal-500 data-[state=active]:text-white">
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
                    id="doodle-upload"
                    type="file"
                    accept="image/*,.jpg,.jpeg,.png,.webp"
                    className="hidden"
                    onChange={handleFileChange}
                  />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="draw">
            <Card className="border-4 border-teal-300 rounded-2xl p-4">
              <div className="flex flex-col items-center">
                <div className="relative w-full h-64 mb-4 bg-white rounded-xl border-2 border-teal-200 overflow-hidden">
                  <canvas
                    ref={drawingCanvasRef}
                    className="w-full h-full cursor-crosshair"
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={endDrawing}
                    onMouseLeave={endDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={endDrawing}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={clearDrawing}
                    variant="outline"
                    className="rounded-full border-2 border-teal-300 hover:bg-teal-100"
                  >
                    지우기
                  </Button>
                </div>
                <p className="mt-4 text-sm text-teal-600">캔버스에 낙서를 그린 후 다음 단계로 진행하세요</p>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="camera">
            <div className="border-4 border-dashed rounded-2xl p-8 text-center border-teal-300">
              <div className="flex flex-col items-center">
                {isCameraActive && !isMobile() ? (
                  <div className="relative w-full max-w-md mb-4">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      onLoadedData={() => console.log("비디오 데이터 로드 완료")}
                      onCanPlay={() => console.log("비디오 재생 가능")}
                      onLoadedMetadata={() => console.log("비디오 메타데이터 로드 완료")}
                      className="w-full rounded-xl border-4 border-teal-300 touch-none"
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
                        disabled={isCapturing}
                        className="rounded-full bg-gradient-to-r from-teal-500 to-green-500 hover:from-teal-600 hover:to-green-600 text-white w-14 h-14 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
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
                    <p className="mb-4 text-teal-500 font-medium">
                      {isMobile() ? "전체화면 카메라를 준비하고 있습니다..." : "카메라를 준비하고 있습니다..."}
                    </p>
                    <div className="flex gap-1 justify-center">
                      <div className="w-2 h-2 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-2 h-2 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-2 h-2 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                    <p className="text-xs text-gray-500 text-center mt-4">
                      {isMobile() ? "전체화면 모드로 카메라가 열립니다" : "브라우저에서 카메라 권한을 요청할 수 있습니다"}
                    </p>
                  </div>
                ) : isCameraActive && isMobile() ? (
                  <div className="flex flex-col items-center py-8">
                    <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-4 border-4 border-green-300">
                      <Camera size={36} className="text-green-500" />
                    </div>
                    <p className="mb-4 text-green-600 font-medium">카메라가 전체화면 모드로 열렸습니다</p>
                    <p className="text-sm text-gray-500 text-center">
                      전체화면에서 사진을 촬영하거나 ✕ 버튼으로 닫을 수 있습니다
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center py-8">
                    <div className="w-24 h-24 bg-teal-100 rounded-full flex items-center justify-center mb-4 border-4 border-teal-300">
                      <Camera size={36} className="text-teal-500" />
                    </div>
                    <p className="mb-4 text-teal-500 font-medium">
                      {isMobile() ? "전체화면 카메라로 낙서를 촬영하세요" : "카메라를 활성화하여 낙서를 촬영하세요"}
                    </p>
                    <div className="flex flex-col gap-2">
                      <Button
                        onClick={() => {
                          console.log("카메라 켜기 버튼 클릭됨")
                          setError(null)
                          startCamera()
                        }}
                        disabled={isLoadingCamera}
                        className="rounded-full bg-gradient-to-r from-teal-500 to-green-500 hover:from-teal-600 hover:to-green-600 text-white disabled:opacity-50"
                      >
                        <Camera className="mr-2 h-4 w-4" /> 
                        {isMobile() ? "전체화면 카메라 켜기" : "카메라 켜기"}
                      </Button>
                      <p className="text-xs text-gray-500 text-center">
                        {isMobile() ? "전체화면 모드로 카메라가 열립니다" : "카메라 권한을 허용해주세요"}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      )}

      <div className="bg-yellow-100 border-l-4 border-yellow-500 p-4 text-sm text-yellow-800 mt-4 rounded-r">
        <p className="font-medium">도움말</p>
        <p>간단한 낙서나 스케치를 업로드하면 AI가 실제 이미지로 변환해줍니다.</p>
        <p className="mt-1">선명한 낙서일수록 더 좋은 결과를 얻을 수 있어요.</p>
      </div>

      {/* 모바일 카메라 전체화면 모달 */}
      {showMobileCameraModal && (
        <div className="fixed inset-0 bg-black z-50 flex flex-col">
          {/* 모달 헤더 */}
          <div className="flex justify-between items-center p-4 bg-teal-600 text-white">
            <h2 className="text-lg font-semibold">낙서 촬영</h2>
            <div className="flex items-center gap-2">
              {/* 카메라 전환 버튼 */}
              {availableCameras.length > 1 && (
                <Button
                  onClick={switchCamera}
                  variant="ghost"
                  size="sm"
                  className="text-white hover:bg-teal-700 p-2"
                  disabled={isLoadingCamera}
                >
                  <RotateCw size={20} />
                  <span className="ml-1 text-xs">
                    {facingMode === 'user' ? '전면' : '후면'}
                  </span>
                </Button>
              )}
              <Button
                onClick={closeMobileCameraModal}
                variant="ghost"
                size="sm"
                className="text-white hover:bg-teal-700"
              >
                ✕
              </Button>
            </div>
          </div>

          {/* 카메라 영역 */}
          <div className="flex-1 flex flex-col justify-center items-center p-4">
            {isCameraActive ? (
              <div className="relative w-full h-full max-w-lg flex flex-col">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover rounded-lg"
                  style={{ 
                    WebkitUserSelect: 'none',
                    userSelect: 'none',
                    WebkitTouchCallout: 'none'
                  }}
                />
                <canvas ref={canvasRef} className="hidden" />

                {/* 촬영 버튼 */}
                <div className="absolute bottom-8 left-0 right-0 flex justify-center">
                  <Button
                    onClick={capturePhoto}
                    disabled={isCapturing}
                    className="rounded-full bg-gradient-to-r from-teal-500 to-green-500 hover:from-teal-600 hover:to-green-600 text-white w-16 h-16 flex items-center justify-center disabled:opacity-50 shadow-lg"
                  >
                    {isCapturing ? (
                      <div className="w-8 h-8 border-3 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Camera size={32} />
                    )}
                  </Button>
                </div>
              </div>
            ) : isLoadingCamera ? (
              <div className="flex flex-col items-center justify-center h-full text-white">
                <div className="w-32 h-32 bg-white/20 rounded-full flex items-center justify-center mb-8 animate-pulse">
                  <Camera size={48} className="text-white animate-bounce" />
                </div>
                <p className="text-xl font-medium mb-4">카메라를 준비하고 있습니다...</p>
                <div className="flex gap-2 justify-center">
                  <div className="w-3 h-3 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-3 h-3 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-3 h-3 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
                <p className="text-sm text-white/80 text-center mt-6">
                  브라우저에서 카메라 권한을 요청할 수 있습니다
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-white">
                <div className="w-32 h-32 bg-white/20 rounded-full flex items-center justify-center mb-8">
                  <Camera size={48} className="text-white" />
                </div>
                <p className="text-xl font-medium mb-6">카메라를 시작하세요</p>
                <Button
                  onClick={() => {
                    console.log("모바일 카메라 켜기 버튼 클릭됨")
                    setError(null)
                    startCamera()
                  }}
                  disabled={isLoadingCamera}
                  className="rounded-full bg-gradient-to-r from-teal-500 to-green-500 hover:from-teal-600 hover:to-green-600 text-white px-8 py-4 text-lg disabled:opacity-50"
                >
                  <Camera className="mr-3 h-6 w-6" /> 카메라 켜기
                </Button>
                <p className="text-sm text-white/80 text-center mt-4">
                  카메라 권한을 허용해주세요
                </p>
              </div>
            )}

            {/* 에러 표시 */}
            {error && (
              <div className="absolute bottom-4 left-4 right-4 bg-red-600 text-white p-4 rounded-lg">
                <p className="text-sm">{error}</p>
                <div className="mt-2 flex gap-2">
                  <Button
                    onClick={() => startCamera()}
                    size="sm"
                    className="bg-red-700 hover:bg-red-800 text-white"
                  >
                    🔄 다시 시도
                  </Button>
                  <Button
                    onClick={() => setError(null)}
                    size="sm"
                    variant="outline"
                    className="border-white text-white hover:bg-white hover:text-red-600"
                  >
                    ✕ 닫기
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
