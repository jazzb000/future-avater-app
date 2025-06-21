import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const imageId = params.id

  if (!imageId) {
    return NextResponse.json({ error: "이미지 ID가 필요합니다" }, { status: 400 })
  }

  // SSE 헤더 설정
  const headers = new Headers({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control',
  })

  const stream = new ReadableStream({
    start(controller) {
      const supabase = supabaseAdmin()
      let intervalId: NodeJS.Timeout

      // 초기 상태 확인 및 주기적 체크
      const checkStatus = async () => {
        try {
          const { data, error } = await supabase
            .from("generated_images")
            .select("id, image_url, status, error_message, completed_at")
            .eq("id", imageId)
            .single()

          if (error) {
            controller.enqueue(`data: ${JSON.stringify({ error: "이미지를 찾을 수 없습니다" })}\n\n`)
            controller.close()
            return
          }

          const statusData = {
            imageId: data.id,
            imageUrl: data.image_url,
            status: data.status,
            errorMessage: data.error_message,
            completedAt: data.completed_at,
          }

          // 클라이언트로 상태 전송
          controller.enqueue(`data: ${JSON.stringify(statusData)}\n\n`)

          // 완료되었거나 오류가 발생한 경우 스트림 종료
          if (data.status === 'completed' || data.status === 'error' || data.status === 'completed_with_fallback') {
            clearInterval(intervalId)
            controller.close()
          }
        } catch (error) {
          console.error('상태 확인 중 오류:', error)
          controller.enqueue(`data: ${JSON.stringify({ error: "상태 확인 중 오류가 발생했습니다" })}\n\n`)
          clearInterval(intervalId)
          controller.close()
        }
      }

      // 즉시 첫 번째 상태 확인
      checkStatus()

      // 2초마다 상태 확인 (완료될 때까지)
      intervalId = setInterval(checkStatus, 2000)

      // 클라이언트 연결 종료 시 정리
      req.signal.addEventListener('abort', () => {
        clearInterval(intervalId)
        controller.close()
      })
    },
  })

  return new Response(stream, { headers })
} 