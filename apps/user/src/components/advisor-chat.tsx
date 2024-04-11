import { AdvisorAgent } from "@ai/agents/advisor/schema"
import { User } from "@repo/db"
import { HydratedStudentProfile } from "@repo/graph/types"

import { MdxContent } from "./mdxContent"

export const AdvisorMessageBody = ({
  advisor_output
}: {
  advisor_output: AdvisorAgent["advisor_output"]
  studentProfile: HydratedStudentProfile
  setStudentProfile: (profile: HydratedStudentProfile) => void
  student: User
}) => {
  return (
    <>
      <MdxContent content={advisor_output.response} />
      <small className="text-gray-500">
        {advisor_output.actions?.map(action => action.type).join(", ")}
      </small>

      <div>{JSON.stringify(advisor_output, null, 2)}</div>
    </>
  )
}
