"use client"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"

interface JobStepProps {
  updateSelection: (key: string, value: string) => void
  currentJob: string | null
}

export function JobStep({ updateSelection, currentJob }: JobStepProps) {
  const jobs = [
    { value: "doctor", label: "의사", icon: "👨‍⚕️" },
    { value: "teacher", label: "선생님", icon: "👩‍🏫" },
    { value: "astronaut", label: "우주비행사", icon: "👨‍🚀" },
    { value: "chef", label: "요리사", icon: "👩‍🍳" },
    { value: "firefighter", label: "소방관", icon: "👨‍🚒" },
    { value: "scientist", label: "과학자", icon: "👩‍🔬" },
    { value: "artist", label: "예술가", icon: "👨‍🎨" },
    { value: "athlete", label: "운동선수", icon: "🏃‍♀️" },
  ]

  return (
    <div className="space-y-4">
      <p className="text-purple-500 font-medium">미래에 어떤 직업을 갖고 싶나요?</p>

      <RadioGroup
        value={currentJob || ""}
        onValueChange={(value) => updateSelection("job", value)}
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
      >
        {jobs.map((job) => (
          <div key={job.value}>
            <RadioGroupItem value={job.value} id={`job-${job.value}`} className="peer sr-only" />
            <Label
              htmlFor={`job-${job.value}`}
              className="flex flex-col items-center justify-center rounded-xl border-3 border-purple-200 bg-white p-4 hover:bg-purple-50 hover:border-purple-300 peer-data-[state=checked]:border-purple-500 peer-data-[state=checked]:bg-purple-100 [&:has([data-state=checked])]:border-purple-500 [&:has([data-state=checked])]:bg-purple-100 cursor-pointer transition-all"
            >
              <span className="text-5xl mb-2">{job.icon}</span>
              <span className="text-lg font-medium text-purple-700">{job.label}</span>
            </Label>
          </div>
        ))}
      </RadioGroup>
    </div>
  )
}
