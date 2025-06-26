"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Heart, MessageSquare, Eye, Filter } from "lucide-react"
import Link from "next/link"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"

type GalleryImage = {
  id: string
  image_url: string
  job: string
  age: string
  style: string
  created_at: string
  user_id: string
  profiles: {
    username: string
  }
  likes_count: number
  comments_count: number
  views_count: number
}

export default function GalleryPage() {
  const [images, setImages] = useState<GalleryImage[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>("latest")
  const [jobFilter, setJobFilter] = useState<string | null>(null)
  const [styleFilter, setStyleFilter] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)

  // 나이 값을 한국어로 변환하는 함수
  const getAgeLabel = (age: string) => {
    switch (age) {
      case "2years": return "2살"
      case "5years": return "5살"
      case "teen": return "10대"
      case "20s": return "20대"
      case "30s": return "30대"
      case "40s": return "40대"
      case "50s": return "50대" // 기존 값 호환성
      case "60s": return "60대"
      case "adult": return "성인" // 기존 값 호환성
      default: return age
    }
  }

  // 직업 값을 한국어로 변환하는 함수
  const getJobLabel = (job: string) => {
    switch (job) {
      case "none": return "일반인"
      case "doctor": return "의사"
      case "teacher": return "선생님"
      case "astronaut": return "우주비행사"
      case "chef": return "요리사"
      case "firefighter": return "소방관"
      case "scientist": return "과학자"
      case "artist": return "예술가"
      case "athlete": return "운동선수"
      case "announcer": return "아나운서"
      default: return job
    }
  }
  const itemsPerPage = 12

  const fetchImages = async (reset = false) => {
    const currentPage = reset ? 1 : page
    if (reset) {
      setPage(1)
    }

    try {
      setLoading(true)
      let query = supabase
        .from("generated_images")
        .select(
          `
          id, 
          image_url, 
          job, 
          age, 
          style, 
          created_at,
          user_id,
          likes_count: image_likes (count),
          comments_count: image_comments (count),
          views_count: image_views (view_count)
        `,
          { count: "exact" },
        )
        .eq("is_public", true)
        .range((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage - 1)

      // 직업 필터 적용
      if (jobFilter) {
        query = query.eq("job", jobFilter)
      }

      // 스타일 필터 적용
      if (styleFilter) {
        query = query.eq("style", styleFilter)
      }

      // 정렬 적용
      switch (filter) {
        case "latest":
          query = query.order("created_at", { ascending: false })
          break
        case "popular":
          query = query.order("likes_count", { ascending: false }).order("created_at", { ascending: false })
          break
        case "views":
          query = query.order("views_count", { ascending: false }).order("created_at", { ascending: false })
          break
      }

      const { data, error, count } = await query

      if (error) throw error

      // 데이터 가공
      const processedData = data?.map((item) => ({
        ...item,
        profiles: { username: "사용자" }, // 기본 사용자 이름 설정
        likes_count: item.likes_count?.[0]?.count || 0,
        comments_count: item.comments_count?.[0]?.count || 0,
        views_count: item.views_count?.[0]?.view_count || 0,
      }))

      // 사용자 ID가 있는 이미지에 대해 프로필 정보 가져오기
      if (processedData && processedData.length > 0) {
        const userIds = processedData.map((item) => item.user_id).filter(Boolean)
        if (userIds.length > 0) {
          const { data: profilesData } = await supabase.from("profiles").select("id, username").in("id", userIds)

          if (profilesData) {
            // 프로필 정보를 이미지 데이터에 매핑
            processedData.forEach((item) => {
              const profile = profilesData.find((p) => p.id === item.user_id)
              if (profile) {
                item.profiles = { username: profile.username }
              }
            })
          }
        }
      }

      if (reset) {
        setImages(processedData || [])
      } else {
        setImages((prev) => [...prev, ...(processedData || [])])
      }

      // 더 불러올 데이터가 있는지 확인
      if (count) {
        setHasMore(currentPage * itemsPerPage < count)
      } else {
        setHasMore(false)
      }
    } catch (error) {
      console.error("갤러리 이미지를 가져오는 중 오류가 발생했습니다:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchImages(true)
  }, [filter, jobFilter, styleFilter])

  const loadMore = () => {
    if (!loading && hasMore) {
      setPage((prev) => prev + 1)
      fetchImages()
    }
  }

  const jobs = [
    { value: "none", label: "직업 없음" },
    { value: "doctor", label: "의사" },
    { value: "teacher", label: "선생님" },
    { value: "astronaut", label: "우주비행사" },
    { value: "chef", label: "요리사" },
    { value: "firefighter", label: "소방관" },
    { value: "scientist", label: "과학자" },
    { value: "artist", label: "예술가" },
    { value: "athlete", label: "운동선수" },
  ]

  const styles = [
    { value: "cartoon", label: "만화 카툰 스타일" },
    { value: "anime", label: "애니메이션 스타일" },
    { value: "pixar", label: "픽사 3D 스타일" },
    { value: "comic", label: "만화책 스타일" },
    { value: "poster", label: "영화 포스터 스타일" },
    { value: "caricature", label: "캐리커쳐 스타일" },
  ]

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-purple-600 mb-2">시간버스 갤러리</h1>
        <p className="text-lg text-purple-500">다른 사용자들이 시간버스를 타고 변신한 모습을 구경해보세요!</p>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <Tabs defaultValue="latest" value={filter} onValueChange={setFilter} className="w-full md:w-auto">
          <TabsList className="grid grid-cols-3 w-full md:w-auto">
            <TabsTrigger value="latest">최신순</TabsTrigger>
            <TabsTrigger value="popular">인기순</TabsTrigger>
            <TabsTrigger value="views">조회순</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="flex items-center gap-1">
                <Filter className="h-4 w-4" />
                직업
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setJobFilter(null)}>전체</DropdownMenuItem>
              {jobs.map((job) => (
                <DropdownMenuItem key={job.value} onClick={() => setJobFilter(job.value)}>
                  {job.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="flex items-center gap-1">
                <Filter className="h-4 w-4" />
                스타일
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setStyleFilter(null)}>전체</DropdownMenuItem>
              {styles.map((style) => (
                <DropdownMenuItem key={style.value} onClick={() => setStyleFilter(style.value)}>
                  {style.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* 필터 표시 */}
      {(jobFilter || styleFilter) && (
        <div className="flex gap-2 mb-4 flex-wrap">
          {jobFilter && (
            <div className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm flex items-center">
              직업: {jobs.find((j) => j.value === jobFilter)?.label}
              <button onClick={() => setJobFilter(null)} className="ml-2 text-purple-500 hover:text-purple-700">
                ✕
              </button>
            </div>
          )}
          {styleFilter && (
            <div className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm flex items-center">
              스타일: {styles.find((s) => s.value === styleFilter)?.label}
              <button onClick={() => setStyleFilter(null)} className="ml-2 text-purple-500 hover:text-purple-700">
                ✕
              </button>
            </div>
          )}
          {(jobFilter || styleFilter) && (
            <button
              onClick={() => {
                setJobFilter(null)
                setStyleFilter(null)
              }}
              className="text-purple-500 hover:text-purple-700 text-sm underline"
            >
              필터 초기화
            </button>
          )}
        </div>
      )}

      {loading && images.length === 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} className="overflow-hidden border-3 border-purple-200 rounded-xl">
              <div className="aspect-square">
                <Skeleton className="h-full w-full" />
              </div>
              <CardContent className="p-4">
                <Skeleton className="h-4 w-3/4 mb-2" />
                <Skeleton className="h-3 w-1/2" />
                <div className="flex justify-between mt-3">
                  <Skeleton className="h-3 w-1/4" />
                  <Skeleton className="h-3 w-1/4" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : images.length > 0 ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {images.map((image) => (
              <Link href={`/gallery/${image.id}`} key={image.id}>
                <Card className="overflow-hidden border-3 border-purple-200 rounded-xl hover:border-purple-400 hover:shadow-md transition-all cursor-pointer">
                  <div className="aspect-square overflow-hidden">
                    <img
                      src={image.image_url || "/placeholder.svg"}
                      alt={`${image.job} 이미지`}
                      className="w-full h-full object-cover transition-transform hover:scale-105"
                    />
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-medium text-purple-700 truncate">
                      {getAgeLabel(image.age)} {getJobLabel(image.job)}
                    </h3>
                    <p className="text-xs text-gray-500 truncate">
                      스타일: {image.style} | 작성자: {image.profiles?.username || "사용자"}
                    </p>
                    <div className="flex justify-between mt-2 text-xs text-gray-500">
                      <div className="flex items-center">
                        <Heart className="h-3 w-3 mr-1" />
                        {image.likes_count}
                      </div>
                      <div className="flex items-center">
                        <MessageSquare className="h-3 w-3 mr-1" />
                        {image.comments_count}
                      </div>
                      <div className="flex items-center">
                        <Eye className="h-3 w-3 mr-1" />
                        {image.views_count}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          {hasMore && (
            <div className="flex justify-center mt-8">
              <Button
                onClick={loadMore}
                disabled={loading}
                className="rounded-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
              >
                {loading ? "로딩 중..." : "더 보기"}
              </Button>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-16 bg-purple-50 rounded-xl border-2 border-purple-200">
          <p className="text-purple-600 font-medium">표시할 이미지가 없습니다</p>
          <p className="text-purple-400 text-sm mt-1">필터를 변경하거나 나중에 다시 확인해주세요</p>
        </div>
      )}
    </div>
  )
}
