import { NextResponse } from "next/server"
import { supabaseAdmin, uploadImageToStorage, base64ToBuffer, generateUniqueFileName } from "@/lib/supabase"
import OpenAI from "openai"
import sharp from "sharp"
import fs from "fs/promises"
import path from "path"


// OpenAI 클라이언트 초기화
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// 최대 실행 시간 300초 설정
export const maxDuration = 300

// 테스트 모드 설정 (개발 및 테스트 시 true로 설정)
const TEST_MODE = false

// 테스트용 이미지 URL (OpenAI API 호출이 실패할 경우 사용)
const TEST_IMAGE_URLS = {
  doctor: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?q=80&w=1470&auto=format&fit=crop",
  teacher: "https://images.unsplash.com/photo-1577896851231-70ef18881754?q=80&w=1470&auto=format&fit=crop",
  astronaut: "https://images.unsplash.com/photo-1614728894747-a83421e2b9c9?q=80&w=1374&auto=format&fit=crop",
  chef: "https://images.unsplash.com/photo-1577219491135-ce391730fb2c?q=80&w=1374&auto=format&fit=crop",
  firefighter: "https://images.unsplash.com/photo-1523419409543-a5e549c1faa1?q=80&w=1373&auto=format&fit=crop",
  scientist: "https://images.unsplash.com/photo-1507413245164-6160d8298b31?q=80&w=1470&auto=format&fit=crop",
  artist: "https://images.unsplash.com/photo-1536924430914-91f9e2041b83?q=80&w=1470&auto=format&fit=crop",
  athlete: "https://images.unsplash.com/photo-1517649763962-0c623066013b?q=80&w=1470&auto=format&fit=crop",
  default: "https://images.unsplash.com/photo-1560250097-0b93528c311a?q=80&w=1374&auto=format&fit=crop",
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Origin": "*",
    },
  })
}

export async function POST(req: Request) {
  try {
    console.log("🚀 미래의 나 API 호출 시작")
    const { photo, age, job, style, layout, userId } = await req.json()

    if (!photo || !age || !job || !style || !layout || !userId) {
      console.log("❌ 필수 항목 누락:", { 
        hasPhoto: !!photo, 
        hasAge: !!age, 
        hasJob: !!job, 
        hasStyle: !!style, 
        hasLayout: !!layout, 
        hasUserId: !!userId 
      })
      return NextResponse.json(
        {
          success: false,
          error: "필수 항목이 누락되었습니다",
        },
        { 
          status: 400,
          headers: {
            'Content-Type': 'application/json'
          }
        },
      )
    }

    console.log("✅ 요청 데이터 검증 완료")
    console.log("📊 요청 정보:", { age, job, style, layout, userId: userId.substring(0, 8) + "..." })

    // OpenAI API 키 확인
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        {
          success: false,
          error: "OpenAI API 키가 설정되지 않았습니다",
        },
        { 
          status: 500,
          headers: {
            'Content-Type': 'application/json'
          }
        },
      )
    }

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

    // 프롬프트 생성
    console.log("🎭 프롬프트 생성 중...")
    const prompt = generatePrompt(age, job, style, layout)
    console.log("✅ 프롬프트 생성 완료:", { promptLength: prompt.length, age, job, style, layout })

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

    // 즉시 데이터베이스에 작업 레코드 생성 (processing 상태)
    console.log("💾 작업 레코드 생성 중...")
    
    const insertData = {
      user_id: userId,
      job,
      age,
      style,
      layout,
      prompt: prompt,
      status: "processing",
      created_at: new Date().toISOString(),
    }
    
    console.log("📋 저장할 데이터:", { 
      user_id: userId.substring(0, 8) + "...", 
      job, 
      age, 
      style, 
      layout,
      status: "processing"
    })

    const { data: jobRecord, error: saveError } = await supabase
      .from("generated_images")
      .insert(insertData)
      .select("id")
      .single()

    if (saveError) {
      console.log("❌ 작업 레코드 생성 실패:", saveError.message)
      // 티켓 환불 시도
      try {
        await supabase.rpc("refund_ticket", { user_id_param: userId })
      } catch (refundError) {
        console.log("⚠️ 티켓 환불 실패:", refundError)
      }
      return NextResponse.json(
        {
          success: false,
          error: "작업 생성에 실패했습니다",
        },
        { status: 500 },
      )
    }

    const jobId = jobRecord.id
    console.log("✅ 작업 레코드 생성 완료:", { jobId })

    try {
      // 동기적으로 이미지 생성
      const imageUrl = await processImageGeneration(jobId, photo, prompt, userId, job, layout)

      // 이미지 생성 완료 후 응답 반환
      console.log("🎉 이미지 생성 완료 - 응답 반환:", {
        jobId,
        imageUrl: imageUrl.substring(0, 100) + "...",
        isBase64: imageUrl.startsWith("data:"),
        urlLength: imageUrl.length,
        timestamp: new Date().toISOString()
      })
      
      return NextResponse.json({
        success: true,
        jobId: jobId,
        imageId: jobId,
        imageUrl: imageUrl,
        status: "completed",
        message: "이미지 생성이 완료되었습니다.",
        debug: {
          timestamp: new Date().toISOString(),
          isBase64: imageUrl.startsWith("data:"),
          urlLength: imageUrl.length,
          urlPreview: imageUrl.substring(0, 100) + "..."
        }
      })
    } catch (imageError: any) {
      console.error("이미지 생성 실패:", imageError)
      
      return NextResponse.json(
        {
          success: false,
          error: `이미지 생성에 실패했습니다: ${imageError.message || "알 수 없는 오류"}`,
        },
        { 
          status: 500,
          headers: {
            'Content-Type': 'application/json'
          }
        },
      )
    }

  } catch (error: any) {
    console.error("이미지 생성 요청 처리 중 오류:", error)
    
    return NextResponse.json(
      {
        success: false,
        error: `이미지 생성 요청 처리 중 오류가 발생했습니다: ${error.message || "알 수 없는 오류"}`,
      },
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      },
    )
  }
}

