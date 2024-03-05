import { getStudentGPA, getTranscriptForStudent } from "@/db/students"

import { exampleAgent } from "@/ai/agents/example-agent"

export const runtime = "edge"

export async function POST(request: Request): Promise<Response> {
	try {
		const { ctx, prompt } = await request.json()

		const transcript = await getTranscriptForStudent({ studentId: ctx.studentId })
		const gpa = await getStudentGPA({ studentId: ctx.studentId })

		const universityGrades = transcript.universityGrades.map(item => ({
			studentId: item.studentId,
			term: item.term,
			course: `${item.course.courseSubject} ${item.course.courseNumber}`,
			title: item.course.name,
			credits: item.creditHours,
			grade: item.finalGrade
		}))

		const transferGrades = transcript.transferGrades.map(item => ({
			studentId: item.studentId,
			term: item.term,
			course: `${item.courseSubject} ${item.courseNumber}`,
			title: item.courseTitle,
			credits: item.creditHours,
			equivalentGrade: item.equivalentGrade,
			transferGrade: item.transferGrade
		}))

		const messages = [
			{
				role: "system",
				content: `
        this student is in the computer science program has taken the following courses:

        here is their degree data:
        ${JSON.stringify(transcript.degreeData)}

        here are their grades from this university:
        ${JSON.stringify(universityGrades)}


        here are their transfer grades, don't worry if the grades are missing here:
        ${JSON.stringify(transferGrades)}

        here is information about their gpa:
        ${JSON.stringify(gpa)}
        `
			},
			...ctx.messages
		]

		const stream = await exampleAgent.completionStream({
			prompt,
			messages
		})

		return new Response(stream)
	} catch (error) {
		console.error(error)
		return new Response("could not send message")
	}
}
