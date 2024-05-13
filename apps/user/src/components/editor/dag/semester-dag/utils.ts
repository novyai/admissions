import { CourseNode, HydratedStudentProfile } from "@graph/types"
import { Edge, getIncomers, getOutgoers, Node } from "reactflow"

import { isCourseNode } from "./graph-to-node-utils"
import { CourseNodeData, CourseNodeType } from "./nodeTypes/course-node"
import { defaultGhostCourseNode, GhostCourseNodeType } from "./nodeTypes/ghost-course-node"

const getAllChildrenNodes = (
  targetNode: CourseNodeType,
  courseNodes: CourseNodeType[],
  allEdges: Edge[],
  getChildren: (
    node: Node<CourseNodeData, string | undefined>,
    nodes: Node<CourseNodeData, string | undefined>[],
    edges: Edge[]
  ) => Node<CourseNodeData, string | undefined>[]
) => {
  const children = new Set(getChildren(targetNode, courseNodes, allEdges))

  const toCheck = [...children]
  while (toCheck.length > 0) {
    const currNode = toCheck.pop()!
    const newChildren = getChildren(currNode, courseNodes, allEdges).filter(node =>
      isCourseNode(node)
    ) as CourseNodeType[]
    for (const newChild of newChildren) {
      if (!children.has(newChild)) {
        toCheck.push(newChild)
        children.add(newChild)
      }
    }
  }
  return children
}

export const getNodeIDsInCoursePath = (
  targetNode: Node,
  allNodes: Node[],
  allEdges: Edge[]
): string[] => {
  if (!isCourseNode(targetNode)) {
    return []
  }
  const courseNodes = allNodes.filter(node => isCourseNode(node)) as CourseNodeType[]
  const incomers = getAllChildrenNodes(targetNode, courseNodes, allEdges, getIncomers)
  const outgoers = getAllChildrenNodes(targetNode, courseNodes, allEdges, getOutgoers)
  const connectedNodes = [targetNode, ...incomers, ...outgoers]
  return connectedNodes.map(node => node.id)
}

export const getEdgesIDsInCoursePath = (connectedNodeIDs: string[], allEdges: Edge[]) => {
  const connectedEdges = allEdges.filter(
    edge => connectedNodeIDs.includes(edge.source) && connectedNodeIDs.includes(edge.target)
  )
  return connectedEdges.map(edge => edge.id)
}

export const getModifiedEdge = (
  edge: Edge,
  edgeIDsToModify: string[],
  modifyEdge: (edge: Edge) => Edge,
  modifyDefaultEdge: (edge: Edge) => Edge = (e: Edge) => e
) => {
  return edgeIDsToModify.includes(edge.id) ? modifyEdge(edge) : modifyDefaultEdge(edge)
}

export const getModifiedEdges = (
  edges: Edge[],
  edgeIDsToModify: string[],
  modifyEdge: (edge: Edge) => Edge,
  modifyDefaultEdge: (edge: Edge) => Edge = (e: Edge) => e
) => {
  return edges.map(e => (edgeIDsToModify.includes(e.id) ? modifyEdge(e) : modifyDefaultEdge(e)))
}

export const getModifiedNodes = (
  nodes: Node[],
  nodeIDsToModify: string[],
  modifyNode: (node: Node) => Node,
  modifyDefaultNode: (node: Node) => Node = (n: Node) => n
) => {
  return nodes.map(n => (nodeIDsToModify.includes(n.id) ? modifyNode(n) : modifyDefaultNode(n)))
}

export const getChangedCourseNodeIDs = (
  oldProfile: HydratedStudentProfile,
  newProfile: HydratedStudentProfile
) => {
  let changedNodeIDs: string[] = []

  for (const [semIndex, semesterCourses] of oldProfile.semesters.entries()) {
    if (semIndex === newProfile.semesters.length) {
      break
    }
    const oldSemesterCourseIDs = semesterCourses.map(node => node.id)
    const newSemesterCourseIDs = newProfile.semesters[semIndex].map(node => node.id)
    const changedIDs = oldSemesterCourseIDs.filter(course => !newSemesterCourseIDs.includes(course))
    changedNodeIDs = changedNodeIDs.concat(changedIDs)
  }

  return changedNodeIDs
}

export const getGhostCourseNodesAndEdges = (
  newProfile: HydratedStudentProfile,
  changedNodeIDs: string[],
  oldDefaultNodes: CourseNodeType[]
) => {
  const oldChangedCourseNodes = oldDefaultNodes
    .filter(n => changedNodeIDs.includes(n.id))
    .filter(n => isCourseNode(n))

  const newSemesters: CourseNode[][] = newProfile.semesters

  const ghostCourseNodes: GhostCourseNodeType[][] = []
  for (let i = 0; i < newSemesters.length; i++) {
    ghostCourseNodes.push([])
  }

  const ghostEdges: Edge[] = []

  for (const oldNode of oldChangedCourseNodes) {
    const { semesterIndex, name, prerequisites } = oldNode.data

    const semesterExistsInNewProfile = semesterIndex < newSemesters.length

    if (!semesterExistsInNewProfile) {
      continue
    }

    const startCourseIndex = newSemesters[semesterIndex].length
    const courseIndex = startCourseIndex + ghostCourseNodes[semesterIndex].length

    ghostCourseNodes[semesterIndex].push({
      ...defaultGhostCourseNode,
      id: `ghost-${oldNode.id}`,
      position: { x: 5, y: 50 + courseIndex * 50 },
      parentNode: `semester-${semesterIndex}`,
      style: { zIndex: "10" },

      data: {
        ...oldNode.data,
        name: `${name} (Old)`
      }
    })
    const edges = prerequisites.map(prereq => {
      const nodeID = changedNodeIDs.includes(oldNode.id) ? `ghost-${oldNode.id}` : oldNode.id
      const prereqID = changedNodeIDs.includes(prereq) ? `ghost-${prereq}` : prereq
      return {
        id: `${prereqID}-${nodeID}`,
        type: "default",
        source: prereqID,
        target: nodeID,
        zIndex: 3,
        hidden: false
      }
    })
    ghostEdges.push(...edges)
  }

  return { ghostCourseNodes: ghostCourseNodes.flat(), ghostEdges: ghostEdges }
}

export const isGenEdNode = (node: Node): boolean => {
  const HARDCODED_GEN_ED_COURSES = ["Composition I", "Composition II"]

  if (!isCourseNode(node)) return false

  return node.id.includes("GEN") || HARDCODED_GEN_ED_COURSES.includes(node.data.name)
}
