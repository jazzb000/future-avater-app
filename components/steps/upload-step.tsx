"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Upload, Camera, RotateCw } from "lucide-react"
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
  const [isLoadingCamera, setIsLoadingCamera] = useState(false)
  const [isCapturing, setIsCapturing] = useState(false)
  const [showMobileCameraModal, setShowMobileCameraModal] = useState(false)
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user') // 전면/후면 카메라
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([])
  const [currentCameraId, setCurrentCameraId] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  
  // 스트림 정리 플래그 (메모리 누수 방지)
  const streamCleanupRef = useRef<boolean>(false)

  // 모바일 감지 함수
  const isMobile = () => {
    if (typeof window === 'undefined') return false
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
      window.innerWidth <= 768
  }

  // 안전한 카메라 스트림 정리 함수
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
    if (activeTab !== "camera") {
      stopCameraStream()
    }
  }, [activeTab])

  // 탭 변경 핸들러 - 카메라 탭 클릭시 즉시 카메라 시작
  const handleTabChange = async (value: string) => {
    console.log(`탭 변경: ${activeTab} -> ${value}`)
    setActiveTab(value)
    
    if (value === "camera") {
      // 이전 스트림이 있다면 정리
      stopCameraStream()
      setError(null) // 이전 에러 상태 초기화
      
      // 🚀 카메라 탭 클릭 즉시 카메라 시작! (사용자가 원하는 동작)
      console.log("🎥 카메라 탭 선택됨 - 즉시 카메라 시작!")
      
      // 짧은 지연 후 카메라 시작 (UI 업데이트 후)
      setTimeout(async () => {
        const result = await startCamera()
        if (result) {
          console.log("✅ 카메라 자동 시작 성공!")
        } else {
          console.log("❌ 카메라 자동 시작 실패 - 사용자가 수동으로 시도 가능")
        }
      }, 100)
    } else {
      // 다른 탭으로 이동할 때는 카메라 정리
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

  // 카메라 전환 (전면/후면)
  const switchCamera = async () => {
    const newFacingMode = facingMode === 'user' ? 'environment' : 'user'
    setFacingMode(newFacingMode)
    
    // 현재 스트림 정리 후 새 카메라로 시작
    stopCameraStream()
    await new Promise(resolve => setTimeout(resolve, 500))
    startCamera()
  }

  // 비디오 완전 로딩 대기 함수
  const waitForVideoReady = async (video: HTMLVideoElement, timeout = 10000): Promise<boolean> => {
    return new Promise((resolve) => {
      const startTime = Date.now()
      
      const checkVideoState = () => {
        const elapsed = Date.now() - startTime
        
        if (elapsed > timeout) {
          console.warn("⏰ 비디오 로딩 타임아웃")
          resolve(false)
          return
        }
        
        // 더 엄격한 비디오 상태 검증
        const isReady = video &&
                       video.videoWidth > 0 &&
                       video.videoHeight > 0 &&
                       video.readyState >= 3 && // HAVE_FUTURE_DATA 이상
                       !video.paused &&
                       !video.ended &&
                       video.currentTime > 0
        
        if (isReady) {
          console.log("✅ 비디오 완전 준비됨:", {
            width: video.videoWidth,
            height: video.videoHeight,
            readyState: video.readyState,
            currentTime: video.currentTime,
            paused: video.paused
          })
          resolve(true)
        } else {
          // 100ms마다 다시 확인
          setTimeout(checkVideoState, 100)
        }
      }
      
      checkVideoState()
    })
  }

  // 강화된 카메라 시작 함수
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
        
        console.log("🎥 비디오 요소 설정 완료, 스트림 연결 중...")
        
        // 비디오 로딩 대기 개선
        const waitForVideoLoad = async () => {
          let attempts = 0
          const maxAttempts = 50 // 더 긴 대기시간 (5초)
          
          while (attempts < maxAttempts) {
            if (videoRef.current && 
                videoRef.current.videoWidth > 0 && 
                videoRef.current.videoHeight > 0 && 
                videoRef.current.readyState >= 2) {
              console.log("✅ 비디오 로드 완료:", {
                width: videoRef.current.videoWidth,
                height: videoRef.current.videoHeight,
                readyState: videoRef.current.readyState,
                hasStream: !!videoRef.current.srcObject
              })
              return true
            }
            
            await new Promise(resolve => setTimeout(resolve, 100))
            attempts++
            
            // 중간 체크 로그
            if (attempts % 10 === 0) {
              console.log(`🔄 비디오 로드 대기 중... (${attempts}/${maxAttempts})`, {
                videoWidth: videoRef.current?.videoWidth || 0,
                videoHeight: videoRef.current?.videoHeight || 0,
                readyState: videoRef.current?.readyState || 0,
                srcObject: !!videoRef.current?.srcObject
              })
            }
          }
          
          console.warn("⏰ 비디오 로드 타임아웃")
          return false
        }
        
        // 비디오 재생 시도 (더 적극적)
        try {
          console.log("🎬 비디오 재생 시작...")
          await videoRef.current.play()
          
          // 재생 후 로딩 대기
          const videoLoaded = await waitForVideoLoad()
          if (!videoLoaded) {
            console.warn("⚠️ 비디오 로드 타임아웃 - 하지만 카메라는 활성화됨")
            // 타임아웃이어도 카메라는 활성화 상태로 진행
          } else {
            console.log("🎉 카메라 완전 준비 완료!")
          }
        } catch (playError) {
          console.log("⚠️ 비디오 자동 재생 실패:", playError)
          // 자동 재생 실패해도 스트림은 있으니 진행
        }
      }

      // 성공적으로 카메라가 시작됨을 반환
      return true
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

      // 실패 시 false 반환
      return false
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
        updateSelection("photo", imageData)

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
            updateSelection("photo", optimizedImage)
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
            updateSelection("photo", optimizedImage)
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
            onClick={async () => {
              console.log("사진 바꾸기 버튼 클릭됨")
              
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
              updateSelection("photo", "")
              setActiveTab("upload") // 탭을 업로드로 초기화
              setError(null) // 에러 상태 초기화
              setIsCameraActive(false) // 카메라 상태 초기화
              setIsLoadingCamera(false) // 로딩 상태 초기화
              setIsCapturing(false) // 촬영 상태 초기화
              
              // 짧은 대기 후 상태 확인
              setTimeout(() => {
                console.log("사진 바꾸기 후 상태:", {
                  activeTab,
                  isCameraActive,
                  isLoadingCamera,
                  isCapturing,
                  hasStream: !!cameraStream,
                  videoSrc: videoRef.current?.src || 'empty'
                })
              }, 100)
            }}
            className="rounded-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
          >
            사진 바꾸기
          </Button>
        </div>
      ) : (
        <Tabs defaultValue="upload" value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid grid-cols-2 mb-4 bg-purple-100">
            {!isMobile() && (
              <TabsTrigger value="upload" className="data-[state=active]:bg-purple-500 data-[state=active]:text-white">
                <Upload className="mr-2 h-4 w-4" />
                업로드
              </TabsTrigger>
            )}
            {!isMobile() && (
              <TabsTrigger
                value="camera"
                className="data-[state=active]:bg-purple-500 data-[state=active]:text-white"
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
                  accept="image/*,.jpg,.jpeg,.png,.webp"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="camera">
            <div className="border-4 border-dashed rounded-2xl p-8 text-center border-purple-300">
              <div className="flex flex-col items-center">
                {isCameraActive && !isMobile() ? (
                  <div className="relative w-full max-w-md mb-4">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full rounded-xl border-4 border-purple-300"
                      style={{
                        background: '#000',
                        objectFit: 'cover',
                        display: 'block',
                      }}
                    />
                    <canvas ref={canvasRef} className="hidden" />

                    <div className="absolute bottom-4 left-0 right-0 flex justify-center">
                      <Button
                        onClick={capturePhoto}
                        disabled={isCapturing}
                        className="rounded-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white w-14 h-14 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
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
                    <div className="w-24 h-24 bg-purple-100 rounded-full flex items-center justify-center mb-4 border-4 border-purple-300 animate-pulse">
                      <Camera size={36} className="text-purple-500 animate-bounce" />
                    </div>
                    <p className="mb-4 text-purple-500 font-medium">
                      {isMobile() ? "전체화면 카메라를 준비하고 있습니다..." : "카메라를 준비하고 있습니다..."}
                    </p>
                    <div className="flex gap-1 justify-center">
                      <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
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
                    <div className="w-24 h-24 bg-purple-100 rounded-full flex items-center justify-center mb-4 border-4 border-purple-300">
                      <Camera size={36} className="text-purple-500" />
                    </div>
                    <p className="mb-4 text-purple-500 font-medium">
                      카메라를 활성화하여 사진을 촬영하세요
                    </p>
                    <div className="flex flex-col gap-2">
                      <Button
                        onClick={async () => {
                          console.log("🎥 카메라 켜기 버튼 클릭됨 - 사용자 액션")
                          setError(null)
                          
                          // 브라우저 권한 요청을 위해 바로 startCamera 호출
                          const result = await startCamera()
                          
                          if (!result) {
                            console.log("❌ 카메라 시작 실패 - 사용자에게 알림")
                          }
                        }}
                        disabled={isLoadingCamera}
                        className="rounded-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white disabled:opacity-50"
                      >
                        <Camera className="mr-2 h-4 w-4" /> 
                        {isLoadingCamera ? "카메라 시작 중..." : "카메라 켜기"}
                      </Button>
                      <p className="text-xs text-gray-500 text-center">
                        브라우저에서 카메라 권한을 허용해주세요
                      </p>
                      <Button
                        onClick={() => {
                          console.log("🔄 권한 재요청 버튼 클릭")
                          // 브라우저 권한 설정 페이지 안내
                          setError("브라우저 주소창 옆의 🔒 또는 📷 아이콘을 클릭하여\n카메라 권한을 '허용'으로 변경해주세요")
                        }}
                        variant="outline"
                        size="sm" 
                        className="text-xs border-purple-300 text-purple-600 hover:bg-purple-50"
                      >
                        권한 설정 도움말
                      </Button>
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
        <p>얼굴이 잘 보이는 정면 사진을 사용하면 더 좋은 결과를 얻을 수 있어요.</p>
        <p className="mt-1">웹 카메라로 사진을 찍을 때는 밝은 곳에서 촬영하세요.</p>
      </div>

      {/* 모바일 카메라 전체화면 모달 */}
      {showMobileCameraModal && (
        <div className="fixed inset-0 bg-black z-50 flex flex-col">
          {/* 모달 헤더 */}
          <div className="flex justify-between items-center p-4 bg-purple-600 text-white">
            <h2 className="text-lg font-semibold">사진 촬영</h2>
            <div className="flex items-center gap-2">
              {/* 카메라 전환 버튼 */}
              {availableCameras.length > 1 && (
                <Button
                  onClick={switchCamera}
                  variant="ghost"
                  size="sm"
                  className="text-white hover:bg-purple-700 p-2"
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
                className="text-white hover:bg-purple-700"
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
                  style={{
                    width: '100%',
                    height: '100%',
                    background: '#000',
                    objectFit: 'cover',
                    display: 'block',
                    borderRadius: '1rem',
                  }}
                />
                <canvas ref={canvasRef} className="hidden" />

                {/* 촬영 버튼 */}
                <div className="absolute bottom-8 left-0 right-0 flex justify-center">
                  <Button
                    onClick={capturePhoto}
                    disabled={isCapturing}
                    className="rounded-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white w-16 h-16 flex items-center justify-center disabled:opacity-50 shadow-lg"
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
                  onClick={async () => {
                    console.log("🎥 모바일 카메라 켜기 버튼 클릭됨 - 사용자 액션")
                    setError(null)
                    
                    // 브라우저 권한 요청을 위해 바로 startCamera 호출
                    const result = await startCamera()
                    
                    if (!result) {
                      console.log("❌ 모바일 카메라 시작 실패")
                    }
                  }}
                  disabled={isLoadingCamera}
                  className="rounded-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-8 py-4 text-lg disabled:opacity-50"
                >
                  <Camera className="mr-3 h-6 w-6" /> 
                  {isLoadingCamera ? "카메라 시작 중..." : "카메라 켜기"}
                </Button>
                <p className="text-sm text-white/80 text-center mt-4">
                  브라우저에서 카메라 권한을 허용해주세요
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
