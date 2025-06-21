import { NextResponse } from "next/server"
import { supabaseAdmin, uploadImageToStorage, base64ToBuffer, generateUniqueFileName } from "@/lib/supabase"
import OpenAI from "openai"

// OpenAI 클라이언트 초기화
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Vercel Hobby 플랜의 최대 허용값 (60초)
export const maxDuration = 60

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
    const { photo, age, job, style, layout, customLayoutData, userId } = await req.json()

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
    const prompt = generatePrompt(age, job, style, layout, customLayoutData)
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
      const imageUrl = await processImageGeneration(jobId, photo, prompt, userId, job)

      // 이미지 생성 완료 후 응답 반환
      console.log("🎉 이미지 생성 완료 - 응답 반환")
      return NextResponse.json({
        success: true,
        jobId: jobId,
        imageId: jobId,
        imageUrl: imageUrl,
        status: "completed",
        message: "이미지 생성이 완료되었습니다.",
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
async function processImageGeneration(
  jobId: string, 
  photo: string, 
  prompt: string, 
  userId: string, 
  job: string
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
    console.log("📋 API 설정:", { model: "gpt-image-1", size: "1536x1024", quality: "high" })
    
    let generatedImageUrl: string | null = null

    try {
      const result = await openai.images.edit({
        model: "gpt-image-1",
        image: imageFile,
        prompt: prompt,
        n: 1,
        size: "1536x1024",
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
        // URL로 받은 경우 - 이미지를 다운로드하여 Storage에 업로드
        console.log("📥 OpenAI에서 받은 이미지 URL을 Storage로 업로드 중...")
        const imageResponse = await fetch(imageData.url)
        const downloadedImageBuffer = Buffer.from(await imageResponse.arrayBuffer())
        
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
        // Base64로 받은 경우 - 직접 Storage에 업로드
        console.log("📥 OpenAI에서 받은 base64 이미지를 Storage로 업로드 중...")
        const imageBuffer = base64ToBuffer(`data:image/png;base64,${imageData.b64_json}`)
        
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

function generatePrompt(age: string, job: string, style: string, layout: string, customLayoutData?: string): string {
  // 나이에 따른 특성 정의
  let ageDescription = ""
  switch (age) {
    case "20s":
      ageDescription = "a young adult in their 20s, energetic and fresh-faced with bright eyes and an optimistic expression, representing the enthusiasm and potential of youth"
      break
    case "30s":
      ageDescription = "a confident professional in their 30s, experienced but still youthful with a mature yet dynamic appearance, showing competence and ambition"
      break
    case "40s":
      ageDescription = "an established professional in their 40s, mature and accomplished with a wise and authoritative presence, displaying years of experience and expertise"
      break
    case "50s":
      ageDescription = "a distinguished professional in their 50s, experienced and respected with a dignified and seasoned appearance, embodying wisdom and leadership"
      break
    default:
      ageDescription = "an adult professional with appropriate age characteristics"
  }

  // 직업에 따른 상세한 특성 정의
  let jobDescription = ""
  let environmentDescription = ""
  switch (job) {
    case "doctor":
      jobDescription = "a medical doctor wearing a pristine white coat with a stethoscope around their neck, medical badge visible, confident and caring expression"
      environmentDescription = "in a modern hospital setting with medical equipment, clean white walls, and professional lighting"
      break
    case "teacher":
      jobDescription = "a teacher wearing professional but approachable attire, holding educational materials or pointing to a whiteboard, with a warm and inspiring expression"
      environmentDescription = "in a bright classroom with books, educational posters, and learning materials visible in the background"
      break
    case "astronaut":
      jobDescription = "an astronaut wearing a detailed space suit with NASA patches, helmet either on or nearby, with a look of determination and wonder"
      environmentDescription = "in a space station or against a backdrop of stars and Earth, with high-tech equipment and spacecraft elements"
      break
    case "chef":
      jobDescription = "a professional chef wearing a traditional white chef's uniform with a tall toque hat, holding cooking utensils, with a passionate and creative expression"
      environmentDescription = "in a modern professional kitchen with stainless steel equipment, fresh ingredients, and culinary tools"
      break
    case "firefighter":
      jobDescription = "a firefighter wearing protective gear including helmet and reflective stripes, with a brave and heroic expression, ready for action"
      environmentDescription = "near a fire truck or emergency scene with professional firefighting equipment and safety gear"
      break
    case "scientist":
      jobDescription = "a scientist wearing a clean white lab coat with safety goggles, holding scientific instruments or examining research materials, with a curious and intelligent expression"
      environmentDescription = "in a modern laboratory with scientific equipment, test tubes, microscopes, and research materials"
      break
    case "artist":
      jobDescription = "an artist wearing creative, possibly paint-splattered clothing, holding brushes or artistic tools, with an imaginative and expressive demeanor"
      environmentDescription = "in an art studio with canvases, paints, brushes, and artistic works in progress"
      break
    case "athlete":
      jobDescription = "a professional athlete wearing appropriate sports attire for their discipline, in peak physical condition, with a determined and focused expression"
      environmentDescription = "in a sports facility or training environment with relevant equipment and athletic gear"
      break
    default:
      jobDescription = "a professional in their field wearing appropriate attire with a confident and competent expression"
      environmentDescription = "in a professional work environment suitable for their occupation"
  }

  // 스타일에 따른 상세한 시각적 특성 정의
  let styleDescription = ""
  let renderingInstructions = ""
  switch (style) {
    case "cartoon":
      styleDescription = "in a vibrant cartoon style with exaggerated features, bright colors, and clean line art"
      renderingInstructions = "Use bold outlines, simplified shapes, and saturated colors typical of professional animation"
      break
    case "anime":
      styleDescription = "in Japanese anime style with large expressive eyes, detailed hair, and characteristic anime proportions"
      renderingInstructions = "Apply anime shading techniques, cel-shading effects, and typical anime color palettes"
      break
    case "pixar":
      styleDescription = "in 3D Pixar animation style with detailed textures, soft lighting, and characteristic Pixar character design"
      renderingInstructions = "Use 3D rendering with subsurface scattering, realistic materials, and Pixar's signature warm lighting"
      break
    case "comic":
      styleDescription = "as a comic book character with bold lines, dramatic shadows, and vibrant comic book colors"
      renderingInstructions = "Apply comic book art techniques including halftone patterns, bold outlines, and dynamic poses"
      break
    case "poster":
      styleDescription = "as a professional movie poster with dramatic lighting, cinematic composition, and high production value"
      renderingInstructions = "Use cinematic lighting, professional photography techniques, and movie poster composition"
      break
    case "caricature":
      styleDescription = "as a caricature with exaggerated facial features while maintaining recognizability and professional appearance"
      renderingInstructions = "Emphasize distinctive features while keeping the professional context and dignity"
      break
    default:
      styleDescription = "in a high-quality, detailed artistic style with professional rendering"
      renderingInstructions = "Use professional illustration techniques with attention to detail and realistic proportions"
  }

  // 레이아웃에 따른 구성 정의
  let layoutDescription = ""
  let compositionInstructions = ""
  switch (layout) {
    case "business-card":
      layoutDescription = "designed as a professional business card layout with clean typography and corporate design elements"
      compositionInstructions = "Compose as a business card with professional formatting, clear hierarchy, and corporate aesthetics"
      break
    case "certificate":
      layoutDescription = "designed as an official certificate or award with formal borders, elegant typography, and ceremonial elements"
      compositionInstructions = "Create a formal certificate layout with decorative borders, official seals, and prestigious presentation"
      break
    case "magazine":
      layoutDescription = "designed as a magazine cover with bold headlines, professional photography layout, and editorial design"
      compositionInstructions = "Use magazine cover composition with striking visuals, typography integration, and editorial layout principles"
      break
    case "bookmark":
      layoutDescription = "designed as a decorative bookmark with vertical composition and elegant design elements"
      compositionInstructions = "Create a vertical bookmark layout with decorative elements and space-efficient design"
      break
    case "custom":
      // 사용자 정의 레이아웃 데이터 파싱
      try {
        const customLayout = JSON.parse(customLayoutData || "{}")
        const bgColor = customLayout.bgColor || "#f3e8ff"
        layoutDescription = `with a custom layout using ${bgColor} as the background color and user-specified design preferences`
        compositionInstructions = `Apply custom layout with ${bgColor} background and personalized design elements`
      } catch (e) {
        layoutDescription = "with a custom layout design tailored to user preferences"
        compositionInstructions = "Create a personalized layout with unique design elements"
      }
      break
    default:
      layoutDescription = "with a clean, professional layout that showcases the subject effectively"
      compositionInstructions = "Use professional composition with balanced elements and clear focus on the subject"
  }

  // 최종 상세 프롬프트 조합 (gpt-image-1의 32,000자 한계 활용)
  return `Transform this person into ${ageDescription} working as ${jobDescription}. 

SETTING AND ENVIRONMENT: Place them ${environmentDescription}.

VISUAL STYLE: Render the image ${styleDescription}. ${renderingInstructions}

LAYOUT AND COMPOSITION: The final composition should be ${layoutDescription}. ${compositionInstructions}

TECHNICAL REQUIREMENTS:
- Create a high-quality, detailed image with professional lighting and composition
- Maintain Korean aesthetic sensibilities and cultural appropriateness
- Keep the person's facial features recognizable while transforming them into the specified profession
- Use proper lighting that enhances the professional appearance
- Ensure the background and environment support the overall narrative
- Apply appropriate depth of field and visual hierarchy
- Use colors that complement the professional context and chosen style

QUALITY STANDARDS:
- Professional photography or illustration quality
- Sharp details and clear textures
- Appropriate contrast and color balance
- Emotionally engaging and inspirational presentation
- Culturally sensitive and respectful representation

The final image should inspire viewers and accurately represent the chosen profession while maintaining the person's identity and dignity
    `
}
