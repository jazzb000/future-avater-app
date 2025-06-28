"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Heart, MessageSquare, Eye, Share2, ArrowLeft, Trash2 } from 'lucide-react'
import Link from "next/link"
import { formatDistanceToNow } from "date-fns"
import { ko } from "date-fns/locale"

type ImageDetail = {
  id: string
  image_url: string
  job: string
  age: string
  style: string
  layout: string
  created_at: string
  user_id: string
  profiles: {
    username: string
    avatar_url: string
  }
}

type Comment = {
  id: string
  comment: string
  created_at: string
  user_id: string
  profiles: {
    username: string
    avatar_url: string
  }
}

export default function ImageDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const [image, setImage] = useState<ImageDetail | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState("")
  const [loading, setLoading] = useState(true)
  const [commentLoading, setCommentLoading] = useState(false)
  const [liked, setLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  const [viewCount, setViewCount] = useState(0)
  const imageId = params.id as string

  // 이미지 정보 가져오기
  useEffect(() => {
    const fetchImageDetails = async () => {
      try {
        setLoading(true)
        
        // 이미지 조회수 증가
  
        
        // 이미지 상세 정보 가져오기
        const { data: imageData, error: imageError } = await supabase
          .from("generated_images")
          .select(`*, profiles (username, avatar_url)`)
          .eq("id", imageId)
          .single()

        if (imageError) throw imageError
        setImage(imageData)

        // 댓글 가져오기
        fetchComments()

        // 좋아요 정보 가져오기
        fetchLikes()

        // 조회수 가져오기
        const { data: viewData } = await supabase
          .from("image_views")
          .select("view_count")
          .eq("image_id", imageId)
          .single()

        setViewCount(viewData?.view_count || 0)
      } catch (error) {
        console.error("이미지 상세 정보를 가져오는 중 오류가 발생했습니다:", error)
        router.push("/gallery")
      } finally {
        setLoading(false)
      }
    }

    if (imageId) {
      fetchImageDetails()
    }
  }, [imageId, router])

  // 댓글 가져오기
  const fetchComments = async () => {
    try {
      const { data, error } = await supabase
        .from("image_comments")
        .select(`*, profiles (username, avatar_url)`)
        .eq("image_id", imageId)
        .order("created_at", { ascending: false })

      if (error) throw error
      setComments(data || [])
    } catch (error) {
      console.error("댓글을 가져오는 중 오류가 발생했습니다:", error)
    }
  }

  // 좋아요 정보 가져오기
  const fetchLikes = async () => {
    try {
      // 좋아요 수 가져오기
      const { data: likesCountData, error: likesCountError } = await supabase
        .from("image_likes")
        .select("id", { count: "exact" })
        .eq("image_id", imageId)

      if (likesCountError) throw likesCountError
      setLikeCount(likesCountData?.length || 0)

      // 현재 사용자가 좋아요 했는지 확인
      if (user) {
        const { data: userLikeData, error: userLikeError } = await supabase
          .from("image_likes")
          .select("id")
          .eq("image_id", imageId)
          .eq("user_id", user.id)
          .single()

        if (userLikeError && userLikeError.code !== "PGRST116") {
          throw userLikeError
        }

        setLiked(!!userLikeData)
      }
    } catch (error) {
      console.error("좋아요 정보를 가져오는 중 오류가 발생했습니다:", error)
    }
  }

  // 댓글 추가
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !newComment.trim()) return

    try {
      setCommentLoading(true)
      const { error } = await supabase.from("image_comments").insert({
        image_id: imageId,
        user_id: user.id,
        comment: newComment.trim(),
      })

      if (error) throw error

      setNewComment("")
      fetchComments()
    } catch (error) {
      console.error("댓글 추가 중 오류가 발생했습니다:", error)
    } finally {
      setCommentLoading(false)
    }
  }

  // 댓글 삭제
  const handleDeleteComment = async (commentId: string) => {
    if (!user) return

    try {
      const { error } = await supabase
        .from("image_comments")
        .delete()
        .eq("id", commentId)
        .eq("user_id", user.id)

      if (error) throw error

      fetchComments()
    } catch (error) {
      console.error("댓글 삭제 중 오류가 발생했습니다:", error)
    }
  }

  // 좋아요 토글
  const toggleLike = async () => {
    if (!user) {
      router.push("/login")
      return
    }

    try {
      if (liked) {
        // 좋아요 취소
        const { error } = await supabase
          .from("image_likes")
          .delete()
          .eq("image_id", imageId)
          .eq("user_id", user.id)

        if (error) throw error
        setLiked(false)
        setLikeCount((prev) => prev - 1)
      } else {
        // 좋아요 추가
        const { error } = await supabase.from("image_likes").insert({
          image_id: imageId,
          user_id: user.id,
        })

        if (error) throw error
        setLiked(true)
        setLikeCount((prev) => prev + 1)
      }
    } catch (error) {
      console.error("좋아요 처리 중 오류가 발생했습니다:", error)
    }
  }

  // 공유하기
  const handleShare = async () => {
    const url = window.location.href
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `미래의 나 - ${image?.age} ${image?.job}`,
          text: "미래의 나 서비스에서 생성된 이미지를 확인해보세요!",
          url,
        })
      } catch (error) {
        console.error("공유하기 실패:", error)
      }
    } else {
      // 클립보드에 복사
      navigator.clipboard.writeText(url)
      alert("링크가 클립보드에 복사되었습니다.")
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-4 md:p-8 flex justify-center items-center min-h-[50vh]">
        <p className="text-purple-600">이미지 로딩 중...</p>
      </div>
    )
  }

  if (!image) {
    return (
      <div className="max-w-4xl mx-auto p-4 md:p-8">
        <div className="text-center py-16 bg-purple-50 rounded-xl border-2 border-purple-200">
          <p className="text-purple-600 font-medium">이미지를 찾을 수 없습니다</p>
          <Link href="/gallery">
            <Button className="mt-4 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white">
              갤러리로 돌아가기
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8">
      <div className="mb-6">
        <Link href="/gallery" className="flex items-center text-purple-600 hover:text-purple-800">
          <ArrowLeft className="h-4 w-4 mr-1" />
          갤러리로 돌아가기
        </Link>
      </div>

      <Card className="border-3 border-purple-200 rounded-xl overflow-hidden">
        <div className="md:flex">
          <div className="md:w-2/3">
            <div className="relative">
              <img
                src={image.image_url || "/placeholder.svg"}
                alt={`${image.job} 이미지`}
                className="w-full h-auto"
              />
            </div>
          </div>
          <div className="md:w-1/3 p-4 md:p-6">
            <div className="flex items-center mb-4">
              <Avatar className="h-8 w-8 mr-2">
                <AvatarImage src={image.profiles?.avatar_url || ""} />
                <AvatarFallback className="bg-purple-200 text-purple-700">
                  {image.profiles?.username?.charAt(0).toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium text-sm">{image.profiles?.username || "사용자"}</p>
                <p className="text-xs text-gray-500">
                  {formatDistanceToNow(new Date(image.created_at), { addSuffix: true, locale: ko })}
                </p>
              </div>
            </div>

            <h1 className="text-xl font-bold text-purple-700 mb-2">
              {image.age} {image.job}
            </h1>

            <div className="space-y-1 mb-4">
              <p className="text-sm">
                <span className="font-medium">스타일:</span> {image.style}
              </p>
              <p className="text-sm">
                <span className="font-medium">레이아웃:</span> {image.layout}
              </p>
            </div>

            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-4">
                <button
                  onClick={toggleLike}
                  className={`flex items-center space-x-1 ${
                    liked ? "text-pink-500" : "text-gray-500"
                  } hover:text-pink-500`}
                >
                  <Heart className="h-5 w-5" fill={liked ? "currentColor" : "none"} />
                  <span>{likeCount}</span>
                </button>
                <div className="flex items-center space-x-1 text-gray-500">
                  <MessageSquare className="h-5 w-5" />
                  <span>{comments.length}</span>
                </div>
                <div className="flex items-center space-x-1 text-gray-500">
                  <Eye className="h-5 w-5" />
                  <span>{viewCount}</span>
                </div>
              </div>
              <button
                onClick={handleShare}
                className="text-purple-600 hover:text-purple-800"
              >
                <Share2 className="h-5 w-5" />
              </button>
            </div>

            <Separator className="my-4" />

            <div className="space-y-4">
              <h2 className="font-medium">댓글 {comments.length}개</h2>

              {user ? (
                <form onSubmit={handleAddComment} className="flex items-center space-x-2">
                  <Input
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="댓글을 입력하세요..."
                    className="flex-1 border-2 border-purple-200"
                  />
                  <Button
                    type="submit"
                    disabled={!newComment.trim() || commentLoading}
                    className="rounded-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
                  >
                    {commentLoading ? "..." : "등록"}
                  </Button>
                </form>
              ) : (
                <div className="text-center p-3 bg-purple-50 rounded-lg">
                  <p className="text-sm text-purple-600 mb-2">댓글을 작성하려면 로그인이 필요합니다</p>
                  <Link href="/login">
                    <Button
                      size="sm"
                      className="rounded-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
                    >
                      로그인하기
                    </Button>
                  </Link>
                </div>
              )}

              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                {comments.length > 0 ? (
                  comments.map((comment) => (
                    <div key={comment.id} className="bg-gray-50 rounded-lg p-3">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center">
                          <Avatar className="h-6 w-6 mr-2">
                            <AvatarImage src={comment.profiles?.avatar_url || ""} />
                            <AvatarFallback className="bg-purple-200 text-purple-700 text-xs">
                              {comment.profiles?.username?.charAt(0).toUpperCase() || "U"}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">{comment.profiles?.username || "사용자"}</p>
                            <p className="text-xs text-gray-500">
                              {formatDistanceToNow(new Date(comment.created_at), {
                                addSuffix: true,
                                locale: ko,
                              })}
                            </p>
                          </div>
                        </div>
                        {user && user.id === comment.user_id && (
                          <button
                            onClick={() => handleDeleteComment(comment.id)}
                            className="text-gray-400 hover:text-red-500"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                      <p className="text-sm mt-2">{comment.comment}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-gray-500 text-sm py-4">아직 댓글이 없습니다</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
