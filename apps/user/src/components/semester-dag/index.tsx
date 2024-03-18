import { StudentProfile } from "@graph/types"

import { CourseNode as CustomCourseNode } from "./course-node"
import {
	getSemesterNodesAndEdges,
	getTransferNodesAndEdges,
	getUnassignedNodesAndEdges
} from "./graph-to-node-utils"
import { SemesterDagChat } from "./semester-dag-chat"
import { SemesterNode } from "./semester-node"

export async function SemesterDAG({
	studentProfile: { graph, semesters, transferCredits, allCourses }
}: {
	studentProfile: StudentProfile
}) {
	// first we want to render the semesters, courses and their edges
	const { nodes: defaultNodes, edges: defaultEdges } = getSemesterNodesAndEdges(
		semesters,
		allCourses
	)

	// if there are transfer credits, we want to render them and their edges
	if (transferCredits.length > 0) {
		const transferNodesAndEdges = getTransferNodesAndEdges(transferCredits, graph)

		defaultNodes.push(...transferNodesAndEdges.nodes)
		defaultEdges.push(...transferNodesAndEdges.edges)
	}

	// we also want to display all nodes not in transfer or a semester and its edges

	const { nodes: unassignedNodes, edges: unassignedEdges } = await getUnassignedNodesAndEdges(
		graph,
		defaultNodes,
		transferCredits.map(c => {
			const n = graph.get(c)
			if (!n) {
				throw new Error(`Could not find course with id ${c}`)
			}
			return n
		})
	)

	defaultNodes.push(...unassignedNodes)
	defaultEdges.push(...unassignedEdges)

	return (
		<SemesterDagChat
			customNodes={{
				semesterNode: SemesterNode,
				courseNode: CustomCourseNode
			}}
			nodes={defaultNodes}
			edges={defaultEdges}
		/>
	)
}
