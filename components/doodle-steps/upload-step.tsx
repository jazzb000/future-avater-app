"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Upload, Camera, Pencil } from "lucide-react"
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
  const [isDrawing, setIsDrawing] = useState(false)
  const [drawingMode, setDrawingMode] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawingCanvasRef = useRef<HTMLCanvasElement>(null)
  const contextRef = useRef<CanvasRenderingContext2D | null>(null)

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

  // 탭 변경 시 카메라 활성화/비활성화
  useEffect(() => {
    if (activeTab === "camera") {
      // 탭이 변경되자마자 즉시 카메라 시작
      setTimeout(() => {
        startCamera()
      }, 100) // 100ms 지연으로 DOM 렌더링 완료 후 실행
    } else if (activeTab === "draw") {
      initializeDrawing()
    } else {
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
      // 새로운 카메라 시작
      setTimeout(() => {
        console.log("카메라 탭 선택됨 - 카메라 시작 시도")
        startCamera()
      }, 200)
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

  // 카메라 시작 함수
  const startCamera = async () => {
    try {
      console.log("카메라 시작 함수 호출됨")
      setError(null)
      
      // 이미 카메라가 활성화되어 있다면 종료
      if (cameraStream) {
        console.log("기존 카메라 스트림 정리 중...")
        stopCameraStream()
        // 잠시 대기 후 새로 시작
        await new Promise(resolve => setTimeout(resolve, 500))
      }
      
      // 권한 확인
      const permissionStatus = await navigator.permissions.query({ name: 'camera' as PermissionName })
      console.log("카메라 권한 상태:", permissionStatus.state)
      
      // 모바일과 데스크톱 환경에 따른 카메라 설정
      const constraints = {
        video: {
          facingMode: "user",
          width: { ideal: 1280, min: 640 },
          height: { ideal: 720, min: 480 },
          // 모바일에서 더 나은 성능을 위한 설정
          frameRate: { ideal: 30, min: 15 }
        }
      }

      console.log("카메라 스트림 요청 중...")
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      console.log("카메라 스트림 획득 성공")

      setCameraStream(stream)
      setIsCameraActive(true)

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        
        // 비디오가 로드된 후에 메타데이터가 준비되면 이벤트 리스너 추가
        videoRef.current.onloadedmetadata = () => {
          console.log("비디오 메타데이터 로드 완료:", {
            width: videoRef.current?.videoWidth,
            height: videoRef.current?.videoHeight
          })
        }
        
        // 비디오가 재생 가능한 상태가 되면 이벤트 리스너 추가
        videoRef.current.oncanplay = () => {
          console.log("비디오 재생 준비 완료")
        }

        // 비디오 재생 강제 실행
        try {
          await videoRef.current.play()
          console.log("비디오 재생 시작됨")
        } catch (playError) {
          console.log("비디오 자동 재생 실패 (사용자 상호작용 필요):", playError)
        }
      }
    } catch (err) {
      console.error("카메라 접근 오류:", err)
      
      // 모바일에서 더 구체적인 에러 메시지
      if (err instanceof DOMException) {
        if (err.name === 'NotAllowedError') {
          setError("카메라 권한이 거부되었습니다. 브라우저 설정에서 카메라 권한을 허용해주세요.")
        } else if (err.name === 'NotFoundError') {
          setError("카메라를 찾을 수 없습니다. 카메라가 연결되어 있는지 확인해주세요.")
        } else if (err.name === 'NotReadableError') {
          setError("카메라가 다른 앱에서 사용 중입니다. 다른 앱을 종료하고 다시 시도해주세요.")
        } else {
          setError("카메라에 접근할 수 없습니다. 카메라 권한을 확인해주세요.")
        }
      } else {
        setError("카메라에 접근할 수 없습니다. 카메라 권한을 확인해주세요.")
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
        updateSelection("doodle", imageData)
        
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
        updateSelection("doodle", result)
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
        updateSelection("doodle", result)
      }
      reader.readAsDataURL(file)
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-teal-500 font-medium">낙서를 업로드하거나 직접 그려보세요!</p>

      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 p-4 mb-4">
          <p className="text-red-700">{error}</p>
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
            onClick={() => {
              setPreviewUrl(null)
              updateSelection("doodle", "")
              setActiveTab("upload")
            }}
            className="rounded-full bg-gradient-to-r from-teal-500 to-green-500 hover:from-teal-600 hover:to-green-600 text-white"
          >
            낙서 바꾸기
          </Button>
        </div>
      ) : (
        <Tabs defaultValue="upload" value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid grid-cols-3 mb-4 bg-teal-100">
            <TabsTrigger value="upload" className="data-[state=active]:bg-teal-500 data-[state=active]:text-white">
              <Upload className="mr-2 h-4 w-4" />
              업로드
            </TabsTrigger>
            <TabsTrigger value="draw" className="data-[state=active]:bg-teal-500 data-[state=active]:text-white">
              <Pencil className="mr-2 h-4 w-4" />
              직접 그리기
            </TabsTrigger>
            <TabsTrigger value="camera" className="data-[state=active]:bg-teal-500 data-[state=active]:text-white">
              <Camera className="mr-2 h-4 w-4" />
              사진 찍기
            </TabsTrigger>
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
                  accept="image/*"
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
                        onClick={() => {
                          // 비디오가 준비될 때까지 잠시 대기
                          setTimeout(() => {
                            capturePhoto()
                          }, 500)
                        }}
                        className="rounded-full bg-gradient-to-r from-teal-500 to-green-500 hover:from-teal-600 hover:to-green-600 text-white w-14 h-14 flex items-center justify-center"
                      >
                        <Camera size={24} />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center py-8">
                    <div className="w-24 h-24 bg-teal-100 rounded-full flex items-center justify-center mb-4 border-4 border-teal-300">
                      <Camera size={36} className="text-teal-500" />
                    </div>
                    <p className="mb-4 text-teal-500 font-medium">카메라를 활성화하여 낙서를 촬영하세요</p>
                    <Button
                      onClick={startCamera}
                      className="rounded-full bg-gradient-to-r from-teal-500 to-green-500 hover:from-teal-600 hover:to-green-600 text-white"
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
        <p>간단한 낙서나 스케치를 업로드하면 AI가 실제 이미지로 변환해줍니다.</p>
        <p className="mt-1">선명한 낙서일수록 더 좋은 결과를 얻을 수 있어요.</p>
      </div>
    </div>
  )
}
