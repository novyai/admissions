import { CannotMoveReason } from "@graph/schedule"
import {
  Toast,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport
} from "@ui/components/ui/toast"
import { Node } from "reactflow"

import { GetNode } from "../semester-dag"
import { isCourseNode } from "../semester-dag/graph-to-node-utils"
import { CourseNodeData } from "../semester-dag/nodeTypes/course-node"

type ScheduleChangeToastProps = {
  open: boolean
  cannotMoveReason?: CannotMoveReason
  onOpenChange: (open: boolean) => void
  getNode: GetNode
}

const getReadableReason = (getNode: GetNode, cannotMoveReason?: CannotMoveReason) => {
  if (cannotMoveReason === undefined) {
    return ""
  }

  const { type } = cannotMoveReason.reason

  if (type == "dependent" || type == "prerequisite") {
    const n = getNode(cannotMoveReason.reason.courseId[0])
    if (n && isCourseNode(n as Node)) {
      const d = n.data as CourseNodeData
      return `The course is a ${type} of ${d.name}`
    }
    return `The course is a ${type} of another course`
  }
  if (type == "full") {
    return "The semester is full."
  }
  if (type == "semester-already-taken") {
    return `You've already taken this semester.`
  }
}

export default function ScheduleChangeToast({
  open,
  cannotMoveReason,
  onOpenChange,
  getNode
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
            <p className="text-xs">{getReadableReason(getNode, cannotMoveReason)}</p>
          </ToastDescription>
        </Toast>
        <ToastViewport className="absolute top-4 left-[calc(50vw-12rem)] w-[24rem] p-4 m-auto" />
      </ToastProvider>
    </>
  )
}
