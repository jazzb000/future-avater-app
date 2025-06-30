"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { User, ImageIcon, Eye, EyeOff, Loader2, Sparkles, Pencil, QrCode, Download, Share2 } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { QRCodeSVG } from "qrcode.react"
import Link from "next/link"

type Profile = {
  username: string
  full_name: string
  avatar_url: string
}

type GeneratedImage = {
  id: string
  image_url: string
  job: string
  age: string
  style: string
  layout: string
  created_at: string
  is_public: boolean
  type: 'future' // 미래의 나 이미지
}

type DoodleImage = {
  id: string
  result_image_url: string
  original_image_url: string
  style: string
  created_at: string
  is_public: boolean
  type: 'doodle' // 낙서 현실화 이미지
}

type UserImage = GeneratedImage | DoodleImage

export default function ProfilePage() {
  const { user } = useAuth()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [images, setImages] = useState<UserImage[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [updatingImageId, setUpdatingImageId] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedImage, setSelectedImage] = useState<UserImage | null>(null)
  const router = useRouter()

  useEffect(() => {
    if (!user) {
      router.push("/login")
      return
    }

    const fetchProfile = async () => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("username, full_name, avatar_url")
          .eq("id", user.id)
          .single()

        if (error) throw error
        setProfile(data)
      } catch (error) {
        console.error("프로필을 가져오는 중 오류가 발생했습니다:", error)
      }
    }

    const fetchImages = async () => {
      try {
        console.log("🖼️ 사용자 이미지 조회 시작")
        
        // 병렬로 두 테이블에서 동시에 데이터 가져오기
        const [futureResult, doodleResult] = await Promise.all([
          supabase
          .from("generated_images")
          .select("*")
          .eq("user_id", user.id)
            .order("created_at", { ascending: false }),
          supabase
          .from("doodle_images")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
        ])

        if (futureResult.error) {
          console.error("미래의 나 이미지 조회 오류:", futureResult.error)
        }

        if (doodleResult.error) {
          console.error("낙서 현실화 이미지 조회 오류:", doodleResult.error)
        }

        // 두 이미지 배열을 합치고 타입 정보 추가
        const futureImagesWithType = (futureResult.data || []).map(img => ({
          ...img,
          type: 'future' as const
        }))

        const doodleImagesWithType = (doodleResult.data || []).map(img => ({
          ...img,
          type: 'doodle' as const
        }))

        // 생성일 기준으로 정렬
        const allImages = [...futureImagesWithType, ...doodleImagesWithType]
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

        console.log("✅ 이미지 조회 완료:", { 
          futureCount: futureImagesWithType.length, 
          doodleCount: doodleImagesWithType.length,
          totalCount: allImages.length 
        })

        setImages(allImages)
      } catch (error) {
        console.error("이미지를 가져오는 중 오류가 발생했습니다:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
    fetchImages()
  }, [user, router])

  // 이미지 로딩 완료 후 모든 카드가 표시되도록 하는 안전장치
  useEffect(() => {
    if (!loading && images.length > 0) {
      // 2초 후에 모든 카드를 강제로 표시 (이미지 로드 실패 등을 대비)
      const timer = setTimeout(() => {
        images.forEach(image => {
          const cardElement = document.getElementById(`profile-card-${image.id}`);
          if (cardElement && cardElement.style.opacity === '0') {
            cardElement.style.opacity = '1';
          }
        });
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [loading, images])

  // ESC 키로 모달 닫기
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && modalOpen) {
        closeModal()
      }
    }

    if (modalOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [modalOpen])

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !profile) return

    setUpdating(true)
    setError(null)

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          username: profile.username,
          full_name: profile.full_name,
        })
        .eq("id", user.id)

      if (error) throw error
      alert("프로필이 업데이트되었습니다.")
    } catch (err) {
      setError("프로필 업데이트 중 오류가 발생했습니다.")
    } finally {
      setUpdating(false)
    }
  }

  const toggleImagePublic = async (imageId: string, isPublic: boolean, imageType: 'future' | 'doodle') => {
    if (!user) return

    setUpdatingImageId(imageId)

    try {
      // 이미지 타입에 따라 다른 API 엔드포인트 사용
      const endpoint = imageType === 'future' 
        ? `/api/images/${imageId}/toggle-public`
        : `/api/user/images/${imageId}/toggle-public`

      const response = await fetch(endpoint, {
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
        // 이미지 상태 업데이트
        setImages((prevImages) =>
          prevImages.map((img) => (img.id === imageId ? { ...img, is_public: !isPublic } : img)),
        )
      } else {
        throw new Error(data.error || "이미지 공개 설정 변경에 실패했습니다.")
      }
    } catch (error) {
      console.error("이미지 공개 설정 변경 중 오류:", error)
      alert("이미지 공개 설정 변경에 실패했습니다.")
    } finally {
      setUpdatingImageId(null)
    }
  }

  // 이미지 클릭 핸들러
  const handleImageClick = (image: UserImage) => {
    setSelectedImage(image)
    setModalOpen(true)
  }

  // 모달 닫기
  const closeModal = () => {
    setModalOpen(false)
    setSelectedImage(null)
  }

  // 이미지 다운로드
  const handleDownload = (imageUrl: string, fileName: string) => {
    const link = document.createElement("a")
    link.href = imageUrl
    link.download = fileName
    link.target = "_blank"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // 이미지 공유
  const handleShare = async (imageUrl: string, title: string) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: title,
          text: "멋진 이미지를 확인해보세요!",
          url: imageUrl,
        })
      } catch (error) {
        console.error("공유 중 오류:", error)
      }
    } else {
      // 공유 API가 지원되지 않으면 클립보드에 복사
      try {
        await navigator.clipboard.writeText(imageUrl)
        alert("링크가 클립보드에 복사되었습니다.")
      } catch (error) {
        console.error("클립보드 복사 실패:", error)
      }
    }
  }

  // 라벨 변환 함수들
  const getAgeLabel = (age: string) => {
    switch (age) {
      case "5years": return "5살"
      case "teen": return "10대"
      case "20s": return "20대"
      case "30s": return "30대"
      case "40s": return "40대"
      case "50s": return "50대"
      case "60s": return "60대"
      default: return age
    }
  }

  const getJobLabel = (job: string) => {
    switch (job) {
      case "doctor": return "의사"
      case "teacher": return "선생님"
      case "engineer": return "엔지니어"
      case "artist": return "예술가"
      case "chef": return "요리사"
      case "police": return "경찰관"
      case "firefighter": return "소방관"
      case "pilot": return "조종사"
      case "scientist": return "과학자"
      case "musician": return "음악가"
      default: return job
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-4 md:p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-purple-600 mb-2">내 프로필</h1>
          <p className="text-lg text-purple-500">프로필 정보와 생성한 이미지를 관리하세요</p>
        </div>
        
        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid grid-cols-2 mb-8">
            <TabsTrigger value="profile" className="data-[state=active]:bg-purple-500 data-[state=active]:text-white">
              <User className="mr-2 h-4 w-4" />
              프로필
            </TabsTrigger>
            <TabsTrigger value="images" className="data-[state=active]:bg-purple-500 data-[state=active]:text-white">
              <ImageIcon className="mr-2 h-4 w-4" />내 이미지
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <Card className="border-3 border-purple-200 rounded-xl animate-pulse">
              <CardHeader>
                <div className="h-6 bg-gray-200 rounded w-1/3 mb-2" />
                <div className="h-4 bg-gray-200 rounded w-2/3" />
              </CardHeader>
              <CardContent>
                <div className="flex flex-col md:flex-row gap-8 items-center">
                  <div className="flex flex-col items-center">
                    <div className="h-24 w-24 bg-gray-200 rounded-full mb-2" />
                    <div className="h-4 bg-gray-200 rounded w-24" />
                  </div>
                  <div className="flex-1 space-y-4">
                    <div className="space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-20" />
                      <div className="h-10 bg-gray-200 rounded" />
                    </div>
                    <div className="space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-16" />
                      <div className="h-10 bg-gray-200 rounded" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="images">
            <div className="space-y-6">
              <div className="h-6 bg-gray-200 rounded w-1/3" />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="border-3 border-gray-200 rounded-xl overflow-hidden animate-pulse">
                    <div className="aspect-square bg-gray-200" />
                    <div className="p-3">
                      <div className="h-4 bg-gray-200 rounded mb-2" />
                      <div className="h-3 bg-gray-200 rounded w-2/3 mb-2" />
                      <div className="flex justify-between items-center">
                        <div className="h-3 bg-gray-200 rounded w-1/3" />
                        <div className="h-4 bg-gray-200 rounded w-16" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-purple-600 mb-2">내 프로필</h1>
        <p className="text-lg text-purple-500">프로필 정보와 생성한 이미지를 관리하세요</p>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid grid-cols-2 mb-8">
          <TabsTrigger value="profile" className="data-[state=active]:bg-purple-500 data-[state=active]:text-white">
            <User className="mr-2 h-4 w-4" />
            프로필
          </TabsTrigger>
          <TabsTrigger value="images" className="data-[state=active]:bg-purple-500 data-[state=active]:text-white">
            <ImageIcon className="mr-2 h-4 w-4" />내 이미지
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card className="border-3 border-purple-200 rounded-xl">
            <CardHeader>
              <CardTitle>프로필 정보</CardTitle>
              <CardDescription>프로필 정보를 수정하고 관리하세요</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdateProfile} className="space-y-6">
                {error && (
                  <div className="bg-red-100 border-l-4 border-red-500 p-4 mb-4">
                    <p className="text-red-700">{error}</p>
                  </div>
                )}

                <div className="flex flex-col md:flex-row gap-8 items-center">
                  <div className="flex flex-col items-center">
                    <Avatar className="h-24 w-24 mb-2">
                      <AvatarImage src={profile?.avatar_url || ""} />
                      <AvatarFallback className="bg-purple-200 text-purple-700 text-2xl">
                        {user?.email?.charAt(0).toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <p className="text-sm text-gray-500">{user?.email}</p>
                  </div>

                  <div className="flex-1 space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="username">사용자 이름</Label>
                      <Input
                        id="username"
                        value={profile?.username || ""}
                        onChange={(e) => setProfile({ ...profile!, username: e.target.value })}
                        className="border-2 border-purple-200"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="fullName">실명</Label>
                      <Input
                        id="fullName"
                        value={profile?.full_name || ""}
                        onChange={(e) => setProfile({ ...profile!, full_name: e.target.value })}
                        className="border-2 border-purple-200"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button
                    type="submit"
                    disabled={updating}
                    className="rounded-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
                  >
                    {updating ? "업데이트 중..." : "프로필 업데이트"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="images">
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-purple-600">내가 생성한 이미지</h2>
            </div>

            {images.length === 0 ? (
              <div className="text-center py-12 bg-purple-50 rounded-xl border-2 border-purple-200">
                <ImageIcon className="h-12 w-12 text-purple-300 mx-auto mb-4" />
                <p className="text-purple-600 font-medium">아직 생성한 이미지가 없습니다</p>
                <p className="text-purple-400 text-sm mt-1">미래의 나를 만들어보세요!</p>
                <Button
                  onClick={() => router.push("/")}
                  className="mt-4 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
                >
                  이미지 만들기
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {images.map((image) => (
                  <div 
                    key={image.id} 
                    className="border-3 border-purple-200 rounded-xl overflow-hidden hover:border-purple-400 hover:shadow-lg transition-all duration-300 opacity-0 cursor-pointer"
                    id={`profile-card-${image.id}`}
                    onClick={() => handleImageClick(image)}
                  >
                    <div className="aspect-square overflow-hidden bg-gray-100 relative">
                      {/* 이미지 로딩 인디케이터 */}
                      <div 
                        className="absolute inset-0 bg-gray-50 flex items-center justify-center"
                        id={`loader-${image.id}`}
                      >
                        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
                      </div>
                      
                      <img
                        src={image.type === 'future' ? image.image_url : image.result_image_url || "/placeholder.svg"}
                        alt={image.type === 'future' ? `${image.job} 이미지` : "낙서 현실화 이미지"}
                        className="w-full h-full object-cover transition-transform duration-300 hover:scale-105 relative z-10"
                        loading="lazy"
                        onLoad={(e) => {
                          // 이미지 로드 완료 후 로딩 인디케이터 숨기고 카드 표시
                          const loaderElement = document.getElementById(`loader-${image.id}`);
                          const cardElement = document.getElementById(`profile-card-${image.id}`);
                          if (loaderElement) {
                            loaderElement.style.display = 'none';
                          }
                          if (cardElement) {
                            cardElement.style.opacity = '1';
                          }
                        }}
                        onError={(e) => {
                          // 이미지 로드 실패 시 기본 이미지 표시하고 로딩 인디케이터 숨김
                          e.currentTarget.src = "/placeholder.svg";
                          const loaderElement = document.getElementById(`loader-${image.id}`);
                          const cardElement = document.getElementById(`profile-card-${image.id}`);
                          if (loaderElement) {
                            loaderElement.style.display = 'none';
                          }
                          if (cardElement) {
                            cardElement.style.opacity = '1';
                          }
                        }}
                      />
                    </div>
                    <div className="p-3 bg-white">
                      <p className="font-medium text-purple-700 text-sm">
                        {image.type === 'future' 
                          ? `${image.job} (${image.age})`
                          : `낙서 현실화 (${image.style})`
                        }
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {image.type === 'future' 
                          ? `스타일: ${image.style}, 레이아웃: ${image.layout}`
                          : `스타일: ${image.style}`
                        }
                      </p>
                      <div className="flex justify-between items-center mt-3">
                        <p className="text-xs text-gray-400">{new Date(image.created_at).toLocaleDateString()}</p>
                        <div 
                          className="flex items-center gap-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {updatingImageId === image.id ? (
                            <Loader2 className="h-4 w-4 animate-spin text-purple-500" />
                          ) : image.is_public ? (
                            <Eye className="h-4 w-4 text-green-500" />
                          ) : (
                            <EyeOff className="h-4 w-4 text-gray-400" />
                          )}
                          <Switch
                            checked={image.is_public}
                            onCheckedChange={() => toggleImagePublic(image.id, image.is_public, image.type)}
                            disabled={updatingImageId === image.id}
                            className="scale-75"
                          />
                          <span className="text-xs text-gray-600">{image.is_public ? "공개" : "비공개"}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* 이미지 모달 */}
      {modalOpen && selectedImage && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={closeModal}
        >
          <div 
            className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 모달 헤더 */}
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-2">
                <Badge 
                  className={`${
                    selectedImage.type === 'doodle' 
                      ? 'bg-teal-500 hover:bg-teal-600' 
                      : 'bg-purple-500 hover:bg-purple-600'
                  } text-white border-0`}
                >
                  {selectedImage.type === 'doodle' ? (
                    <>
                      <Pencil className="h-3 w-3 mr-1" />
                      낙서현실화
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3 w-3 mr-1" />
                      시간버스
                    </>
                  )}
                </Badge>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={closeModal}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </Button>
            </div>

            {/* 이미지 */}
            <div className="p-6">
              {selectedImage.type === 'doodle' ? (
                /* 낙서현실화: 원본과 결과 이미지 비교 */
                <div className="grid md:grid-cols-2 gap-4 mb-6">
                  <div>
                    <h4 className="text-sm font-medium text-gray-600 mb-2">원본 낙서</h4>
                    <img
                      src={selectedImage.original_image_url}
                      alt="원본 낙서"
                      className="w-full h-auto object-contain rounded-lg border bg-white"
                      style={{ maxHeight: '50vh' }}
                    />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-600 mb-2">현실화된 이미지</h4>
                    <img
                      src={selectedImage.result_image_url}
                      alt="현실화된 이미지"
                      className="w-full h-auto object-contain rounded-lg"
                      style={{ maxHeight: '50vh' }}
                    />
                  </div>
                </div>
              ) : (
                /* 시간버스: 단일 이미지 */
                <div className="mb-6">
                  <img
                    src={selectedImage.image_url}
                    alt="시간버스"
                    className="w-full h-auto object-contain rounded-lg max-h-[60vh] mx-auto"
                  />
                </div>
              )}

              {/* 스타일 정보 */}
              <div className="space-y-4">
                <div className="border-t pt-4">
                  <h3 className="font-bold text-lg text-gray-800 mb-3">
                    {selectedImage.type === 'doodle' ? '스타일 정보' : '생성 정보'}
                  </h3>
                  
                  {selectedImage.type === 'doodle' ? (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-gray-700">
                        <span className="font-medium">스타일:</span> {selectedImage.style}
                      </p>
                    </div>
                  ) : (
                    <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                      <p className="text-gray-700">
                        <span className="font-medium">나이:</span> {getAgeLabel(selectedImage.age || '')}
                      </p>
                      <p className="text-gray-700">
                        <span className="font-medium">직업:</span> {getJobLabel(selectedImage.job || '')}
                      </p>
                      <p className="text-gray-700">
                        <span className="font-medium">스타일:</span> {selectedImage.style}
                      </p>
                      {'layout' in selectedImage && (
                        <p className="text-gray-700">
                          <span className="font-medium">레이아웃:</span> {selectedImage.layout}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* QR코드 섹션 */}
                <div className="border-t pt-4">
                  <div className="flex justify-center">
                    <div className="bg-white p-4 rounded-xl border-2 border-purple-200 shadow-sm">
                      <div className="text-center mb-3">
                        <QrCode className="h-5 w-5 text-purple-600 mx-auto mb-1" />
                        <p className="text-sm font-medium text-purple-700">QR코드로 이미지 저장</p>
                        <p className="text-xs text-purple-500">스캔하면 바로 저장할 수 있어요!</p>
                      </div>
                      <div className="flex justify-center">
                        <QRCodeSVG
                          value={selectedImage.type === 'doodle' ? selectedImage.result_image_url : selectedImage.image_url}
                          size={120}
                          bgColor="#ffffff"
                          fgColor="#000000"
                          level="M"
                          includeMargin={true}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* 액션 버튼 */}
                <div className="border-t pt-4">
                  <div className="flex justify-center space-x-4">
                    <Button
                      onClick={() => handleDownload(
                        selectedImage.type === 'doodle' ? selectedImage.result_image_url : selectedImage.image_url,
                        selectedImage.type === 'doodle' ? '낙서현실화.png' : '시간버스.png'
                      )}
                      className="rounded-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
                    >
                      <Download className="mr-2 h-4 w-4" /> 저장하기
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleShare(
                        selectedImage.type === 'doodle' ? selectedImage.result_image_url : selectedImage.image_url,
                        selectedImage.type === 'doodle' ? '낙서현실화' : '시간버스'
                      )}
                      className="rounded-full border-2 border-purple-300 hover:bg-purple-100"
                    >
                      <Share2 className="mr-2 h-4 w-4" /> 공유하기
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
