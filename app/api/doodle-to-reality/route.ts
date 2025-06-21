import { NextResponse } from "next/server"
import { supabaseAdmin, uploadImageToStorage, base64ToBuffer, generateUniqueFileName } from "@/lib/supabase"
import OpenAI from "openai"

// OpenAI 클라이언트 초기화
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(req: Request) {
  try {
    console.log("🎨 낙서 현실화 API 호출 시작")
    const { doodle, style, userId } = await req.json()

    if (!doodle || !style || !userId) {
      console.log("❌ 필수 항목 누락:", { hasDoodle: !!doodle, hasStyle: !!style, hasUserId: !!userId })
      return NextResponse.json(
        {
          success: false,
          error: "필수 항목이 누락되었습니다",
        },
        { status: 400 },
      )
    }

    console.log("✅ 요청 데이터 검증 완료")
    console.log("📊 요청 정보:", { style, userId: userId.substring(0, 8) + "..." })

    // Supabase 관리자 클라이언트 생성
    const supabase = supabaseAdmin()

    // 사용자 티켓 확인
    console.log("🎫 사용자 티켓 확인 중...")
    const { data: ticketData, error: ticketError } = await supabase
      .from("user_tickets")
      .select("remaining_tickets")
      .eq("user_id", userId)
      .single()

    if (ticketError) {
      console.log("❌ 티켓 정보 조회 실패:", ticketError.message)
      return NextResponse.json(
        {
          success: false,
          error: "티켓 정보를 확인할 수 없습니다",
        },
        { status: 400 },
      )
    }

    if (!ticketData || ticketData.remaining_tickets <= 0) {
      console.log("❌ 티켓 부족:", { remaining: ticketData?.remaining_tickets })
      return NextResponse.json(
        {
          success: false,
          error: "티켓이 부족합니다. 티켓을 구매해주세요.",
        },
        { status: 400 },
      )
    }

    console.log("✅ 티켓 확인 완료:", { remaining: ticketData.remaining_tickets })

    // 티켓 사용
    console.log("🎫 티켓 사용 중...")
    const { error: useTicketError } = await supabase.rpc("use_ticket", {
      user_id_param: userId,
    })

    if (useTicketError) {
      console.log("❌ 티켓 사용 실패:", useTicketError.message)
      return NextResponse.json(
        {
          success: false,
          error: "티켓 사용 중 오류가 발생했습니다",
        },
        { status: 500 },
      )
    }

    console.log("✅ 티켓 사용 완료")

    // 스타일에 따른 프롬프트 수정
    console.log("🎭 스타일 프롬프트 생성 중...")
    let stylePrompt = ""
    switch (style) {
      case "realistic":
        stylePrompt = "Transform this simple doodle into a highly detailed, photorealistic image. Maintain the core concept and composition while adding realistic textures, lighting, shadows, and fine details. Make it look like a professional photograph."
        break
      case "cartoon":
        stylePrompt = "Transform this doodle into a vibrant, cute cartoon illustration with smooth lines, bright colors, and appealing character design. Add expressive features and make it look like a professional animation still."
        break
      case "3d":
        stylePrompt = "Transform this doodle into a high-quality 3D rendered model with realistic materials, proper lighting, shadows, and depth. Make it look like a professional 3D visualization with smooth surfaces and accurate proportions."
        break
      case "painting":
        stylePrompt = "Transform this doodle into a beautiful oil painting with visible brush strokes, rich color palette, and artistic composition. Add texture and depth while maintaining the original concept in a painterly style."
        break
      case "digital-art":
        stylePrompt = "Transform this doodle into modern digital artwork with clean lines, vibrant colors, and professional finish. Use contemporary digital art techniques with smooth gradients and polished appearance."
        break
      case "sketch":
        stylePrompt = "Transform this doodle into a refined, detailed pencil sketch with proper shading, texture, and artistic technique. Make it look like a professional illustration with clean lines and depth."
        break
      default:
        stylePrompt = "Transform this doodle into a detailed and refined image with professional quality, maintaining the original concept while enhancing it with proper composition and visual appeal."
    }

    console.log("✅ 프롬프트 생성 완료:", { style, promptLength: stylePrompt.length })

    // Base64 데이터 URL에서 이미지 데이터 추출
    console.log("🖼️ 이미지 데이터 처리 중...")
    const base64Data = doodle.split(",")[1]
    const imageBuffer = Buffer.from(base64Data, "base64")

    // Buffer를 File 객체로 변환 (OpenAI SDK 호환)
    const imageFile = new File([imageBuffer], "doodle.png", { type: "image/png" })

    console.log("✅ 이미지 파일 생성 완료:", { size: imageBuffer.length, type: "image/png" })

    // OpenAI API를 사용하여 이미지 생성
    console.log("🤖 OpenAI API 호출 시작...")
    console.log("📋 API 설정:", { model: "gpt-image-1", size: "1536x1024", quality: "medium" })
    
    const result = await openai.images.edit({
      model: "gpt-image-1",
      image: imageFile,
      prompt: stylePrompt,
      n: 1,
      size: "1536x1024",
      quality: "medium",
      output_format: "png",
      background: "auto",
    })

    console.log("✅ OpenAI API 호출 완료")

    // 생성된 이미지 URL 또는 base64
    if (!result.data || !result.data[0]) {
      console.log("❌ OpenAI API 응답에서 이미지 데이터 없음")
      throw new Error("OpenAI API에서 이미지 데이터를 받지 못했습니다")
    }

    const imageData = result.data[0]
    let finalImageUrl: string | null = null

    if (imageData.url) {
      // URL로 받은 경우 - 이미지를 다운로드하여 Storage에 업로드
      console.log("📥 OpenAI에서 받은 이미지 URL을 Storage로 업로드 중...")
      const imageResponse = await fetch(imageData.url)
      const downloadedImageBuffer = Buffer.from(await imageResponse.arrayBuffer())
      
      // Storage에 업로드
      const fileName = generateUniqueFileName(userId, 'doodle')
      console.log("💾 Storage 업로드 중:", { fileName })
      const { url: storageUrl, error: uploadError } = await uploadImageToStorage(downloadedImageBuffer, fileName, 'doodle-images')
      
      if (uploadError) {
        console.log("❌ Storage 업로드 실패:", uploadError)
        throw new Error(`Storage 업로드 실패: ${uploadError}`)
      }
      
      finalImageUrl = storageUrl
      console.log("✅ Storage 업로드 완료:", { url: storageUrl?.substring(0, 50) + "..." })
    } else if (imageData.b64_json) {
      // Base64로 받은 경우 - 직접 Storage에 업로드
      console.log("📥 OpenAI에서 받은 base64 이미지를 Storage로 업로드 중...")
      const imageBuffer = base64ToBuffer(`data:image/png;base64,${imageData.b64_json}`)
      
      // Storage에 업로드
      const fileName = generateUniqueFileName(userId, 'doodle')
      console.log("💾 Storage 업로드 중:", { fileName })
      const { url: storageUrl, error: uploadError } = await uploadImageToStorage(imageBuffer, fileName, 'doodle-images')
      
      if (uploadError) {
        console.log("❌ Storage 업로드 실패:", uploadError)
        throw new Error(`Storage 업로드 실패: ${uploadError}`)
      }
      
      finalImageUrl = storageUrl
      console.log("✅ Storage 업로드 완료:", { url: storageUrl?.substring(0, 50) + "..." })
    }

    if (!finalImageUrl) {
      console.log("❌ 최종 이미지 URL 생성 실패")
      throw new Error("이미지 생성에 실패했습니다")
    }

    // 원본 낙서 이미지도 Storage에 업로드
    console.log("📤 원본 낙서 이미지 Storage 업로드 중...")
    const originalImageBuffer = base64ToBuffer(doodle)
    const originalFileName = generateUniqueFileName(userId, 'original_doodle')
    const { url: originalStorageUrl, error: originalUploadError } = await uploadImageToStorage(
      originalImageBuffer, 
      originalFileName, 
      'doodle-images'
    )

    if (originalUploadError) {
      console.log("⚠️ 원본 이미지 업로드 실패 (계속 진행):", originalUploadError)
    } else {
      console.log("✅ 원본 이미지 업로드 완료")
    }

    // 생성된 이미지 정보 저장
    console.log("💾 데이터베이스에 이미지 정보 저장 중...")
    const { data: savedImageData, error: saveError } = await supabase
      .from("doodle_images")
      .insert({
        user_id: userId,
        original_image_url: originalStorageUrl || doodle, // Storage 업로드 실패 시 원본 base64 사용
        result_image_url: finalImageUrl,
        style,
        is_public: false, // 기본적으로 비공개로 설정
        status: "completed", // 완료 상태로 설정
      })
      .select()
      .single()

    if (saveError) {
      console.log("❌ 데이터베이스 저장 실패:", saveError.message)
      console.log("⚠️ 이미지는 생성되었지만 DB 저장 실패")
      return NextResponse.json({
        success: true,
        imageUrl: finalImageUrl,
        imageId: null,
      })
    }

    console.log("✅ 데이터베이스 저장 완료:", { imageId: savedImageData.id })

    // 생성된 이미지 URL과 ID 반환
    console.log("🎉 낙서 현실화 완료!")
    return NextResponse.json({
      success: true,
      imageUrl: finalImageUrl,
      imageId: savedImageData.id,
    })
  } catch (error) {
    console.error("❌ 낙서 현실화 중 오류:", error)
    return NextResponse.json(
      {
        success: false,
        error: "이미지 생성에 실패했습니다",
      },
      { status: 500 },
    )
  }
}
