import { CannotMoveReason } from "@graph/schedule"
import {
  Toast,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport
} from "@ui/components/ui/toast"

interface ScheduleChangeToastProps {
  open: boolean
  cannotMoveReason?: CannotMoveReason
  onOpenChange: (open: boolean) => void
}

const getReadableReason = (cannotMoveReason?: CannotMoveReason) => {
  if (cannotMoveReason === undefined) {
    return ""
  }

  const reason = cannotMoveReason.reason.type

  if (reason == "dependent") {
    return "The course is a dependent of another course."
  }
  if (reason == "full") {
    return "The semester is full."
  }
  if (reason == "prereq") {
    return "The course is a prerequisite for another course."
  }
}

export default function ScheduleChangeToast({
  open,
  cannotMoveReason,
  onOpenChange
}: ScheduleChangeToastProps) {
  return (
    <>
      <ToastProvider>
        <Toast
          className="block space-x-0 max-w-[30rem] p-2 rounded-lg shadow-lg border-2 border-red-300 text-gray-800 bg-background"
          open={open}
          onOpenChange={onOpenChange}
        >
          <ToastTitle className="grid-area-title font-medium text-slate-800 text-sm">
            Invalid Schedule Change
          </ToastTitle>
          <ToastDescription asChild>
            <p className="text-xs">{getReadableReason(cannotMoveReason)}</p>
          </ToastDescription>
        </Toast>
        <ToastViewport className="absolute top-4 left-[calc(50vw-12rem)] w-[24rem] p-4 m-auto" />
      </ToastProvider>
    </>
  )
}
