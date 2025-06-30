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
  
  // 스마트 프리로딩: Next.js Image와 동일한 최적화 URL 사용
  const preloadImageSmart = useCallback((url: string) => {
    if (!url || preloadedImages.has(url)) return
    
    // Next.js 이미지 최적화 URL 생성 (빌드환경 고려)
    const nextImageUrl = process.env.NODE_ENV === 'development' 
      ? url // 개발환경에서는 원본 URL
      : `/_next/image?url=${encodeURIComponent(url)}&w=640&q=85` // 빌드환경에서는 최적화 URL (갤러리와 동일한 quality)
    
    const img = document.createElement('img')
    img.onload = () => {
      setPreloadedImages(prev => new Set(prev).add(url))
    }
    img.onerror = () => {
      // 에러는 조용히 처리
    }
    img.src = nextImageUrl
  }, [preloadedImages])

  // 확장된 프리로딩: 보이는 영역 + 메인 이미지들
  const preloadVisibleAreaImages = useCallback(() => {
    const viewportHeight = window.innerHeight
    const scrollTop = window.scrollY
    const preloadZoneEnd = scrollTop + viewportHeight * 2.0 // 현재 화면 + 아래 1화면 (더 확장)

    // 1. 낙서 원본 이미지 프리로딩 (기존)
    const visibleDoodleImages = images
      .map((img, index) => ({ ...img, index }))
      .filter((img, arrayIndex) => {
        if (img.type !== 'doodle' || !img.original_image_url) return false
        
        // 실제 DOM 요소의 위치 확인
        const cardElement = document.getElementById(`card-${img.type}-${img.id}`)
        if (cardElement) {
          const rect = cardElement.getBoundingClientRect()
          const absoluteTop = rect.top + scrollTop
          return absoluteTop <= preloadZoneEnd
        }
        
        // DOM 요소가 없으면 인덱스 기반 추정
        const estimatedCardHeight = 400
        const row = Math.floor(arrayIndex / 3)
        const cardTop = row * estimatedCardHeight + 300
        return cardTop <= preloadZoneEnd
      })
      .slice(0, 8) // 더 많이 프리로딩

    // 2. 메인 갤러리 이미지도 적극적으로 프리로딩 (새로 추가)
    const visibleMainImages = images
      .filter((img, index) => {
        // 첫 16개는 즉시 프리로딩
        if (index < 16) return true
        
        // 나머지는 뷰포트 기준
        const cardElement = document.getElementById(`card-${img.type}-${img.id}`)
        if (cardElement) {
          const rect = cardElement.getBoundingClientRect()
          const absoluteTop = rect.top + scrollTop
          return absoluteTop <= preloadZoneEnd
        }
        return false
      })
      .slice(0, 16) // 최대 16개

    // 낙서 원본 프리로딩
    visibleDoodleImages.forEach((image, index) => {
      if (image.original_image_url) {
        setTimeout(() => {
          preloadImageSmart(image.original_image_url!)
        }, index * 50) // 더 빠른 간격
      }
    })

    // 메인 이미지 프리로딩 (빌드환경에서도 빠른 로딩)
    visibleMainImages.forEach((image, index) => {
      const mainImageUrl = image.type === 'doodle' ? image.result_image_url : image.image_url
      if (mainImageUrl && index >= 8) { // 첫 8개는 이미 priority 처리됨
        setTimeout(() => {
          preloadImageSmart(mainImageUrl)
        }, (index - 8) * 50 + 200) // 낙서 원본 이후에 시작
      }
    })
  }, [images, preloadImageSmart])

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
      
      // 각 타입별로 페이지당 8개씩 가져오기 (더 빠른 초기 로딩을 위해 증가)
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

      // 새로 로드된 이미지 후 스마트 프리로딩 실행 (더 빠르게)
      setTimeout(() => {
        preloadVisibleAreaImages()
      }, 100) // 메인 이미지들이 로딩된 후 0.1초 뒤 시작

      // 더 불러올 데이터가 있는지 확인
      const avatarHasMore = avatarData.success && avatarData.images && avatarData.images.length === limit
      const doodleHasMore = doodleData.success && doodleData.images && doodleData.images.length === limit
      const stillHasMore = avatarHasMore || doodleHasMore
      
      console.log('📊 초기 로딩 완료:', { 
        avatarImages: avatarImages.length,
        doodleImages: doodleImages.length,
        total: newImages.length,
        avatarHasMore,
        doodleHasMore,
        stillHasMore
      })
      
      setHasMore(stillHasMore)
      
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

  // 강력한 무한스크롤 - 더 많은 이미지 로드 
  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) {
      console.log('로딩 중이거나 더 이상 로드할 데이터가 없음:', { loadingMore, hasMore })
      return
    }

    console.log('🔄 더 많은 이미지 로딩 시작...', { avatarPage, doodlePage })
    
    setLoadingMore(true)
    
    try {
      const limit = 8
      let avatarImages: any[] = []
      let doodleImages: any[] = []
      let avatarHasMore = false
      let doodleHasMore = false

      // 두 타입의 이미지를 모두 로드 시도
      try {
        const avatarResponse = await fetch(`/api/gallery?type=avatar&limit=${limit}&page=${avatarPage}&filter=latest`)
        const avatarData = await avatarResponse.json()
        if (avatarData.success && avatarData.images) {
          avatarImages = avatarData.images.map((img: any) => ({ ...img, type: 'avatar' }))
          avatarHasMore = avatarImages.length === limit
        }
      } catch (error) {
        console.warn('아바타 이미지 로딩 실패:', error)
      }

      try {
        const doodleResponse = await fetch(`/api/gallery?type=doodle&limit=${limit}&page=${doodlePage}&filter=latest`)
        const doodleData = await doodleResponse.json()
        if (doodleData.success && doodleData.images) {
          doodleImages = doodleData.images.map((img: any) => ({ ...img, type: 'doodle' }))
          doodleHasMore = doodleImages.length === limit
        }
      } catch (error) {
        console.warn('낙서 이미지 로딩 실패:', error)
      }

      // 새로운 이미지들을 합치고 섞기
      const newImages = [...avatarImages, ...doodleImages]
        .sort(() => Math.random() - 0.5)

      console.log('📊 로딩된 새 이미지:', { 
        avatarCount: avatarImages.length, 
        doodleCount: doodleImages.length,
        total: newImages.length 
      })

      if (newImages.length > 0) {
        // 중복 제거 후 추가
        setImages(prev => {
          const uniqueNewImages = removeDuplicates(newImages, prev)
          console.log('✅ 중복 제거 후 추가될 이미지:', uniqueNewImages.length)
          return [...prev, ...uniqueNewImages]
        })

        // 페이지 번호 증가 (로딩 성공시에만)
        if (avatarImages.length > 0) setAvatarPage(prev => prev + 1)
        if (doodleImages.length > 0) setDoodlePage(prev => prev + 1)
      }

      // hasMore 상태 업데이트 (둘 중 하나라도 더 있으면 계속)
      const stillHasMore = avatarHasMore || doodleHasMore
      console.log('📈 더 로드할 데이터 여부:', { avatarHasMore, doodleHasMore, stillHasMore })
      setHasMore(stillHasMore)

      // 프리로딩 실행
      setTimeout(() => {
        preloadVisibleAreaImages()
      }, 100)

      // 성공적으로 로드했으면 에러 카운트 리셋
      localStorage.removeItem('loadMoreErrorCount')

    } catch (error) {
      console.error('❌ 이미지 로딩 중 오류:', error)
      // 오류 발생해도 계속 시도할 수 있도록 hasMore는 유지
      // 단, 3회 연속 실패하면 hasMore를 false로 설정
      const errorCount = parseInt(localStorage.getItem('loadMoreErrorCount') || '0') + 1
      localStorage.setItem('loadMoreErrorCount', errorCount.toString())
      
      if (errorCount >= 3) {
        console.warn('⚠️ 3회 연속 로딩 실패, 무한스크롤 중단')
        setHasMore(false)
        localStorage.removeItem('loadMoreErrorCount')
      }
    } finally {
      setLoadingMore(false)
      console.log('�� 이미지 로딩 완료')
    }
  }, [loadingMore, hasMore, avatarPage, doodlePage, removeDuplicates, preloadVisibleAreaImages])

  // 강화된 스크롤 이벤트 핸들러
  useEffect(() => {
    let scrollTimeout: NodeJS.Timeout | null = null
    let isThrottled = false
    let lastScrollY = 0

    const handleScroll = () => {
      const currentScrollY = window.scrollY
      const direction = currentScrollY > lastScrollY ? 'down' : 'up'
      lastScrollY = currentScrollY
      
      // 스크롤 위치를 localStorage에 저장 (throttle)
      if (scrollTimeout) clearTimeout(scrollTimeout)
      scrollTimeout = setTimeout(() => {
        localStorage.setItem('home-scroll-position', currentScrollY.toString())
        setScrollPosition(currentScrollY)
      }, 500)
      
      if (isThrottled) return
      isThrottled = true
      
      setTimeout(() => {
        // 스크롤 시 현재 화면 기준 스마트 프리로딩 실행
        preloadVisibleAreaImages()
        
        // 개선된 무한 스크롤 트리거 (아래 방향으로만)
        if (direction === 'down') {
          const { scrollTop, scrollHeight, clientHeight } = document.documentElement
          const scrollPercent = (scrollTop / (scrollHeight - clientHeight)) * 100
          
          // 80% 지점에서 트리거하거나, 하단 600px 이내
          const shouldLoad = scrollPercent > 80 || 
                           (scrollTop + clientHeight + 600 >= scrollHeight)

          if (shouldLoad && !loadingMore && hasMore) {
            console.log('🚀 무한스크롤 트리거:', { 
              scrollPercent: Math.round(scrollPercent), 
              remaining: scrollHeight - scrollTop - clientHeight 
            })
            loadMore()
          }
        }
        
        isThrottled = false
      }, 100) // 더 빠른 응답
    }

    window.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      window.removeEventListener('scroll', handleScroll)
      if (scrollTimeout) clearTimeout(scrollTimeout)
    }
  }, [loadMore, loadingMore, hasMore, preloadVisibleAreaImages])

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

              // 현재 화면에 보이는 정도에 따라 즉시 프리로딩 (더 적극적)
              if (image.type === 'doodle' && image.original_image_url) {
                const delay = intersectionRatio > 0.3 ? 0 : 100 // 화면 30% 이상 보이면 즉시
                setTimeout(() => {
                  preloadImageSmart(image.original_image_url!)
                }, delay)
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
  }, [images, preloadImageSmart])

  // 이미지 클릭 핸들러
  const handleImageClick = (image: GalleryImage) => {
    setSelectedImage(image)
    setModalOpen(true)
    
    // 혹시 아직 프리로딩 안된 원본이 있으면 즉시 로딩
    if (image.type === 'doodle' && image.original_image_url && !preloadedImages.has(image.original_image_url)) {
      preloadImageSmart(image.original_image_url)
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
      case "teacher": return "선생님"
      case "engineer": return "엔지니어"
      case "doctor": return "의사"
      case "lawyer": return "변호사"
      case "chef": return "요리사"
      case "musician": return "음악가"
      case "designer": return "디자이너"
      case "writer": return "작가"
      case "photographer": return "사진작가"
      case "pilot": return "조종사"
      case "firefighter": return "소방관"
      case "police": return "경찰"
      case "nurse": return "간호사"
      case "farmer": return "농부"
      case "businessman": return "사업가"
      case "scientist": return "과학자"
      case "artist": return "예술가"
      case "athlete": return "운동선수"
      case "announcer": return "아나운서"
      default: return job
    }
  }

  const getStyleLabel = (style: string) => {
    switch (style) {
      case "realistic": return "사실적인 이미지"
      case "anime": return "애니메이션 스타일"
      case "cartoon": return "만화 스타일"
      case "watercolor": return "수채화 스타일"
      case "oil_painting": return "유화 스타일"
      case "sketch": return "스케치 스타일"
      case "pixel_art": return "픽셀 아트"
      case "impressionist": return "인상주의 스타일"
      case "abstract": return "추상화 스타일"
      case "minimalist": return "미니멀 스타일"
      case "vintage": return "빈티지 스타일"
      case "cyberpunk": return "사이버펑크 스타일"
      case "fantasy": return "판타지 스타일"
      case "steampunk": return "스팀펑크 스타일"
      case "gothic": return "고딕 스타일"
      default: return style
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
          <Masonry
            breakpointCols={{
              default: 3,
              1024: 2,
              768: 2,
              640: 1
            }}
            className="flex w-auto -ml-4 md:-ml-6"
            columnClassName="pl-4 md:pl-6 bg-clip-padding"
          >
            {Array.from({ length: 16 }).map((_, i) => {
              // 다양한 이미지 비율 시뮬레이션 (실제 이미지와 유사하게)
              const aspectRatios = [
                'aspect-[3/4]',   // 세로형 (기본)
                'aspect-[4/5]',   // 약간 세로형  
                'aspect-[1/1]',   // 정사각형
                'aspect-[3/4]',   // 세로형
                'aspect-[4/6]',   // 세로형
                'aspect-[5/7]',   // 세로형
                'aspect-[3/4]',   // 세로형
                'aspect-[4/5]',   // 약간 세로형
                'aspect-[2/3]',   // 세로형
                'aspect-[3/4]',   // 세로형
                'aspect-[1/1]',   // 정사각형
                'aspect-[4/5]'    // 약간 세로형
              ]
              const randomAspect = aspectRatios[i]
              
              return (
                <div key={`initial-shimmer-${i}`} className="mb-6">
                  <Card className="overflow-hidden border border-gray-200 rounded-2xl bg-white/80 backdrop-blur-sm">
                    <div className="relative overflow-hidden">
                      <div className={`w-full ${randomAspect} bg-gray-200 animate-shimmer`} />
                      
                      {/* 배지 시뮬레이션 */}
                      <div className="absolute top-3 left-3 h-6 w-20 bg-gray-300 rounded-full animate-shimmer" style={{animationDelay: `${i * 0.1}s`}} />
                      
                      {/* 하단 정보 시뮬레이션 */}
                      <div className="absolute bottom-0 left-0 right-0 p-4">
                        <div className="h-4 bg-gray-300 rounded w-3/4 animate-shimmer" style={{animationDelay: `${i * 0.15}s`}} />
                      </div>
                    </div>
                  </Card>
                </div>
              )
            })}
          </Masonry>
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
                     className="mb-6 opacity-0 transform translate-y-4 transition-all duration-200 ease-out"
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
                           quality={85}
                           fetchPriority={images.indexOf(image) < 4 ? "high" : "auto"}
                           sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                           onLoad={() => {
                             // 이미지 로드 완료 후 카드 전체를 빠르게 표시
                             const cardElement = document.getElementById(`card-${image.type}-${image.id}`);
                             if (cardElement) {
                               cardElement.classList.add('fade-in-up');
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
                                 ? getStyleLabel(image.style)
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

            {/* Masonry 스타일 로딩 스켈레톤 */}
            {loadingMore && (
              <Masonry
                breakpointCols={{
                  default: 3,
                  1024: 2,
                  768: 2,
                  640: 1
                }}
                className="flex w-auto -ml-4 md:-ml-6 mt-8"
                columnClassName="pl-4 md:pl-6 bg-clip-padding"
              >
                {Array.from({ length: 6 }).map((_, i) => {
                  // 다양한 이미지 비율 시뮬레이션 (실제 이미지와 유사하게)
                  const aspectRatios = [
                    'aspect-[3/4]',   // 세로형 (기본)
                    'aspect-[4/5]',   // 약간 세로형
                    'aspect-[1/1]',   // 정사각형
                    'aspect-[3/4]',   // 세로형
                    'aspect-[4/6]',   // 세로형
                    'aspect-[5/7]'    // 세로형
                  ]
                  const randomAspect = aspectRatios[i % aspectRatios.length]
                  
                  return (
                    <div key={`loading-shimmer-${i}`} className="mb-6">
                      <Card className="overflow-hidden border border-gray-200 rounded-2xl bg-white/80 backdrop-blur-sm">
                        <div className="relative overflow-hidden">
                          <div className={`w-full ${randomAspect} bg-gray-200 animate-shimmer`} />
                          
                                                     {/* 배지 시뮬레이션 */}
                           <div className="absolute top-3 left-3 h-6 w-20 bg-gray-300 rounded-full animate-shimmer" style={{animationDelay: `${i * 0.1}s`}} />
                           
                           {/* 하단 정보 시뮬레이션 */}
                           <div className="absolute bottom-0 left-0 right-0 p-4">
                             <div className="h-4 bg-gray-300 rounded w-3/4 animate-shimmer" style={{animationDelay: `${i * 0.15}s`}} />
                           </div>
                        </div>
                      </Card>
                    </div>
                  )
                })}
              </Masonry>
            )}

            {/* 하단 상태 인디케이터 */}
            {!loadingMore && hasMore && (
              <div className="text-center mt-8 py-4">
                <div className="flex items-center justify-center gap-2 text-gray-400">
                  <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                  <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                  <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                </div>
                <div className="text-gray-500 text-sm mt-2">
                  스크롤하여 더 많은 작품 보기
                </div>
                {/* 개발환경에서만 디버깅 정보 표시 */}
                {process.env.NODE_ENV === 'development' && (
                  <div className="text-xs text-gray-400 mt-2 bg-gray-100 rounded p-2">
                    현재 이미지: {images.length}개 | 페이지: A{avatarPage} D{doodlePage} | 더보기: {hasMore ? '가능' : '없음'}
                  </div>
                )}
              </div>
            )}

            {/* 더 이상 로드할 데이터가 없을 때 메시지 */}
            {!hasMore && !loadingMore && (
              <div className="text-center mt-8">
                <div className="text-gray-500 text-sm">
                  모든 작품을 확인했습니다 ✨
                </div>
                {/* 개발환경에서만 디버깅 정보 표시 */}
                {process.env.NODE_ENV === 'development' && (
                  <div className="text-xs text-gray-400 mt-2 bg-gray-100 rounded p-2">
                    총 {images.length}개 이미지 로딩 완료 | 최종 페이지: A{avatarPage} D{doodlePage}
                  </div>
                )}
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
                     <Image
                       src={selectedImage.original_image_url || "/placeholder.svg"}
                       alt="원본 낙서"
                       width={400}
                       height={600}
                       className="w-full h-auto object-contain rounded-lg border bg-white"
                       style={{ maxHeight: '50vh' }}
                       quality={85}
                       sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                     />
                   </div>
                   <div>
                     <h4 className="text-sm font-medium text-gray-600 mb-2">현실화된 이미지</h4>
                     <Image
                       src={selectedImage.result_image_url || "/placeholder.svg"}
                       alt="현실화된 이미지"
                       width={400}
                       height={600}
                       className="w-full h-auto object-contain rounded-lg"
                       style={{ maxHeight: '50vh' }}
                       quality={85}
                       sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                     />
                   </div>
                 </div>
               ) : (
                 /* 시간버스: 단일 이미지 */
                 <div className="mb-6">
                   <Image
                     src={selectedImage.image_url || "/placeholder.svg"}
                     alt="시간버스"
                     width={400}
                     height={600}
                     className="w-full h-auto object-contain rounded-lg max-h-[60vh] mx-auto"
                     quality={85}
                     sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
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
                         <span className="font-medium">스타일:</span> {getStyleLabel(selectedImage.style)}
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
                         <span className="font-medium">스타일:</span> {getStyleLabel(selectedImage.style)}
                       </p>
                     </div>
                   )}
        </div>

                 {/* 생성 날짜 */}
                 <div className="pt-4 border-t">
                   <p className="text-sm text-gray-600 flex items-center">
                     <Clock className="h-3 w-3 mr-1" />
                     {new Date(selectedImage.created_at).toLocaleDateString()}
                   </p>
                 </div>
               </div>
             </div>
           </div>
         </div>
       )}
    </main>
  )
}