// 이미지 생성 함수
// 한국잡월드 로고 합성 함수




async function addKoreaJobWorldLogo(imageBuffer: Buffer): Promise<Buffer> {
  try {
    // 로고 파일 경로
    const logoPath = path.join(process.cwd(), 'public', '한국잡월드.svg')
    
    // SVG 파일 읽기
    const logoSvg = await fs.readFile(logoPath, 'utf-8')
    
    // 이미지 정보 가져오기
    const image = sharp(imageBuffer)
    const { width, height } = await image.metadata()
    
    if (!width || !height || width < 100 || height < 100) {
      throw new Error(`이미지 크기가 유효하지 않습니다: ${width}x${height}`)
    }
    
    // SVG의 원래 비율 계산 (viewBox에서 894.47179 x 300.00003)
    const svgAspectRatio = 894.47179 / 300.00003 // 약 2.98
    
    // 로고 높이를 이미지 크기의 10%로 설정하고, 원래 비율에 맞춰 너비 계산
    const logoHeight = Math.min(width, height) * 0.10
    const logoWidth = logoHeight * svgAspectRatio
    
    console.log(`📐 로고 비율 계산: 원본 비율 ${svgAspectRatio.toFixed(2)}, 크기 ${logoWidth.toFixed(0)}x${logoHeight.toFixed(0)}`)
    
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
    
    console.log(`🏢 한국잡월드 로고 합성 중: 위치(${logoX}, ${logoY}), 크기(${logoWidth.toFixed(0)}x${logoHeight.toFixed(0)}), 이미지크기(${width}x${height})`)
    
    const result = await image
      .composite([{
        input: logoBuffer,
        left: logoX,
        top: logoY,
        blend: 'over' // 투명도 지원
      }])
      .png() // 원본 품질 유지를 위해 PNG로 변경
      .toBuffer()
    
    console.log('✅ 한국잡월드 로고 합성 완료')
    return result
    
  } catch (error) {
    console.log('⚠️ 로고 합성 실패, 원본 이미지 반환:', error)
    return imageBuffer
  }
}

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

