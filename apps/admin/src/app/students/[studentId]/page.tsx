import { getStudentGPA, getTranscriptForStudent } from "@/db/students"

import { parseTermCode } from "@/lib/courses"
import { StudentCommand } from "@/components/student-cmd"
import { StudentSummary, TransferGradesTable, UniversityGradesTable } from "@/components/transcript"

export const revalidate = 0
export default async function Page({
	params
}: {
	params: {
		studentId: string
	}
}) {
	const student = await getTranscriptForStudent({ studentId: params.studentId })
	const gpaStats = await getStudentGPA({ studentId: params.studentId })

	return (
		<>
			<div className="w-full h-full overflow-y-auto">
				<div className="space-y-6 md:container">
					<div className="w-full sticky top-0 bg-background/50 backdrop-blur-md">
						<div className="py-6 px-6 flex justify-between items-center">
							<div>
								<h1 className="scroll-m-20 text-3xl font-extrabold tracking-tight">
									{student.user.firstName} {student.user.lastName}
								</h1>
								{student?.degreeData.map(degree => {
									const parsedTerm = parseTermCode(degree.degreeTerm)
									return (
										<small key={degree.id} className="text-sm font-medium leading-none">
											{degree.degreeCode} | {degree.degreeStatus} | {parsedTerm.semester}{" "}
											{parsedTerm.year}
										</small>
									)
								})}
							</div>
							<div>
								<StudentCommand studentId={params.studentId} />
							</div>
						</div>
						<div className="flex flex-col md:flex-row items-center justify-between gap-2 px-4">
							<StudentSummary gpaStats={gpaStats} />
						</div>
					</div>

					<div className="py-4 px-6">
						<h2>University Grades</h2>
						<UniversityGradesTable grades={student.universityGrades} />
					</div>

					<div className="py-4 px-6">
						<h2>Transfer Grades</h2>
						<TransferGradesTable grades={student.transferGrades} />
					</div>
				</div>
			</div>
		</>
	)
}
