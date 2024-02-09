import { Suspense } from "react"
import { getAllStudents } from "@/db/students"
import { Prisma } from "@db/client"
import { Loader2 } from "lucide-react"

import { StudentsTable } from "@/components/students-table"
import { Transcript } from "@/components/transcript"
import { TranscriptModal } from "@/components/transcript-modal"

export const revalidate = 0
export default async function Page({
  searchParams
}: {
  searchParams: {
    skip?: string
    take?: string
    q?: string
    orderBy?: Prisma.StudentFindManyArgs["orderBy"]
    showTranscript?: string
  }
}) {
  const { skip, take, q, orderBy, showTranscript } = searchParams
  const filters = q?.length
    ? {
        OR: [
          {
            user: {
              email: {
                contains: q
              }
            }
          },
          {
            user: {
              firstName: {
                contains: q
              }
            }
          },
          {
            user: {
              lastName: {
                contains: q
              }
            }
          }
        ]
      }
    : undefined

  const { students, total } = await getAllStudents({
    skip: parseInt(skip ?? "0"),
    take: parseInt(take ?? "50"),
    filters,
    orderBy
  })

  return (
    <>
      <div className="w-full h-full overflow-y-auto my-8 px-6">
        <h1 className="scroll-m-20 text-3xl font-extrabold tracking-tight">All Students</h1>
        <StudentsTable students={students} total={total} />
      </div>
      {showTranscript && (
        <Suspense
          fallback={
            <div className="h-screen w-screen fixed top-0 left-0 z-50 bg-background/60 backdrop-blur-md" />
          }
        >
          <TranscriptModal>
            <Suspense
              fallback={
                <div className="h-[30vh]">
                  <div className="h-full flex justify-center items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="">Loading...</span>
                  </div>
                </div>
              }
            >
              <Transcript studentId={showTranscript} />
            </Suspense>
          </TranscriptModal>
        </Suspense>
      )}
    </>
  )
}