async function processImageGeneration(
  jobId: string, 
  photo: string, 
  prompt: string, 
  userId: string, 
  job: string,
  layout?: string
): Promise<string> {
  const supabase = supabaseAdmin()
  
  try {
    console.log("🤖 백그라운드 이미지 생성 시작:", { jobId })

    // Base64 데이터 URL에서 이미지 데이터 추출
    console.log("🖼️ 이미지 데이터 처리 중...")
    const base64Data = photo.split(",")[1]
    const imageBuffer = Buffer.from(base64Data, "base64")

    // Buffer를 File 객체로 변환 (OpenAI SDK 호환)
    const imageFile = new File([imageBuffer], "photo.png", { type: "image/png" })

    console.log("✅ 이미지 파일 생성 완료:", { size: imageBuffer.length, type: "image/png" })

    // OpenAI API를 사용하여 이미지 생성
    console.log("🤖 OpenAI API 호출 시작...")
    console.log("📋 API 설정:", { model: "gpt-image-1", size: "1024x1536", quality: "high" })
    
    let generatedImageUrl: string | null = null

    try {
      const result = await openai.images.edit({
        model: "gpt-image-1",
        image: imageFile,
        prompt: prompt,
        n: 1,
        size: "1024x1536",
        quality: "high",
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

      if (imageData.url) {
        // URL로 받은 경우 - 이미지를 다운로드
        console.log("📥 OpenAI에서 받은 이미지 URL 다운로드 중...")
        const imageResponse = await fetch(imageData.url)
        const arrayBuffer = await imageResponse.arrayBuffer()
        let downloadedImageBuffer: Buffer = Buffer.from(new Uint8Array(arrayBuffer))
        
        // 한국잡월드 레이아웃인 경우 로고 합성
        if (layout === "korea-job-world") {
          console.log("🏢 한국잡월드 레이아웃 감지 - 로고 합성 진행")
          downloadedImageBuffer = await addKoreaJobWorldLogo(downloadedImageBuffer)
        }
        
        // 돌핀인캘리 AI 레이아웃인 경우 로고 합성
        if (layout === "dolphin-ai") {
          console.log("🐬 돌핀인캘리 AI 레이아웃 감지 - 로고 합성 진행")
          downloadedImageBuffer = await addDolphinAILogo(downloadedImageBuffer)
        }
        

        
        // Storage에 업로드
        const fileName = generateUniqueFileName(userId, 'generated')
        console.log("💾 Storage 업로드 중:", { fileName })
        const { url: storageUrl, error: uploadError } = await uploadImageToStorage(downloadedImageBuffer, fileName)
        
        if (uploadError) {
          console.log("❌ Storage 업로드 실패:", uploadError)
          throw new Error(`Storage 업로드 실패: ${uploadError}`)
        }
        
        generatedImageUrl = storageUrl
        console.log("✅ Storage 업로드 완료:", { url: storageUrl?.substring(0, 50) + "..." })
      } else if (imageData.b64_json) {
        // Base64로 받은 경우 - 이미지 처리
        console.log("📥 OpenAI에서 받은 base64 이미지 처리 중...")
        let imageBuffer = base64ToBuffer(`data:image/png;base64,${imageData.b64_json}`)
        
        // 한국잡월드 레이아웃인 경우 로고 합성
        if (layout === "korea-job-world") {
          console.log("🏢 한국잡월드 레이아웃 감지 - 로고 합성 진행")
          imageBuffer = await addKoreaJobWorldLogo(imageBuffer)
        }
        
        // 돌핀인캘리 AI 레이아웃인 경우 로고 합성
        if (layout === "dolphin-ai") {
          console.log("🐬 돌핀인캘리 AI 레이아웃 감지 - 로고 합성 진행")
          imageBuffer = await addDolphinAILogo(imageBuffer)
        }
        

        
        // Storage에 업로드
        const fileName = generateUniqueFileName(userId, 'generated')
        console.log("💾 Storage 업로드 중:", { fileName })
        const { url: storageUrl, error: uploadError } = await uploadImageToStorage(imageBuffer, fileName)
        
        if (uploadError) {
          console.log("❌ Storage 업로드 실패:", uploadError)
          throw new Error(`Storage 업로드 실패: ${uploadError}`)
        }
        
        generatedImageUrl = storageUrl
        console.log("✅ Storage 업로드 완료:", { url: storageUrl?.substring(0, 50) + "..." })
      }
    } catch (apiError: any) {
      console.error("❌ OpenAI API 오류:", apiError)

      // 대체 이미지 URL 사용
      console.log("⚠️ OpenAI API 오류 발생, 대체 이미지 사용")
      generatedImageUrl = TEST_IMAGE_URLS[job as keyof typeof TEST_IMAGE_URLS] || TEST_IMAGE_URLS.default
    }

    if (!generatedImageUrl) {
      throw new Error("이미지 생성에 실패했습니다")
    }

    // 데이터베이스 업데이트 (완료 상태)
    console.log("💾 작업 완료 상태로 업데이트 중...")
    const { error: updateError } = await supabase
      .from("generated_images")
      .update({
        image_url: generatedImageUrl,
        status: "completed",
        completed_at: new Date().toISOString(),
      })
      .eq("id", jobId)

    if (updateError) {
      console.log("❌ 상태 업데이트 실패:", updateError.message)
      throw updateError
    }

    console.log("🎉 이미지 생성 완료:", { jobId })
    return generatedImageUrl

  } catch (error: any) {
    console.error("❌ 이미지 생성 실패:", error)
    
    // 오류 상태로 업데이트
    try {
      await supabase
        .from("generated_images")
        .update({
          status: "error",
          error_message: error.message || "알 수 없는 오류",
          completed_at: new Date().toISOString(),
        })
        .eq("id", jobId)
    } catch (dbError) {
      console.error("❌ DB 상태 업데이트 실패:", dbError)
    }

    // 티켓 환불
    try {
      await supabase.rpc("refund_ticket", { user_id_param: userId })
    } catch (refundError) {
      console.error("❌ 티켓 환불 실패:", refundError)
    }

    throw error
  }
}

function generatePrompt(age: string, job: string, style: string, layout: string): string {
  // 나이에 따른 특성 정의
  let ageDescription = ""
  let faceAdjustment = ""
  switch (age) {
    case "2years":
      ageDescription = "2살 아기"
      faceAdjustment = ""
      break
    case "5years":
      ageDescription = "5살 어린이"
      faceAdjustment = ""
      break
    case "teen":
      ageDescription = "10대 청소년"
      faceAdjustment = ""
      break
    case "20s":
      ageDescription = "20대"
      faceAdjustment = ""
      break
    case "30s":
      ageDescription = "30대"
      faceAdjustment = ""
      break
    case "40s":
      ageDescription = "40대"
      faceAdjustment = ""
      break
    case "60s":
      ageDescription = "60대"
      faceAdjustment = ""
      break
    default:
      ageDescription = "적절한 연령대 특성을 가진 한국인"
      faceAdjustment = "자연스러운 얼굴 비율과 표정으로"
  }

  // 직업에 따른 상세한 특성 정의
  let jobDescription = ""
  let environmentDescription = ""
  switch (job) {
    case "none":
      jobDescription = "자연스러운 모습으로"
      environmentDescription = "편안하고 자연스러운 배경에서"
      break
    case "doctor":
      jobDescription = "의사"
      environmentDescription = "사진 배경이나 소품들이 의사 느낌나 보이는 얼굴 이미지를 해치지 않는 선에서"
      break
    case "teacher":
      jobDescription = "선생님"
      environmentDescription = "교사 느낌이 나는 소품들을 활용 얼굴 이미지를 해치지 않는 선에서"
      break
    case "astronaut":
      jobDescription = "우주비행사"
      environmentDescription = "우주정거장이나 별과 지구가 배경으로 보이는 첨단 장비와 우주선 요소들이 있는 곳에서"
      break
    case "chef":
      jobDescription = "요리사로"
      environmentDescription = ""
      break
    case "firefighter":
      jobDescription = "소방관"
      environmentDescription = "소방차나 응급 현장 근처에서 전문 소방 장비와 안전 장비가 있는 곳에서"
      break
    case "scientist":
      jobDescription = "과학자"
      environmentDescription = ""
      break
    case "artist":
      jobDescription = "상상력이 풍부하고 표현력이 뛰어난 모습의 예술가로"
      environmentDescription = "아트 스튜디오에서"
      break
    case "athlete":
      jobDescription = "운동선수로"
      environmentDescription = "관련 장비와 운동 기구가 있는 스포츠 시설이나 훈련 환경에서"
      break
    case "announcer":
      jobDescription = "아나운서"
      environmentDescription = "방송국 스튜디오나 뉴스 데스크에서 전문적인 조명과 카메라, 뉴스 세트가 배경으로 보이는"
      break
    default:
      jobDescription = "해당 분야에 적합한 복장을 입고 자신감 있고 능력 있는 표정의 전문직 종사자로"
      environmentDescription = "해당 직업에 적합한 전문적인 업무 환경에서"
  }

  // 스타일에 따른 상세한 시각적 특성 정의
  let styleDescription = ""
  let renderingInstructions = ""
  switch (style) {
    case "realistic":
      styleDescription = ""
      renderingInstructions = "자연스러운 조명과 사실적인 피부 질감"
      break
    case "cartoon":
      styleDescription = "선명한 만화 스타일로, 과장된 특징과 밝은 색상, 깔끔한 선화를 가진"
      renderingInstructions = "전문 애니메이션의 굵은 윤곽선, 단순화된 형태, 채도 높은 색상을 사용하여"
      break
    case "anime":
      styleDescription = "일본 애니메이션 스타일로, 크고 표현력 있는 눈과 상세한 머리카락, 특징적인 애니메 비율을 가진"
      renderingInstructions = "애니메 음영 기법과 셀 셰이딩 효과, 전형적인 애니메 색상 팔레트를 적용하여"
      break
    case "pixar":
      styleDescription = "픽사 3D 애니메이션 스타일로, 상세한 텍스처와 부드러운 조명, 특징적인 픽사 캐릭터 디자인을 가진"
      renderingInstructions = "서브서피스 스캐터링과 사실적인 재질, 픽사 특유의 따뜻한 조명으로 3D 렌더링하여"
      break
    case "comic":
      styleDescription = "만화책 캐릭터 스타일로, 굵은 선과 극적인 그림자, 선명한 만화책 색상을 가진"
      renderingInstructions = "하프톤 패턴과 굵은 윤곽선, 역동적인 포즈를 포함한 만화책 아트 기법을 적용하여"
      break
    case "poster":
      styleDescription = "전문적인 영화 포스터 스타일로, 극적인 조명과 영화적 구성, 높은 제작 가치를 가진"
      renderingInstructions = "영화적 조명과 전문 사진 기법, 영화 포스터 구성을 사용하여"
      break
    case "caricature":
      styleDescription = "캐리커쳐 스타일로, 과장된 얼굴 특징을 가지면서도 인식 가능하고 전문적인 외모를 유지하는"
      renderingInstructions = "전문적인 맥락과 품위를 유지하면서 특징적인 부분을 강조하여"
      break
    default:
      styleDescription = "고품질의 상세한 예술적 스타일로, 전문적인 렌더링을 가진"
      renderingInstructions = "디테일과 사실적인 비율에 주의를 기울여 전문적인 일러스트레이션 기법을 사용하여"
  }

  // 레이아웃에 따른 구성 정의
  let layoutDescription = ""
  let compositionInstructions = ""
  switch (layout) {

    
    case "korea-job-world":
      layoutDescription = ""
      compositionInstructions = ""
      break
    case "dolphin-ai":
      layoutDescription = ""
      compositionInstructions = ""
      break

    default:
      layoutDescription = "주제를 효과적으로 보여주는 깔끔하고 전문적인 레이아웃으로"
      compositionInstructions = "균형 잡힌 요소와 주제에 대한 명확한 초점을 가진 전문적인 구성을 사용하여"
  }

  // 최종 상세 프롬프트 조합 (gpt-image-1의 32,000자 한계 활용)
  return `이 사람을 ${ageDescription} ${jobDescription} 모습으로 변환해주세요.

환경 및 배경: ${environmentDescription} 배치해주세요.

시각적 스타일: ${styleDescription} 이미지로 렌더링해주세요. ${renderingInstructions} 렌더링해주세요.

레이아웃 및 구성: 최종 구성은 ${layoutDescription} 형태여야 합니다. ${compositionInstructions} 구성해주세요.


최종 이미지는 이사람의 고유한 얼굴특성은 변화하면 안되고 이러한 특성을 반영해서 제작해주되 내가 전송한 사진의 
얼굴이 여자라면 얼굴은 본 얼굴에서 나올수있는 부분으로 해줘 내가 전송한 사진의 얼굴이 남자라면 얼굴은 본 얼굴에서 나올수있는 최대한의 
얼굴특성에 맞게 만들어줘`
}
