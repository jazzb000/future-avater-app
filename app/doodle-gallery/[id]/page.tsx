"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Pencil, Eye, User, Clock, ExternalLink, Maximize2, Sparkles } from 'lucide-react'
import Link from "next/link"
import { formatDistanceToNow } from "date-fns"
import { ko } from "date-fns/locale"

type DoodleDetail = {
  id: string
  original_image_url: string
  result_image_url: string
  style: string
  created_at: string
  user_id: string
  profiles: {
    username: string
    avatar_url?: string
  }
}

export default function DoodleDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [doodle, setDoodle] = useState<DoodleDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [viewCount, setViewCount] = useState(0)
  const [imageModalOpen, setImageModalOpen] = useState(false)
  const [modalImage, setModalImage] = useState("")
  const imageId = params.id as string

  // 낙서 상세 정보 가져오기
  useEffect(() => {
    const fetchDoodleDetails = async () => {
      try {
        setLoading(true)
        
        // 조회수 증가
  
        
        // 낙서 상세 정보 가져오기
        const { data: doodleData, error: doodleError } = await supabase
          .from("doodle_images")
          .select(`*, profiles (username, avatar_url)`)
          .eq("id", imageId)
          .single()

        if (doodleError) throw doodleError
        setDoodle(doodleData)

        // 조회수 가져오기
        const { data: viewData } = await supabase
          .from("doodle_views")
          .select("view_count")
          .eq("doodle_id", imageId)
          .single()

        setViewCount(viewData?.view_count || 0)
      } catch (error) {
        console.error("낙서 상세 정보를 가져오는 중 오류가 발생했습니다:", error)
        router.push("/")
      } finally {
        setLoading(false)
      }
    }

    if (imageId) {
      fetchDoodleDetails()
    }
  }, [imageId, router])

  const handleImageClick = (imageUrl: string) => {
    setModalImage(imageUrl)
    setImageModalOpen(true)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-teal-50 to-green-50 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded mb-4 w-32" />
            <div className="grid md:grid-cols-2 gap-6">
              <div className="aspect-square bg-gray-200 rounded-2xl" />
              <div className="aspect-square bg-gray-200 rounded-2xl" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!doodle) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-teal-50 to-green-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">낙서를 찾을 수 없습니다.</p>
          <Link href="/">
            <Button className="bg-teal-500 hover:bg-teal-600 text-white">
              홈으로 돌아가기
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50 to-green-50">
      {/* 헤더 */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-teal-200 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button
              onClick={() => router.back()}
              variant="ghost"
              className="text-teal-600 hover:bg-teal-100"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              뒤로가기
            </Button>
            
            <div className="flex items-center gap-2">
              <Badge className="bg-teal-500 text-white">
                <Pencil className="h-3 w-3 mr-1" />
                낙서현실화
              </Badge>
              <div className="flex items-center text-sm text-gray-600">
                <Eye className="h-4 w-4 mr-1" />
                {viewCount}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4 pb-24">
        {/* 사용자 정보 */}
        <div className="flex items-center gap-3 mb-6 bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-teal-200">
          <div className="w-10 h-10 bg-teal-500 rounded-full flex items-center justify-center text-white font-bold">
            {doodle.profiles?.username?.[0]?.toUpperCase() || 'U'}
          </div>
          <div>
            <p className="font-medium text-gray-800">{doodle.profiles?.username || "사용자"}</p>
            <p className="text-sm text-gray-600 flex items-center">
              <Clock className="h-3 w-3 mr-1" />
              {formatDistanceToNow(new Date(doodle.created_at), { addSuffix: true, locale: ko })}
            </p>
          </div>
        </div>

        {/* 이미지 비교 섹션 */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* 원본 낙서 */}
          <Card className="overflow-hidden border-2 border-teal-300 bg-white/80 backdrop-blur-sm">
            <CardContent className="p-0">
              <div className="relative">
                <div 
                  className="aspect-square overflow-hidden cursor-pointer group bg-white"
                  onClick={() => handleImageClick(doodle.original_image_url)}
                >
                  <img
                    src={doodle.original_image_url}
                    alt="원본 낙서"
                    className="w-full h-full object-contain transition-transform group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center">
                    <Maximize2 className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                  </div>
                </div>
                <div className="absolute top-3 left-3">
                  <Badge className="bg-gray-700 text-white">
                    원본 낙서
                  </Badge>
                </div>
              </div>
              <div className="p-4">
                <h3 className="font-bold text-lg text-gray-800 mb-2">원본 낙서</h3>
                <p className="text-sm text-gray-600">사용자가 그린 원본 낙서입니다</p>
              </div>
            </CardContent>
          </Card>

          {/* 현실화된 이미지 */}
          <Card className="overflow-hidden border-2 border-green-300 bg-white/80 backdrop-blur-sm">
            <CardContent className="p-0">
              <div className="relative">
                <div 
                  className="aspect-square overflow-hidden cursor-pointer group"
                  onClick={() => handleImageClick(doodle.result_image_url)}
                >
                  <img
                    src={doodle.result_image_url}
                    alt="현실화된 이미지"
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center">
                    <Maximize2 className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                  </div>
                </div>
                <div className="absolute top-3 left-3">
                  <Badge className="bg-green-600 text-white">
                    AI 현실화
                  </Badge>
                </div>
              </div>
              <div className="p-4">
                <h3 className="font-bold text-lg text-gray-800 mb-2">현실화된 이미지</h3>
                <p className="text-sm text-gray-600">
                  <span className="font-medium text-green-600">{doodle.style} 스타일</span>로 현실화된 결과입니다
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 액션 버튼들 */}
        <div className="text-center space-y-4">
          <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-teal-200">
            <h3 className="text-xl font-bold text-gray-800 mb-3">
              나만의 낙서도 현실화해보세요! 🎨
            </h3>
            <p className="text-gray-600 mb-4">
              간단한 낙서나 그림을 AI가 놀라운 작품으로 변환해드립니다
            </p>
            <Link href="/doodle-to-reality">
              <Button 
                size="lg"
                className="bg-gradient-to-r from-teal-500 to-green-500 hover:from-teal-600 hover:to-green-600 text-white rounded-full px-8"
              >
                <Pencil className="h-5 w-5 mr-2" />
                낙서 현실화 해보기
              </Button>
            </Link>
          </div>
        </div>
      </div>

       {/* 플로팅 액션 버튼 - 하단 중앙 배치 */}
       <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 flex gap-4 z-50">
         {/* 시간버스 버튼 */}
         <div className="relative group">
           <Link href="/future-me">
             <Button
               size="lg"
               className="w-16 h-16 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110"
             >
               <Sparkles className="h-7 w-7" />
             </Button>
           </Link>
           
           {/* 설명 팝업 */}
           <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none">
             <div className="bg-purple-600 text-white text-sm px-3 py-2 rounded-lg shadow-lg whitespace-nowrap">
               <div className="font-medium">시간버스 🚌</div>
               <div className="text-xs text-purple-200">다양한 나이의 내 모습 생성</div>
               {/* 화살표 */}
               <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-purple-600"></div>
             </div>
           </div>
         </div>

         {/* 낙서 현실화 버튼 */}
         <div className="relative group">
           <Link href="/doodle-to-reality">
             <Button
               size="lg"
               className="w-16 h-16 rounded-full bg-gradient-to-r from-teal-500 to-green-500 hover:from-teal-600 hover:to-green-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110"
             >
               <Pencil className="h-7 w-7" />
             </Button>
           </Link>
           
           {/* 설명 팝업 */}
           <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none">
             <div className="bg-teal-600 text-white text-sm px-3 py-2 rounded-lg shadow-lg whitespace-nowrap">
               <div className="font-medium">낙서현실화 🎨</div>
               <div className="text-xs text-teal-200">낙서를 현실적인 이미지로</div>
               {/* 화살표 */}
               <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-teal-600"></div>
             </div>
           </div>
         </div>
       </div>

      {/* 이미지 모달 */}
      {imageModalOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4"
          onClick={() => setImageModalOpen(false)}
        >
          <div className="relative max-w-4xl max-h-full">
            <img
              src={modalImage}
              alt="확대된 이미지"
              className="max-w-full max-h-full object-contain rounded-xl"
            />
            <Button
              onClick={() => setImageModalOpen(false)}
              className="absolute top-4 right-4 bg-black/50 hover:bg-black/70 text-white rounded-full w-10 h-10 p-0"
            >
              ✕
            </Button>
          </div>
        </div>
      )}
    </div>
  )
} 