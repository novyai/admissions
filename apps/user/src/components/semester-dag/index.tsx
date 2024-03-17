import { StudentProfile } from "@graph/types"
import { DAG } from "@ui/components/dag"

import { CourseNode as CustomCourseNode } from "./course-node"
import {
	getSemesterNodesAndEdges,
	getTransferNodesAndEdges,
	getUnassignedNodesAndEdges
} from "./graph-to-node-utils"
import { SemesterNode } from "./semester-node"

export async function SemesterDAG({
	studentProfile: { graph, semesters, transferCredits, allCourses }
}: {
	studentProfile: StudentProfile
}) {
	// first we want to render the semesters, courses and their edges
	const { nodes, edges } = getSemesterNodesAndEdges(semesters, allCourses)

	// if there are transfer credits, we want to render them and their edges
	if (transferCredits.length > 0) {
		const transferNodesAndEdges = getTransferNodesAndEdges(transferCredits, graph)

		nodes.push(...transferNodesAndEdges.nodes)
		edges.push(...transferNodesAndEdges.edges)
	}

	// we also want to display all nodes not in transfer or a semester and its edges

	const { nodes: unassignedNodes, edges: unassignedEdges } = await getUnassignedNodesAndEdges(
		graph,
		nodes,
		transferCredits.map(c => {
			const n = graph.get(c)
			if (!n) {
				throw new Error(`Could not find course with id ${c}`)
			}
			return n
		})
	)

	nodes.push(...unassignedNodes)
	edges.push(...unassignedEdges)

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
