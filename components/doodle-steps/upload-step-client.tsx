"use client"

import dynamic from 'next/dynamic'

const UploadStepComponent = dynamic(() => import('./upload-step').then(mod => ({ default: mod.UploadStep })), {
  ssr: false,
  loading: () => (
    <div className="flex justify-center items-center py-8">
      <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
})

export function UploadStep(props: any) {
  return <UploadStepComponent {...props} />
} 