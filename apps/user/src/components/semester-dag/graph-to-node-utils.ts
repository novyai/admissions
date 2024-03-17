import { getCourseWithPrereqs } from "@/db/courses"
import { CourseNode } from "@graph/types"
import { Edge, Node } from "reactflow"

import { CourseNodeType } from "./course-node"
import { SemesterNodeType } from "./semester-node"

export const defaultSemesterNode: Partial<Node> = {
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

export const defaultCourseNode: Partial<Node> = {
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

export function getSemesterNodesAndEdges(semesters: CourseNode[][], allCourses: CourseNode[]) {
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
					id: course.id,
					parentNode: `semester-${semIndex}`,
					position: { x: 0, y: 50 + courseIndex * 50 },
					data: { semesterIndex: semIndex + 1, ...course }
				}
			})
		)
		.flat()

	nodes.push(...childNodes)

	const edges: Edge[] = allCourses.flatMap(course => {
		return course.prerequisites.map(prereq => {
			return {
				id: `${prereq}-${course.id}`,
				type: "default",
				source: prereq,
				target: course.id,
				zIndex: 2
			}
		})
	})

	return { nodes, edges }
}

export const getTransferNodesAndEdges = (
	transferCredits: string[],
	graph: Map<string, CourseNode>
) => {
	const nodes: Node[] = []
	const edges: Edge[] = []

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

	return { nodes, edges }
}

const getCoursePrereqs = async (id: string) => {
	return {
		id,
		prereqs: (await getCourseWithPrereqs(id, [])).prereqMap.get(id)?.filter(Boolean) ?? []
	}
}

export const getUnassignedNodesAndEdges = async (
	graph: Map<string, CourseNode>,
	nodes: Node[],
	transferCredits: CourseNode[]
) => {
	const coursesNotInSemesterOrTransferNode = [...graph.values()].filter(
		({ id }) => !nodes.map(n => n.id).includes(id)
	)

	// console.log(coursesNotInSemesterOrTransferNode)
	const unassignedNodes: CourseNodeType[] = coursesNotInSemesterOrTransferNode.map((course, i) => {
		return {
			...defaultCourseNode,
			id: course.id,
			position: { x: -400 - 200 * i, y: 50 },
			data: { semesterIndex: -1, ...course },
			style: {
				...defaultCourseNode.style,
				backgroundColor: "lightgrey"
			}
		}
	})

	const prereqs = await Promise.all(
		[...coursesNotInSemesterOrTransferNode, ...transferCredits].map(c => getCoursePrereqs(c.id))
	)

	const unassignedEdges: Edge[] = prereqs.flatMap(({ id, prereqs }) => {
		return prereqs.map(prereq => {
			return {
				id: `${prereq}-${id}`,
				type: "default",
				source: prereq,
				target: id,
				zIndex: 2
			}
		})
	})

	return { nodes: unassignedNodes, edges: unassignedEdges }
}