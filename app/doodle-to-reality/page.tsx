import { DoodleWizard } from "@/components/doodle-wizard"

export default function DoodleToRealityPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-100 via-green-100 to-yellow-100 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-5xl font-bold text-teal-600 mb-2 font-display">낙서 현실화</h1>
          <p className="text-lg text-teal-500">내 낙서가 실제 이미지로 변신!</p>
        </div>

        <DoodleWizard />
      </div>
    </main>
  )
}
