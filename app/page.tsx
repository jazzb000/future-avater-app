import { Wizard } from "@/components/wizard"

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-pink-100 via-yellow-100 to-blue-100 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-5xl font-bold text-purple-600 mb-2 font-display">미래의 나</h1>
          <p className="text-lg text-purple-500">내가 커서 되고 싶은 직업을 상상해보세요!</p>
        </div>

        <Wizard />
      </div>
    </main>
  )
}
