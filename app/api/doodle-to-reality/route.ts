import { NextResponse } from "next/server"
import { supabaseAdmin, uploadImageToStorage, base64ToBuffer, generateUniqueFileName } from "@/lib/supabase"
import OpenAI from "openai"
import sharp from "sharp"
import * as fs from "fs/promises"
import path from "path"

// 최대 실행 시간 300초 설정
export const maxDuration = 300

// OpenAI 클라이언트 초기화
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// 돌핀인캘리 AI 로고 합성 함수
async function addDolphinAILogo(imageBuffer: Buffer): Promise<Buffer> {
  try {
    // 로고 파일 경로
    const logoPath = path.join(process.cwd(), 'public', '돌핀인캘리 AI.svg')
    
    // SVG 파일 읽기
    const logoSvg = await fs.readFile(logoPath, 'utf-8')
    
    // 이미지 정보 가져오기
    const image = sharp(imageBuffer)
    const { width, height } = await image.metadata()
    
    if (!width || !height || width < 100 || height < 100) {
      throw new Error(`이미지 크기가 유효하지 않습니다: ${width}x${height}`)
    }
    
    // 돌핀인캘리 AI 로고의 비율을 가정 (실제 SVG 확인 후 조정 필요)
    // 일반적인 로고 비율로 2:1 정도로 가정
    const svgAspectRatio = 2.0
    
    // 로고 높이를 이미지 크기의 10%로 설정하고, 원래 비율에 맞춰 너비 계산
    const logoHeight = Math.min(width, height) * 0.10
    const logoWidth = logoHeight * svgAspectRatio
    
    console.log(`📐 돌핀인캘리 AI 로고 비율 계산: 원본 비율 ${svgAspectRatio.toFixed(2)}, 크기 ${logoWidth.toFixed(0)}x${logoHeight.toFixed(0)}`)
    
    // SVG를 PNG로 변환하여 원래 비율 유지 (고품질 렌더링)
    const logoBuffer = await sharp(Buffer.from(logoSvg))
      .resize(Math.round(logoWidth), Math.round(logoHeight), {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 } // 투명 배경
      })
      .png({ 
        quality: 90,
        compressionLevel: 6
      })
      .toBuffer()
    
    // 오른쪽 아래에 로고 합성 (여백을 충분히 확보)
    const padding = logoHeight * 0.3 // 여백을 늘려서 잘림 방지
    let logoX = Math.round(width - logoWidth - padding)
    let logoY = Math.round(height - logoHeight - padding)
    
    // 경계 검사 - 로고가 이미지 범위를 벗어나지 않도록 보정
    logoX = Math.max(0, Math.min(logoX, width - logoWidth))
    logoY = Math.max(0, Math.min(logoY, height - logoHeight))
    
    console.log(`🐬 돌핀인캘리 AI 로고 합성 중: 위치(${logoX}, ${logoY}), 크기(${logoWidth.toFixed(0)}x${logoHeight.toFixed(0)}), 이미지크기(${width}x${height})`)
    
    const result = await image
      .composite([{
        input: logoBuffer,
        left: logoX,
        top: logoY,
        blend: 'over' // 투명도 지원
      }])
      .png() // 원본 품질 유지를 위해 PNG로 변경
      .toBuffer()
    
    console.log('✅ 돌핀인캘리 AI 로고 합성 완료')
    return result
    
  } catch (error) {
    console.log('⚠️ 돌핀인캘리 AI 로고 합성 실패, 원본 이미지 반환:', error)
    return imageBuffer
  }
}

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
        stylePrompt = "이 사진은 간단한 낙서를 카메라로 찍은 사진입니다. 간단한 낙서를 매우 상세하고 현실세계의 이미지로 변환해주세요. 종이안의 낙서를 분석해서 실제 오브젝트로 처리해야합니다. 종이를 잡은 손가락등 외부 환경은 제외해야함 아웃풋 이미지는 종이내부것을 처리한 전체화면"
        break
      case "cartoon":
        stylePrompt = "이 낙서를 부드러운 선과 밝은 색상, 매력적인 캐릭터 디자인을 가진 생동감 넘치고 귀여운 만화 일러스트로 변환해주세요. 표현력 있는 특징을 추가하고 전문 애니메이션 스틸처럼 보이게 만들어주세요.종이안의 낙서를 분석해서 처리해야합니다. 종이를 잡은 손가락등 외부 환경은 제외해야함 아웃풋 이미지는 종이내부것을 처리한 전체화면"
        break
      case "3d":
        stylePrompt = "이 낙서를 사실적인 재질과 적절한 조명, 그림자, 깊이감을 가진 고품질 3D 렌더링 모델로 변환해주세요. 매끄러운 표면과 정확한 비율을 가진 전문적인 3D 시각화처럼 보이게 만들어주세요. 종이안의 낙서를 분석해서  처리해야합니다. 종이를 잡은 손가락등 외부 환경은 제외해야함 아웃풋 이미지는 종이내부것을 처리한 전체화면"
        break
      case "painting":
        stylePrompt = "이 낙서를 보이는 붓터치와 풍부한 색상 팔레트, 예술적인 구성을 가진 아름다운 유화로 변환해주세요. 회화적 스타일로 원래 개념을 유지하면서 질감과 깊이를 추가해주세요. 종이안의 낙서를 분석해서 처리해야합니다. 종이를 잡은 손가락등 외부 환경은 제외해야함 아웃풋 이미지는 종이내부것을 처리한 전체화면"
        break
      case "digital-art":
        stylePrompt = "이 낙서를 깔끔한 선과 생동감 있는 색상, 전문적인 마감을 가진 현대적인 디지털 아트워크로 변환해주세요. 부드러운 그라데이션과 세련된 외관을 가진 현대적 디지털 아트 기법을 사용해주세요. 종이안의 낙서를 분석해서 실제 오브젝트로 처리해야합니다. 종이를 잡은 손가락등 외부 환경은 제외해야함 아웃풋 이미지는 종이내부것을 처리한 전체화면"
        break
      case "sketch":
        stylePrompt = "이 낙서를 적절한 음영과 질감, 예술적 기법을 가진 세련되고 상세한 연필 스케치로 변환해주세요. 깔끔한 선과 깊이감을 가진 전문적인 일러스트레이션처럼 보이게 만들어주세요. 종이안의 낙서를 분석해서 실제 오브젝트로 처리해야합니다. 종이를 잡은 손가락등 외부 환경은 제외해야함 아웃풋 이미지는 종이내부것을 처리한 전체화면"
        break
      default:
        stylePrompt = "이 낙서를 전문적인 품질로 상세하고 세련된 이미지로 변환해주세요. 적절한 구성과 시각적 매력으로 향상시키면서 원래 개념을 유지해주세요."
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
    console.log("📋 API 설정:", { model: "gpt-image-1", size: "1536x1024", quality: "low" })
    
    const result = await openai.images.edit({
      model: "gpt-image-1",
      image: imageFile,
      prompt: stylePrompt,
      n: 1,
      size: "1536x1024",
      quality: "low", // 최고 품질로 변경
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
      // URL로 받은 경우 - 이미지를 다운로드하여 로고 합성 후 Storage에 업로드
      console.log("📥 OpenAI에서 받은 이미지 URL 다운로드 중...")
      const imageResponse = await fetch(imageData.url)
      const arrayBuffer = await imageResponse.arrayBuffer()
      let downloadedImageBuffer: Buffer = Buffer.from(arrayBuffer)
      
      // 돌핀인캘리 AI 로고 합성
      console.log("🐬 돌핀인캘리 AI 로고 합성 진행")
      downloadedImageBuffer = await addDolphinAILogo(downloadedImageBuffer)
      
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
      // Base64로 받은 경우 - 로고 합성 후 Storage에 업로드
      console.log("📥 OpenAI에서 받은 base64 이미지 처리 중...")
      let imageBuffer = base64ToBuffer(`data:image/png;base64,${imageData.b64_json}`)
      
      // 돌핀인캘리 AI 로고 합성
      console.log("🐬 돌핀인캘리 AI 로고 합성 진행")
      imageBuffer = await addDolphinAILogo(imageBuffer)
      
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
    console.log("🎉 낙서 현실화 완료!", {
      imageId: savedImageData.id,
      imageUrl: finalImageUrl.substring(0, 100) + "...",
      isBase64: finalImageUrl.startsWith("data:"),
      urlLength: finalImageUrl.length,
      timestamp: new Date().toISOString()
    })
    
    return NextResponse.json({
      success: true,
      imageUrl: finalImageUrl,
      imageId: savedImageData.id,
      debug: {
        timestamp: new Date().toISOString(),
        isBase64: finalImageUrl.startsWith("data:"),
        urlLength: finalImageUrl.length,
        urlPreview: finalImageUrl.substring(0, 100) + "..."
      }
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
