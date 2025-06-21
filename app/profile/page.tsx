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
import { User, ImageIcon, Eye, EyeOff, Loader2 } from "lucide-react"
import { Switch } from "@/components/ui/switch"
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
        
        // 미래의 나 이미지 조회
        const { data: futureImages, error: futureError } = await supabase
          .from("generated_images")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })

        if (futureError) {
          console.error("미래의 나 이미지 조회 오류:", futureError)
        }

        // 낙서 현실화 이미지 조회
        const { data: doodleImages, error: doodleError } = await supabase
          .from("doodle_images")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })

        if (doodleError) {
          console.error("낙서 현실화 이미지 조회 오류:", doodleError)
        }

        // 두 이미지 배열을 합치고 타입 정보 추가
        const futureImagesWithType = (futureImages || []).map(img => ({
          ...img,
          type: 'future' as const
        }))

        const doodleImagesWithType = (doodleImages || []).map(img => ({
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

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-purple-600">로딩 중...</p>
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
              <Link href="/gallery">
                <Button variant="outline" className="rounded-full border-2 border-purple-300 hover:bg-purple-100">
                  갤러리 보기
                </Button>
              </Link>
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
                  <div key={image.id} className="border-3 border-purple-200 rounded-xl overflow-hidden">
                    <div className="aspect-square overflow-hidden">
                      <img
                        src={image.type === 'future' ? image.image_url : image.result_image_url || "/placeholder.svg"}
                        alt={image.type === 'future' ? `${image.job} 이미지` : "낙서 현실화 이미지"}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="p-3">
                      <p className="font-medium text-purple-700">
                        {image.type === 'future' 
                          ? `${image.job} (${image.age})`
                          : `낙서 현실화 (${image.style})`
                        }
                      </p>
                      <p className="text-xs text-gray-500">
                        {image.type === 'future' 
                          ? `스타일: ${image.style}, 레이아웃: ${image.layout}`
                          : `스타일: ${image.style}`
                        }
                      </p>
                      <div className="flex justify-between items-center mt-2">
                        <p className="text-xs text-gray-400">{new Date(image.created_at).toLocaleDateString()}</p>
                        <div className="flex items-center">
                          {updatingImageId === image.id ? (
                            <Loader2 className="h-4 w-4 animate-spin text-purple-500 mr-2" />
                          ) : image.is_public ? (
                            <Eye className="h-4 w-4 text-green-500 mr-2" />
                          ) : (
                            <EyeOff className="h-4 w-4 text-gray-400 mr-2" />
                          )}
                          <Switch
                            checked={image.is_public}
                            onCheckedChange={() => toggleImagePublic(image.id, image.is_public, image.type)}
                            disabled={updatingImageId === image.id}
                          />
                          <span className="text-xs ml-2">{image.is_public ? "공개" : "비공개"}</span>
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
    </div>
  )
}
