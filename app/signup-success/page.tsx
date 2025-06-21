import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { CheckCircle } from "lucide-react"

export default function SignupSuccessPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-pink-100 via-yellow-100 to-blue-100 p-4">
      <Card className="w-full max-w-md border-4 border-purple-300 rounded-3xl">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <CheckCircle className="h-16 w-16 text-green-500" />
          </div>
          <CardTitle className="text-2xl font-bold text-purple-600 text-center">회원가입 완료!</CardTitle>
          <CardDescription className="text-center">
            이메일 주소로 확인 링크를 보냈습니다. 링크를 클릭하여 계정을 활성화해주세요.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-gray-600">이메일을 확인한 후 로그인하시면 미래의 나를 만들 수 있습니다.</p>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Link href="/login">
            <Button className="rounded-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white">
              로그인 페이지로 이동
            </Button>
          </Link>
        </CardFooter>
      </Card>
    </div>
  )
}
