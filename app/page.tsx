import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Sparkles, Pencil, ArrowRight } from "lucide-react"

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-100 via-purple-100 to-pink-100 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* 헤더 */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-800 mb-4 font-display">
            돌핀인캘리 AI
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            AI로 상상하는 미래와 창작하는 현실을 경험해보세요
          </p>
        </div>

        {/* 서비스 선택 카드 */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* 미래의 나 */}
          <Card className="group hover:shadow-2xl transition-all duration-300 border-2 hover:border-purple-300 bg-white/80 backdrop-blur-sm">
            <CardHeader className="text-center pb-4">
              <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                <Sparkles className="h-8 w-8 text-white" />
              </div>
              <CardTitle className="text-2xl font-bold text-purple-600 font-display">
                시간버스
              </CardTitle>
              <CardDescription className="text-gray-600">
                다양한 나이의 나를 만나보세요!
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-gray-700 mb-6">
                AI가 당신의 사진을 분석하여 다양한 나이의 모습으로 변환해드립니다. 
                2살부터 10대까지, 성인도 가능합니다!
              </p>
              <Link href="/future-me">
                <Button className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-full group-hover:scale-105 transition-transform duration-300">
                  시작하기
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* 낙서 현실화 */}
          <Card className="group hover:shadow-2xl transition-all duration-300 border-2 hover:border-teal-300 bg-white/80 backdrop-blur-sm">
            <CardHeader className="text-center pb-4">
              <div className="w-16 h-16 bg-gradient-to-r from-teal-500 to-green-500 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                <Pencil className="h-8 w-8 text-white" />
              </div>
              <CardTitle className="text-2xl font-bold text-teal-600 font-display">
                낙서 현실화
              </CardTitle>
              <CardDescription className="text-gray-600">
                당신의 낙서를 현실로 만들어보세요!
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-gray-700 mb-6">
                간단한 낙서나 그림을 AI가 분석하여 현실적인 이미지로 변환해드립니다. 
                창작의 즐거움을 경험해보세요!
              </p>
              <Link href="/doodle-to-reality">
                <Button className="w-full bg-gradient-to-r from-teal-500 to-green-500 hover:from-teal-600 hover:to-green-600 text-white rounded-full group-hover:scale-105 transition-transform duration-300">
                  시작하기
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* 하단 설명 */}
        <div className="text-center mt-12">
          <p className="text-gray-500 text-sm">
          © 2023 Dolphin In Cali. All rights reserved.
          </p>
        </div>
      </div>
    </main>
  )
}