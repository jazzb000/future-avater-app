"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Sparkles, Pencil, Plus, Clock, Palette, User } from "lucide-react"
import Image from "next/image"
import Masonry from 'react-masonry-css'

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
  const [avatarPage, setAvatarPage] = useState(1)
  const [doodlePage, setDoodlePage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [preloadedImages, setPreloadedImages] = useState<Set<string>>(new Set())
  const [scrollPosition, setScrollPosition] = useState(0)
  
  // 백그라운드 이미지 프리로딩 (사용자가 모르게 뒷단에서 로딩)
  const preloadImageInBackground = useCallback((url: string) => {
    if (!url || preloadedImages.has(url)) return
    
    const img = document.createElement('img')
    img.onload = () => {
      setPreloadedImages(prev => new Set(prev).add(url))
    }
    img.onerror = () => {
      // 에러는 조용히 처리 (사용자에게 보이지 않음)
    }
    img.src = url
  }, [preloadedImages])

  // 중복 제거 헬퍼 함수
  const removeDuplicates = useCallback((newImages: GalleryImage[], existingImages: GalleryImage[]) => {
    const existingIds = new Set(existingImages.map(img => `${img.type}-${img.id}`))
    return newImages.filter(img => !existingIds.has(`${img.type}-${img.id}`))
  }, [])

  // 두 가지 타입의 이미지를 모두 가져오기
  const fetchImages = useCallback(async (reset: boolean = false) => {
    try {
      if (reset) {
        setLoading(true)
        setAvatarPage(1)
        setDoodlePage(1)
      } else {
        setLoadingMore(true)
      }
      
      // 각 타입별로 페이지당 8개씩 가져오기 (더 많은 콘텐츠)
      const limit = 8
      const currentAvatarPage = reset ? 1 : avatarPage
      const currentDoodlePage = reset ? 1 : doodlePage
      
      // 시간버스 이미지 가져오기
      const avatarResponse = await fetch(`/api/gallery?type=avatar&limit=${limit}&page=${currentAvatarPage}&filter=latest`)
      const avatarData = await avatarResponse.json()
      
      // 낙서현실화 이미지 가져오기  
      const doodleResponse = await fetch(`/api/gallery?type=doodle&limit=${limit}&page=${currentDoodlePage}&filter=latest`)
      const doodleData = await doodleResponse.json()

      // 두 데이터를 합치고 타입 구분하여 섞기
      const avatarImages = avatarData.success ? avatarData.images.map((img: any) => ({ ...img, type: 'avatar' })) : []
      const doodleImages = doodleData.success ? doodleData.images.map((img: any) => ({ ...img, type: 'doodle' })) : []
      
      // 두 배열을 합치고 랜덤으로 섞기
      const newImages = [...avatarImages, ...doodleImages]
        .sort(() => Math.random() - 0.5)

      if (reset) {
        setImages(newImages)
      } else {
        // 중복 제거 후 추가
        setImages(prev => {
          const uniqueNewImages = removeDuplicates(newImages, prev)
          return [...prev, ...uniqueNewImages]
        })
      }

      // 새로 로드된 낙서현실화 이미지의 원본들을 뒷단에서 미리 로딩
      setTimeout(() => {
        newImages
          .filter(img => img.type === 'doodle' && img.original_image_url)
          .forEach(img => {
            if (img.original_image_url) {
              preloadImageInBackground(img.original_image_url)
            }
          })
      }, 1500) // 메인 이미지들이 로딩된 후 1.5초 뒤 시작

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
  }, [avatarPage, doodlePage, removeDuplicates])

  // 초기 로딩
  useEffect(() => {
    fetchImages(true)
  }, [])

  // 더 많은 이미지 로드 (교대로 아바타와 낙서 페이지 증가)
  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore) {
      // 현재 스크롤 위치 저장
      const currentScrollY = window.scrollY
      const currentDocumentHeight = document.documentElement.scrollHeight
      
      // 아바타와 낙서를 교대로 로드
      if (avatarPage <= doodlePage) {
        setAvatarPage(prev => prev + 1)
      } else {
        setDoodlePage(prev => prev + 1)
      }
      
      // fetchImages 호출을 setTimeout으로 지연시켜 상태 업데이트 후 실행
      setTimeout(async () => {
        try {
          await fetchImages(false)
          // 새 이미지 로딩 완료 후 스크롤 위치 조정
          requestAnimationFrame(() => {
            // 새 컨텐츠가 추가된 만큼 스크롤 위치를 아래로 조정하지 않고 원래 위치 유지
            window.scrollTo(0, currentScrollY)
          })
        } catch (error) {
          console.error('이미지 로딩 중 오류:', error)
        }
      }, 0)
    }
  }, [loadingMore, hasMore, avatarPage, doodlePage, fetchImages])

  // 초기 스크롤 위치 복원
  useEffect(() => {
    const savedScrollPosition = localStorage.getItem('home-scroll-position')
    if (savedScrollPosition && !loading) {
      const position = parseInt(savedScrollPosition, 10)
      setTimeout(() => {
        window.scrollTo({
          top: position,
          behavior: 'smooth'
        })
        setScrollPosition(position)
      }, 300) // 이미지 로딩 후 복원
    }
  }, [loading])

  // 스크롤 이벤트 리스너 (스크롤 위치 기억)
  useEffect(() => {
    let scrollTimeout: NodeJS.Timeout | null = null
    let isThrottled = false

    const handleScroll = () => {
      const currentScrollY = window.scrollY
      
      // 스크롤 위치를 localStorage에 저장 (throttle)
      if (scrollTimeout) clearTimeout(scrollTimeout)
      scrollTimeout = setTimeout(() => {
        localStorage.setItem('home-scroll-position', currentScrollY.toString())
        setScrollPosition(currentScrollY)
      }, 500)
      
      if (isThrottled) return
      isThrottled = true
      
      setTimeout(() => {
        // 간단한 무한 스크롤만
        if (
          window.innerHeight + document.documentElement.scrollTop + 600 >= 
          document.documentElement.offsetHeight &&
          !loadingMore &&
          hasMore
        ) {
          loadMore()
        }
        isThrottled = false
      }, 200)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      window.removeEventListener('scroll', handleScroll)
      if (scrollTimeout) clearTimeout(scrollTimeout)
    }
  }, [loadMore, loadingMore, hasMore])

  // 향상된 Intersection Observer - 가시영역 우선 로딩 + 현재 화면 기준
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const intersectionRatio = entry.intersectionRatio
          const cardId = entry.target.id
          const imageIndex = images.findIndex(img => `card-${img.type}-${img.id}` === cardId)
          
          if (imageIndex >= 0) {
            const image = images[imageIndex]
            
            if (entry.isIntersecting) {
              // 가시영역에 있는 이미지는 최우선 처리
              const img = entry.target.querySelector('img')
              if (img && !img.complete) {
                img.loading = 'eager'
              }

              // 현재 화면에 보이는 정도에 따라 즉시 또는 빠른 프리로딩
              if (image.type === 'doodle' && image.original_image_url) {
                const delay = intersectionRatio > 0.5 ? 0 : 200 // 화면 절반 이상 보이면 즉시
                setTimeout(() => {
                  preloadImageInBackground(image.original_image_url!)
                }, delay)
              }
            } else if (intersectionRatio === 0) {
              // 완전히 벗어난 이미지는 지연 프리로딩
              if (image.type === 'doodle' && image.original_image_url) {
                setTimeout(() => {
                  preloadImageInBackground(image.original_image_url!)
                }, 2000)
              }
            }
          }
        })
      },
      {
        rootMargin: '300px 0px', // 위아래 300px 마진으로 확대
        threshold: [0, 0.1, 0.25, 0.5, 0.75, 1.0] // 더 세밀한 가시성 단계
      }
    )

    // 모든 이미지 카드를 관찰
    const imageCards = document.querySelectorAll('[id^="card-"]')
    imageCards.forEach(card => observer.observe(card))

    return () => observer.disconnect()
  }, [images, preloadImageInBackground])

  // 이미지 클릭 핸들러
  const handleImageClick = (image: GalleryImage) => {
    setSelectedImage(image)
    setModalOpen(true)
    
    // 혹시 아직 프리로딩 안된 원본이 있으면 즉시 로딩
    if (image.type === 'doodle' && image.original_image_url && !preloadedImages.has(image.original_image_url)) {
      preloadImageInBackground(image.original_image_url)
    }
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
      case "5years": return "5살"
      case "teen": return "10대"
      case "20s": return "20대"
      case "30s": return "30대"
      case "40s": return "40대"
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
      <div className="text-center pt-12 pb-10 px-4 md:px-6">
        <h1 className="text-4xl md:text-7xl font-bold text-gray-800 mb-4 md:mb-6 font-display">
            돌핀인캘리 AI
          </h1>
        <p className="text-lg md:text-2xl text-gray-600 max-w-4xl mx-auto mb-3 md:mb-4">
            AI로 상상하는 미래와 창작하는 현실을 경험해보세요
          </p>
        <p className="text-base md:text-lg text-gray-500">
          다른 사용자들이 만든 놀라운 작품들을 구경해보세요 ✨
          </p>
        </div>

      {/* 사용자 갤러리 */}
      <div className="max-w-8xl mx-auto px-4 md:px-6 pb-32">
                {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {Array.from({ length: 12 }).map((_, i) => (
              <Card key={i} className="overflow-hidden border border-gray-200 rounded-2xl">
                <div className="aspect-[3/4] bg-gray-200 animate-shimmer rounded-t-2xl" />
                <CardContent className="p-4 space-y-3">
                  <div className="h-4 bg-gray-200 rounded animate-shimmer" />
                  <div className="h-3 bg-gray-200 rounded w-2/3 animate-shimmer" />
                  <div className="flex gap-2">
                    <div className="h-6 w-16 bg-gray-200 rounded-full animate-shimmer" />
                    <div className="h-6 w-12 bg-gray-200 rounded-full animate-shimmer" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
                 ) : images.length > 0 ? (
           <>
             {/* Masonry Layout with react-masonry-css */}
             <Masonry
               breakpointCols={{
                 default: 3,  // 기본 3열로 줄임
                 1024: 2,     // lg에서 2열
                 768: 2,      // md에서 2열
                 640: 1       // sm에서 1열
               }}
               className="flex w-auto -ml-4 md:-ml-6"
               columnClassName="pl-4 md:pl-6 bg-clip-padding"
             >
               {images.map((image) => {
                 const displayImage = image.type === 'doodle' ? image.result_image_url : image.image_url
                 
                 return (
                   <div 
                     key={`${image.type}-${image.id}`} 
                     className="mb-6 opacity-0 transform translate-y-4 transition-all duration-300 ease-out"
                     id={`card-${image.type}-${image.id}`}
                   >
                     <Card 
                       className="group overflow-hidden border-2 border-gray-200 rounded-2xl hover:border-purple-300 hover:shadow-lg transition-all duration-200 cursor-pointer bg-white/80 backdrop-blur-sm"
                       onClick={() => handleImageClick(image)}
                     >
                       <div className="relative overflow-hidden">
                         <Image
                           src={displayImage || "/placeholder.svg"}
                           alt={image.type === 'doodle' ? "낙서현실화" : "시간버스"}
                           width={400}
                           height={600}
                           className="w-full h-auto object-contain transition-transform duration-200"
                           loading={images.indexOf(image) < 4 ? "eager" : "lazy"}
                           priority={images.indexOf(image) < 4}
                           quality={75}
                           sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                           placeholder="blur"
                           blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkbHB0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q=="
                           onLoad={() => {
                             // 이미지 로드 완료 후 카드 전체를 표시
                             const cardElement = document.getElementById(`card-${image.type}-${image.id}`);
                             if (cardElement) {
                               cardElement.style.opacity = '1';
                               cardElement.style.transform = 'translateY(0)';
                             }
                           }}
                           onError={() => {
                             // 이미지 로드 실패시에도 카드 표시
                             const cardElement = document.getElementById(`card-${image.type}-${image.id}`);
                             if (cardElement) {
                               cardElement.style.opacity = '1';
                               cardElement.style.transform = 'translateY(0)';
                             }
                           }}
                         />
                           
                           {/* 오버레이 그라디언트 - 하단에서만 표시되도록 수정 */}
                           <div className="absolute inset-0 bg-gradient-to-b from-transparent from-60% via-transparent via-80% to-black/30 opacity-100 transition-opacity duration-300" />
                           
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



                           {/* 하단 정보 - 항상 표시되도록 수정 */}
                           <div className="absolute bottom-0 left-0 right-0 p-4 text-white z-10 transform translate-y-0 transition-transform duration-300">
                             <h3 className="text-sm font-medium mb-1 drop-shadow-md">
                               {image.type === 'doodle' 
                                 ? `${image.style} 스타일`
                                 : `${getAgeLabel(image.age || '')} ${getJobLabel(image.job || '')}`
                               }
                             </h3>
                             {/* 사용자 정보와 날짜 - 나중에 사용할 예정으로 주석처리
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
                             */}
                           </div>
                         </div>
                       </Card>
                   </div>
                 )
               })}
             </Masonry>

            {/* 로딩 더 보기 스켈레톤 */}
            {loadingMore && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mt-8">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Card key={`loading-${i}`} className="overflow-hidden border border-gray-200 rounded-2xl">
                    <div className="aspect-[3/4] bg-gray-200 animate-shimmer rounded-t-2xl" />
                    <CardContent className="p-4 space-y-3">
                      <div className="h-4 bg-gray-200 rounded animate-shimmer" />
                      <div className="h-3 bg-gray-200 rounded w-2/3 animate-shimmer" />
                      <div className="flex gap-2">
                        <div className="h-6 w-16 bg-gray-200 rounded-full animate-shimmer" />
                        <div className="h-6 w-12 bg-gray-200 rounded-full animate-shimmer" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* 더 이상 로드할 데이터가 없을 때 메시지 */}
            {!hasMore && !loadingMore && (
              <div className="text-center mt-8">
                <div className="text-gray-500 text-sm">
                  모든 작품을 확인했습니다 ✨
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-16 md:py-24 bg-white/60 backdrop-blur-sm rounded-3xl border-2 border-gray-200 mx-2 md:mx-0">
            <div className="text-6xl md:text-8xl mb-4 md:mb-6">🎨</div>
            <p className="text-gray-600 font-medium mb-2 md:mb-3 text-lg md:text-xl">아직 작품이 없어요</p>
            <p className="text-gray-500 text-base md:text-lg">첫 번째 작품을 만들어보세요!</p>
          </div>
        )}
      </div>

             {/* 플로팅 액션 버튼 - 하단 중앙 배치 */}
       <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 flex gap-4 z-50">
         {/* 시간버스 버튼 */}
         <div className="relative group">
              <Link href="/future-me">
             <Button
               size="lg"
               className="px-6 py-3 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 flex items-center gap-2"
             >
               <Sparkles className="h-5 w-5" />
               <span className="font-medium">시간버스</span>
                </Button>
              </Link>

           {/* 설명 팝업 */}
           <div className="absolute bottom-16 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none">
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
               className="px-6 py-3 rounded-full bg-gradient-to-r from-teal-500 to-green-500 hover:from-teal-600 hover:to-green-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 flex items-center gap-2"
             >
               <Pencil className="h-5 w-5" />
               <span className="font-medium">낙서현실화</span>
                </Button>
              </Link>
           
           {/* 설명 팝업 */}
           <div className="absolute bottom-16 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none">
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