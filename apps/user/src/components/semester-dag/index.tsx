import { StudentProfile } from "@graph/types"
import { DAG } from "@ui/components/dag"
import { Edge, Node } from "reactflow"

import { CourseNodeType, CourseNode as CustomCourseNode } from "./course-node"
import { SemesterNode, SemesterNodeType } from "./semester-node"

const defaultSemesterNode: Partial<Node> = {
	draggable: false,
	type: "semesterNode",
	style: {
		backgroundColor: "aliceblue",
		borderRadius: "0.5rem",
		zIndex: 1,
		width: 175,
		height: 600
	}
}

const defaultCourseNode: Partial<Node> = {
	type: "courseNode",
	style: {
		backgroundColor: "white",
		borderRadius: "0.5rem",
		border: "1px solid black",
		width: "auto",
		zIndex: 2,
		height: "auto"
	}
	// extent: 'parent'
}

export function SemesterDAG({
	studentProfile: { graph, semesters, transferCredits, allCourses }
}: {
	studentProfile: StudentProfile
}) {
	const nodes: Node[] = []
	const parentNodes: SemesterNodeType[] = semesters.map((_semester, index) => {
		return {
			...defaultSemesterNode,
			id: `semester-${index}`,
			position: { x: index * 200, y: 0 },
			data: { semester: index }
		}
	})

	nodes.push(...parentNodes)

	const childNodes: CourseNodeType[] = semesters
		.map((semester, semIndex) =>
			semester.map((course, courseIndex): Node => {
				return {
					...defaultCourseNode,
					id: `${course.id}`,
					parentNode: `semester-${semIndex}`,
					position: { x: 0, y: 50 + courseIndex * 50 },
					data: { semesterIndex: semIndex + 1, ...course }
				}
			})
		)
		.flat()

	nodes.push(...childNodes)

	const edges: Edge[] = allCourses.flatMap(course => {
		return (
			course.prerequisites
				//we only need to render the edges when the prereq course is also going to be rendered
				.filter(prereq => [...graph.values()].find(node => node.id === prereq))
				.map(prereq => {
					return {
						id: `${prereq}-${course.id}`,
						type: "default",
						source: prereq,
						target: course.id,
						zIndex: 2
					}
				})
		)
	})

	if (transferCredits.length > 0) {
		nodes.push({
			...defaultSemesterNode,
			id: "transfer",
			position: { x: -200, y: 0 },
			data: { transfer: true }
		})

		const transferNodes: CourseNodeType[] = transferCredits.map((c, i) => {
			const n = graph.get(c)
			if (!n) {
				throw new Error(`Could not find course with id ${c}`)
			}

			return {
				...defaultCourseNode,
				id: n.id,
				parentNode: "transfer",
				position: { x: 0, y: 50 + i * 50 },
				data: { semesterIndex: -1, ...n }
			}
		})

		nodes.push(...transferNodes)

		const transferEdges: Edge[] = transferCredits
			.map(credit => {
				const n = graph.get(credit)

				if (!n) {
					throw new Error(`Could not find course with id ${credit}`)
				}

				return n.dependents.map((dep, i) => {
					return {
						id: `${n.id}-${dep}-${i}`,
						type: "default",
						source: n.id,
						target: dep,
						zIndex: 2
					}
				})
			})
			.flat()

		edges.push(...transferEdges)
	}

	return (
		<div style={{ width: "100vw", height: "90vh" }}>
			<DAG
				customNodes={{
					semesterNode: SemesterNode,
					courseNode: CustomCourseNode
				}}
				nodes={nodes}
				edges={edges}
			/>
		</div>
	)
}
