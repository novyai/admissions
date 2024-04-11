"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { useUser } from "@clerk/nextjs"
import { getCourseFromIdNameCode } from "@graph/course"
import { graphToStudentProfile, studentProfileToGraph } from "@graph/graph"
import { pushCourseAndDependents } from "@graph/profile"
import * as Separator from "@radix-ui/react-separator"
import { Conversation, Message, MessageRole, Version } from "@repo/db"
import { getProfileFromSchedule } from "@repo/graph/action"
import { CourseNode, StudentProfile } from "@repo/graph/types"
import { PromptComposer } from "@ui/components/prompt-composer"
import { ScrollArea } from "@ui/components/ui/scroll-area"
import { Loader2 } from "lucide-react"
import { applyEdgeChanges, applyNodeChanges, Edge, EdgeChange, Node, NodeChange } from "reactflow"

import { cn } from "@/lib/utils"
import { useAdvisor } from "@/hooks/use-advisor"
import { SemesterDAG } from "@/components/semester-dag"

import { AssistantChat } from "../assistant-chat"
import { ChatScrollAnchor } from "../chat-scroll-anchor"
import { CourseNodeType } from "../semester-dag/course-node"
import { isCourseNode } from "../semester-dag/graph-to-node-utils"
import { SemesterNodeType } from "../semester-dag/semester-node"
import { createVersion, getAllNodesAndEdges } from "./action"

export function Editor({
  versions: initialVersions,
  conversation,
  scheduleId
}: {
  versions: Version[]
  conversation: Conversation & {
    messages: Message[]
  }
  scheduleId: string
}) {
  const [_versions, setVersions] = useState<Version[]>(initialVersions)
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
  const [_status, setStatus] = useState<"dirty" | "saving" | "pending" | "clean" | "error">("clean")

  const saveVersion = useCallback(
    async (nodes: (SemesterNodeType | CourseNodeType)[]) => {
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
    },
    [profile, scheduleId]
  )

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

  const [prompt, setPrompt] = useState("")
  const ChatScrollerRef = useRef<HTMLDivElement>(null)

  const { messages, sendMessage, loading, isConnected, waiting, ready, action, clearAction } =
    useAdvisor({
      conversationId: conversation.id,
      initialMessages: conversation?.messages ?? [],
      userId: conversation.userId
    })

  const pushClass = useCallback(
    async (courseId: string) => {
      const graph = studentProfileToGraph(profile!)

      const newGraph = pushCourseAndDependents(graph, courseId)
      const newProfile = graphToStudentProfile(newGraph, profile!)
      const { defaultNodes } = await getAllNodesAndEdges(newProfile)
      setProfile(newProfile)
      await saveVersion(defaultNodes)
    },
    [profile, saveVersion]
  )

  useEffect(() => {
    if (profile && action?.action === "RESCHEDULE_COURSE") {
      const actionParams = action?.actionParams as { action: string; courseName: string }
      const courseNode = getCourseFromIdNameCode(profile, actionParams.courseName)
      pushClass(courseNode.id)
      clearAction()
    }
  }, [action, clearAction, profile, pushClass])

  function scrollToEnd({ now = false }: { now?: boolean }) {
    ChatScrollerRef?.current?.scrollTo({
      top: ChatScrollerRef?.current?.scrollHeight,
      behavior: now ? "auto" : "smooth"
    })
  }

  async function submitMessage(content: string, role?: MessageRole) {
    if (loading) {
      return
    }

    setPrompt("")
    scrollToEnd({ now: true })

    sendMessage(content, role)

    setTimeout(() => {
      scrollToEnd({})
    }, 1000)
  }

  const handleInput = (event: React.ChangeEvent<HTMLInputElement>): void => {
    setPrompt(event.target.value ?? "")
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === "Enter") {
      event.preventDefault()
      submitMessage(prompt)
    }
  }

  useEffect(() => {
    setTimeout(() => {
      scrollToEnd({ now: true })
    }, 0)
  }, [])

  return (
    <div className="w-full">
      {!profile ?
        <div className="flex flex-grow items-center justify-center">
          <Loader2 className="h-4 w-4 animate-spin" />
        </div>
      : <>
          <div className="flex w-full h-[95%] rounded-xl border">
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
            <div className="basis-1/3 p-4">
              <ScrollArea
                className="h-full rounded-xl shadow-lg border border-slate-200"
                ref={ChatScrollerRef}
              >
                <div className="max-w-7xl mx-auto px-6">
                  <AssistantChat
                    messages={messages}
                    disabled={!ready}
                    submitMessage={submitMessage}
                    loading={loading}
                  />
                  {ChatScrollerRef?.current && (
                    <ChatScrollAnchor
                      trackVisibility={waiting || loading}
                      scrollerRef={ChatScrollerRef}
                    />
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>
        </>
      }

      <div className="w-full h-[5%]">
        <PromptComposer
          disabled={!ready || !isConnected}
          placeholder={"Ask me anything..."}
          loading={loading}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          onSubmit={submitMessage}
          prompt={prompt}
        />
      </div>
    </div>
  )
}
