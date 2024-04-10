"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useUser } from "@clerk/nextjs"
import { graphToStudentProfile, studentProfileToGraph } from "@graph/graph"
import { pushCourseAndDependents } from "@graph/profile"
import { Version } from "@repo/db"
import { getProfileFromSchedule } from "@repo/graph/action"
import { CourseNode, StudentProfile } from "@repo/graph/types"
import { Button } from "@repo/ui/components/ui/button"
import { PromptComposer } from "@ui/components/prompt-composer"
import { Loader2 } from "lucide-react"
import { applyEdgeChanges, applyNodeChanges, Edge, EdgeChange, Node, NodeChange } from "reactflow"

import { useAdvisor } from "@/hooks/use-advisor"
import { SemesterDAG } from "@/components/semester-dag"

import { CourseNodeType } from "../semester-dag/course-node"
import { isCourseNode } from "../semester-dag/graph-to-node-utils"
import { SemesterNodeType } from "../semester-dag/semester-node"
import { createVersion, getAllNodesAndEdges } from "./action"

export function Editor({
  versions: initialVersions,
  scheduleId
}: {
  versions: Version[]
  scheduleId: string
}) {
  const [versions, setVersions] = useState<Version[]>(initialVersions)
  const [selectedVersion, setSelectedVersion] = useState<Version>(initialVersions[0]!)
  const [profile, setProfile] = useState<StudentProfile>()

  const [nodes, setNodes] = useState<Node[]>([])
  const [edges, setEdges] = useState<Edge[]>([])

  const [defaultNodes, setDefaultNodes] = useState<Node[]>([])

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    const changeTypes = new Set(changes.map(c => c.type))
    if (changeTypes.has("position")) {
      setStatus("dirty")
    }

    setNodes(nds => applyNodeChanges(changes, nds))
  }, [])

  const resetNodePlacement = (id: string) => {
    const pos = defaultNodes.find(n => n.id === id)?.position!
    console.log(`resetting node ${id} to ${pos.x},${pos.y}`)
    setNodes(nds => nds.map(n => (n.id === id ? { ...n, position: pos } : n)))
    console.log("fixed")
  }

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => setEdges(eds => applyEdgeChanges(changes, eds)),
    []
  )
  const [status, setStatus] = useState<"dirty" | "saving" | "pending" | "clean" | "error">("clean")

  const saveVersion = async (nodes: (SemesterNodeType | CourseNodeType)[]) => {
    setStatus("saving")

    const courseNodes = nodes.filter(n => isCourseNode(n)) as CourseNodeType[]

    const semesters = Array.from(new Set(courseNodes.map(n => n.data.semesterIndex)))
    console.log(semesters)
    const semesterCourses = semesters.map(s =>
      courseNodes.filter(n => n.data.semesterIndex === s).map(c => c.data)
    ) as unknown as CourseNode[][]

    const newProfile: StudentProfile = { ...profile!, semesters: semesterCourses }

    const version = await createVersion(newProfile, scheduleId, nodes)
    setVersions(prev => [...prev, version])
    setProfile(newProfile)
    setSelectedVersion(version)
    setStatus("clean")
  }

  useEffect(() => {
    setStatus("pending")
    const update = async () => {
      const profile = await getProfileFromSchedule(selectedVersion.blob?.toString() ?? "")

      setProfile(profile)
      const { defaultNodes: newDefaultNodes, defaultEdges: newDefaultEdges } =
        await getAllNodesAndEdges(profile)

      setDefaultNodes(newDefaultNodes)

      setNodes(newDefaultNodes)
      setEdges(newDefaultEdges)
    }

    update().then(
      () => setStatus("clean"),
      reason => {
        console.error(reason)
        setStatus("error")
      }
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedVersion])

  const { user } = useUser()

  const router = useRouter()
  if (!user?.id) {
    router.replace("/sign-in")
  }

  const { sendMessage, loading } = useAdvisor({
    conversationId: "123",
    userId: user?.id ?? null
  })

  const pushClass = async (courseId: string) => {
    const graph = studentProfileToGraph(profile!)

    const newGraph = pushCourseAndDependents(graph, courseId)
    const newProfile = graphToStudentProfile(newGraph, profile!)
    const { defaultNodes } = await getAllNodesAndEdges(newProfile)
    setProfile(newProfile)
    await saveVersion(defaultNodes)
  }

  return (
    <>
      <div className="flex flex-col gap-y-4">
        <Button
          onClick={async () => {
            await pushClass("1665c198-ca4c-4864-940a-dc30eb56c254")
          }}
        >
          Push Prec alc
        </Button>
        <Button disabled={status !== "dirty"} onClick={() => saveVersion(nodes)}>
          {status === "dirty" ? "Save Changes" : "No Changes"}
        </Button>
        <VersionList
          versions={versions}
          selectedVersion={selectedVersion}
          setSelectedVersion={setSelectedVersion}
        />
      </div>
      <div className="flex flex-col w-full h-full">
        <div className="relative flex-1 min-h-[50vh] rounded-xl border">
          {!profile ?
            <div className="flex w-full h-full items-center justify-center">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          : <div className="flex flex-col w-full h-full">
              <div className="flex-grow">
                <SemesterDAG
                  resetNodePlacement={resetNodePlacement}
                  profile={profile}
                  saveVersion={saveVersion}
                  nodes={nodes}
                  edges={edges}
                  setNodes={setNodes}
                  setEdges={setEdges}
                  onNodesChange={onNodesChange}
                  onEdgesChange={onEdgesChange}
                />
              </div>
              <div className="w-full p-2">
                <PromptComposer
                  prompt=""
                  onChange={() => {}}
                  placeholder="What courses should I add?"
                  onSubmit={sendMessage}
                  loading={loading}
                />
              </div>
            </div>
          }
        </div>
      </div>
    </>
  )
}

function VersionList({
  versions,
  selectedVersion,
  setSelectedVersion
}: {
  versions: Version[]
  selectedVersion: Version
  setSelectedVersion: (version: Version) => void
}) {
  return (
    <>
      {versions.map(version => {
        return (
          <Button
            variant={selectedVersion?.id === version.id ? "default" : "outline"}
            key={version.id}
            onClick={() => setSelectedVersion(version)}
          >
            {version.id.substring(0, 4)} - {version.createdAt.toISOString()}
          </Button>
        )
      })}
    </>
  )
}
