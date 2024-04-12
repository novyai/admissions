import {
  Toast,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport
} from "@ui/components/ui/toast"

interface ScheduleChangeToastProps {
  open: boolean
  content: ScheduleToastContent
  onOpenChange: (open: boolean) => void
}

export interface ScheduleToastContent {
  title: string
  descr: string
}

export default function ScheduleChangeToast({
  open,
  content,
  onOpenChange
}: ScheduleChangeToastProps) {
  return (
    <>
      <ToastProvider swipeDirection="right">
        <Toast
          className="z-10 absolute top-4 left-4 max-w-[30rem] p-2 bg-white rounded-lg shadow-lg border-2 border-red-300 text-gray-800"
          open={open}
          onOpenChange={onOpenChange}
        >
          <ToastTitle className="grid-area-title font-medium text-slate-800 text-sm">
            {content.title}
          </ToastTitle>
          <ToastDescription asChild>
            <p className="text-xs">{content.descr}</p>
          </ToastDescription>
        </Toast>
        <ToastViewport className="flex flex-col gap-2 w-fit  m-0 p-4" />
      </ToastProvider>
    </>
  )
}
