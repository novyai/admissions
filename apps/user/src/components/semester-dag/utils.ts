import { Edge, getIncomers, getOutgoers, Node } from "reactflow"

import { CourseNodeData, CourseNodeType } from "./course-node"
import { isCourseNode } from "./graph-to-node-utils"

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
