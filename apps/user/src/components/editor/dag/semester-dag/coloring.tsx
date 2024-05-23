import { CourseNodeType } from "@/components/editor/dag/semester-dag/nodeTypes/course-node"

type COLOR_LEVEL = "REQUIREMENT"

const COLORS = [
  "bg-red-400",
  "bg-orange-400",
  "bg-amber-400",
  "bg-yellow-400",
  "bg-lime-400",
  "bg-green-400",
  "bg-emerald-400",
  "bg-teal-400",
  "bg-cyan-400",
  "bg-sky-400",
  "bg-blue-400",
  "bg-indigo-400",
  "bg-purple-400",
  "fuchsia-400",
  "bg-pink-400",
  "bg-rose-400"
]

/**
 *
 * @param level Level of the color
 * @param nodes Nodes to color
 * @returns Map of requirement id to color
 */
export function getColorMap(_level: COLOR_LEVEL, nodes: CourseNodeType[]): Map<string, string> {
  const allRequirements = new Set<string>()

  for (const node of nodes) {
    const groups = node.data.requirements
    if (!groups) {
      continue
    }

    for (const req of groups) {
      allRequirements.add(req)
    }
  }

  const c = [...COLORS]

  const randomC = c.sort(() => Math.random() - 0.5)

  const groupToColor = new Map<string, string>()

  let index = 0
  for (const groupId of allRequirements) {
    const color = randomC[index]
    if (!groupToColor.has(groupId)) {
      groupToColor.set(groupId, color)
    }
    index++
  }

  return groupToColor
}
