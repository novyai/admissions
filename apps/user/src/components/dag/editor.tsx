"use client"

import { useCallback, useEffect, useState } from "react"
import { Version } from "@db/client"
import { getProfileFromSchedule } from "@graph/action"
import { Button } from "@ui/components/ui/button"
import { applyEdgeChanges, applyNodeChanges, Edge, EdgeChange, Node, NodeChange } from "reactflow"

import { SemesterDAG } from "@/components/semester-dag"

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

  const [nodes, setNodes] = useState<Node[]>([])
  const [edges, setEdges] = useState<Edge[]>([])

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    const changeTypes = new Set(changes.map(c => c.type))
    if (changeTypes.has("position")) {
      setStatus("dirty")
    }
    setNodes(nds => applyNodeChanges(changes, nds))
  }, [])

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => setEdges(eds => applyEdgeChanges(changes, eds)),
    []
  )
  const [status, setStatus] = useState<"dirty" | "saving" | "pending" | "clean" | "error">("clean")

  const saveVersion = async (nodes: Node[]) => {
    setStatus("saving")
    const profile = await getProfileFromSchedule(selectedVersion.blob?.toString() ?? "")
    console.log(nodes)
    const version = await createVersion(profile, scheduleId, nodes)
    setVersions(prev => [...prev, version])
    setSelectedVersion(version)
    setStatus("clean")
  }

  useEffect(() => {
    setStatus("pending")
    const update = async () => {
      const profile = await getProfileFromSchedule(selectedVersion.blob?.toString() ?? "")
      const { defaultNodes, defaultEdges } = await getAllNodesAndEdges(profile)
      console.log({ defaultNodes, defaultEdges })

      setNodes(defaultNodes)
      setEdges(defaultEdges)
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

  return (
    <>
      <div className="flex flex-col gap-y-4">
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
          <SemesterDAG
            saveVersion={saveVersion}
            nodes={nodes}
            edges={edges}
            setNodes={setNodes}
            setEdges={setEdges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
          />
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
