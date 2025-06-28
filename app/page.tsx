"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Sparkles, Pencil, Plus, ArrowRight, Clock, Palette, User } from "lucide-react"

type GalleryImage = {
  id: string
  image_url?: string
  result_image_url?: string
  original_image_url?: string
  job?: string
  age?: string
  style: string
  created_at: string
  user_id: string
  profiles?: {
    username: string
  }
  type: 'avatar' | 'doodle'
}

export default function Home() {
  const [images, setImages] = useState<GalleryImage[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)

  // 두 가지 타입의 이미지를 모두 가져오기
  const fetchImages = async (pageNum: number = 1, reset: boolean = false) => {
    try {
      if (reset) {
        setLoading(true)
        setPage(1)
      } else {
        setLoadingMore(true)
      }
      
      // 각 타입별로 페이지당 6개씩 가져오기 (총 12개)
      const limit = 6
      const avatarPage = Math.ceil(pageNum / 2)
      const doodlePage = Math.ceil(pageNum / 2)
      
      // 시간버스 이미지 가져오기
      const avatarResponse = await fetch(`/api/gallery?type=avatar&limit=${limit}&page=${avatarPage}&filter=latest`)
      const avatarData = await avatarResponse.json()
      
      // 낙서현실화 이미지 가져오기  
      const doodleResponse = await fetch(`/api/gallery?type=doodle&limit=${limit}&page=${doodlePage}&filter=latest`)
      const doodleData = await doodleResponse.json()

      // 두 데이터를 합치고 타입 구분하여 섞기
      const avatarImages = avatarData.success ? avatarData.images.map((img: any) => ({ ...img, type: 'avatar' })) : []
      const doodleImages = doodleData.success ? doodleData.images.map((img: any) => ({ ...img, type: 'doodle' })) : []
      
      // 두 배열을 합치고 날짜순으로 정렬
      const newImages = [...avatarImages, ...doodleImages]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

      if (reset) {
        setImages(newImages)
      } else {
        setImages(prev => [...prev, ...newImages])
      }

      // 더 불러올 데이터가 있는지 확인
      const avatarHasMore = avatarData.success && avatarData.images.length === limit
      const doodleHasMore = doodleData.success && doodleData.images.length === limit
      setHasMore(avatarHasMore || doodleHasMore)
      
    } catch (error) {
      console.error('이미지를 가져오는 중 오류가 발생했습니다:', error)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  useEffect(() => {
    fetchImages()
  }, [])

  // 이미지 클릭 핸들러
  const handleImageClick = (image: GalleryImage) => {
    setSelectedImage(image)
    setModalOpen(true)
  }

  // 모달 닫기
  const closeModal = () => {
    setModalOpen(false)
    setSelectedImage(null)
  }

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

  // 라벨 변환 함수들
  const getAgeLabel = (age: string) => {
    switch (age) {
      case "2years": return "2살"
      case "5years": return "5살"
      case "teen": return "10대"
      case "20s": return "20대"
      case "30s": return "30대"
      case "40s": return "40대"
      case "60s": return "60대"
      default: return age
    }
  }

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

  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 via-purple-50 to-pink-50 relative">
        {/* 헤더 */}
      <div className="text-center pt-8 pb-6 px-4">
        <h1 className="text-3xl md:text-5xl font-bold text-gray-800 mb-3 font-display">
            돌핀인캘리 AI
          </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-2">
            AI로 상상하는 미래와 창작하는 현실을 경험해보세요
          </p>
        <p className="text-sm text-gray-500">
          다른 사용자들이 만든 놀라운 작품들을 구경해보세요 ✨
        </p>
        </div>

      {/* 사용자 갤러리 */}
      <div className="max-w-7xl mx-auto px-4 pb-24">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <Card key={i} className="overflow-hidden border-2 border-gray-200 rounded-2xl animate-pulse">
                <div className="aspect-square bg-gray-200" />
                <CardContent className="p-3">
                  <div className="h-4 bg-gray-200 rounded mb-2" />
                  <div className="h-3 bg-gray-200 rounded w-2/3" />
                </CardContent>
              </Card>
            ))}
              </div>
                 ) : images.length > 0 ? (
           <>
             {/* Masonry-style Layout */}
             <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
               {images.map((image) => {
                 const displayImage = image.type === 'doodle' ? image.result_image_url : image.image_url
                 const detailPath = image.type === 'doodle' 
                   ? `/doodle-gallery/${image.id}` 
                   : `/gallery/${image.id}`
                 
                 return (
                   <div key={`${image.type}-${image.id}`} className="break-inside-avoid mb-4">
                     <Card 
                       className="group overflow-hidden border-2 border-gray-200 rounded-2xl hover:border-purple-300 hover:shadow-lg transition-all duration-300 cursor-pointer bg-white/80 backdrop-blur-sm"
                       onClick={() => handleImageClick(image)}
                     >
                       <div className="relative overflow-hidden">
                         <img
                           src={displayImage || "/placeholder.svg"}
                           alt={image.type === 'doodle' ? "낙서현실화" : "시간버스"}
                           className="w-full h-auto object-contain transition-transform duration-300 group-hover:scale-105"
                         />
                           
                           {/* 오버레이 그라디언트 */}
                           <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                           
                           {/* 타입 배지 */}
                           <Badge 
                             className={`absolute top-3 left-3 ${
                               image.type === 'doodle' 
                                 ? 'bg-teal-500 hover:bg-teal-600' 
                                 : 'bg-purple-500 hover:bg-purple-600'
                             } text-white border-0 z-10`}
                           >
                             {image.type === 'doodle' ? (
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



                           {/* 하단 정보 */}
                           <div className="absolute bottom-0 left-0 right-0 p-4 text-white z-10 transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                             <h3 className="text-sm font-medium mb-1">
                               {image.type === 'doodle' 
                                 ? `${image.style} 스타일`
                                 : `${getAgeLabel(image.age || '')} ${getJobLabel(image.job || '')}`
                               }
                             </h3>
                             <div className="flex items-center justify-between text-xs">
                               <div className="flex items-center">
                                 <User className="h-3 w-3 mr-1" />
                                 {image.profiles?.username || "사용자"}
                               </div>
                               <div className="flex items-center">
                                 <Clock className="h-3 w-3 mr-1" />
                                 {new Date(image.created_at).toLocaleDateString()}
                               </div>
                             </div>
                           </div>
                         </div>
                       </Card>
                   </div>
                 )
               })}
             </div>

            {/* 더보기 링크 */}
            <div className="text-center mt-8">
              <Link href="/gallery">
                <Button 
                  variant="outline" 
                  className="rounded-full border-2 border-purple-300 text-purple-600 hover:bg-purple-50 px-6"
                >
                  더 많은 작품 보기
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </>
        ) : (
          <div className="text-center py-16 bg-white/60 backdrop-blur-sm rounded-2xl border-2 border-gray-200">
            <div className="text-6xl mb-4">🎨</div>
            <p className="text-gray-600 font-medium mb-2">아직 작품이 없어요</p>
            <p className="text-gray-500 text-sm">첫 번째 작품을 만들어보세요!</p>
          </div>
        )}
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

               {/* 프롬프트 정보 */}
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
                     </div>
                   )}
        </div>

                 {/* 사용자 정보 */}
                 <div className="flex items-center justify-between pt-4 border-t">
                   <div className="flex items-center gap-3">
                     <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center text-gray-600 font-bold">
                       {selectedImage.profiles?.username?.[0]?.toUpperCase() || 'U'}
                     </div>
                     <div>
                       <p className="font-medium text-gray-800">{selectedImage.profiles?.username || "사용자"}</p>
                       <p className="text-sm text-gray-600 flex items-center">
                         <Clock className="h-3 w-3 mr-1" />
                         {new Date(selectedImage.created_at).toLocaleDateString()}
          </p>
        </div>
      </div>
                 </div>
               </div>
             </div>
           </div>
         </div>
       )}
    </main>
  )
}