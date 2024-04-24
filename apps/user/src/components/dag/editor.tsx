"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Conversation, Message, MessageRole } from "@repo/db"
import { CourseNode, HydratedStudentProfile } from "@repo/graph/types"
import { PromptComposer } from "@ui/components/prompt-composer"
import { SuggestedPrompts } from "@ui/components/suggested-prompts"
import { ScrollArea } from "@ui/components/ui/scroll-area"
import { Separator } from "@ui/components/ui/separator"
import { Loader2 } from "lucide-react"
import { applyEdgeChanges, applyNodeChanges, Edge, EdgeChange, Node, NodeChange } from "reactflow"

import { useAdvisor } from "@/hooks/use-advisor"
import { ChatPopover } from "@/components/dag/chat-popover"
import { SemesterDAG } from "@/components/semester-dag"

import { AssistantChat } from "../assistant-chat"
import { ChatScrollAnchor } from "../chat-scroll-anchor"
import { MdxContent } from "../mdxContent"
import { isCourseNode } from "../semester-dag/graph-to-node-utils"
import { CourseNodeType } from "../semester-dag/nodeTypes/course-node"
import { SemesterNodeType } from "../semester-dag/nodeTypes/semester-node"
import {
  getChangedCourseNodeIDs,
  getGhostCourseNodesAndEdges,
  getModifiedEdges,
  getModifiedNodes
} from "../semester-dag/utils"
import { createVersion, hydratedProfileAndNodesByVersion } from "./action"
import { AppointmentScheduler } from "./appointment-scheduler"

export type VersionWithoutBlob = { id: string }

export function Editor({
  versions: initialVersions,
  conversation,
  scheduleId
}: {
  versions: VersionWithoutBlob[]
  conversation: Conversation & {
    messages: Message[]
  }
  scheduleId: string
}) {
  const [versions, setVersions] = useState<VersionWithoutBlob[]>(initialVersions)
  const [appointmentTimes, setAppointmentTimes] = useState<Date[]>([])
  const [profile, setProfile] = useState<HydratedStudentProfile>()

  const [nodes, setNodes] = useState<Node[]>([])
  const [edges, setEdges] = useState<Edge[]>([])

  const [defaultNodes, setDefaultNodes] = useState<Node[]>([])

  const [chatOpen, setChatOpen] = useState(true)

  const toggleChatOpen = () => setChatOpen(!chatOpen)

  // useEffect(() => {
  //   console.log(appointmentTimes)
  // }, [appointmentTimes])

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    const changeTypes = new Set(changes.map(c => c.type))
    if (changeTypes.has("position")) {
      setStatus("dirty")
    }

    setNodes(nds => applyNodeChanges(changes, nds))
  }, [])

  const resetNodePlacement = (id: string) => {
    const pos = defaultNodes.find(n => n.id === id)?.position!
    setNodes(nds => nds.map(n => (n.id === id ? { ...n, position: pos } : n)))
  }

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => setEdges(eds => applyEdgeChanges(changes, eds)),
    []
  )
  const [_status, setStatus] = useState<"dirty" | "saving" | "pending" | "clean" | "error">("clean")

  const saveVersion = async (nodes: (SemesterNodeType | CourseNodeType)[]) => {
    setStatus("saving")

    console.log("saving version")

    const courseNodes = nodes.filter(n => isCourseNode(n)) as CourseNodeType[]

    const highestSemester = Math.max(...courseNodes.map(n => n.data.semesterIndex))
    const semesters = Array.from(Array(highestSemester + 1).keys())
    const semesterCourses = semesters.map(s =>
      courseNodes.filter(n => n.data.semesterIndex === s).map(c => c.data)
    ) as unknown as CourseNode[][]

    const newProfile: HydratedStudentProfile = { ...profile!, semesters: semesterCourses }

    const newVersion = await createVersion(newProfile, scheduleId)

    setVersions(prevVersions => [...prevVersions, newVersion])
  }

  const renderVersion = async (
    version: VersionWithoutBlob,
    lastVersion: VersionWithoutBlob | undefined
  ) => {
    if (version.id === lastVersion?.id) {
      return
    }

    const {
      profile: newProfile,
      defaultNodes: newDefaultNodes,
      defaultEdges: newDefaultEdges
    } = await hydratedProfileAndNodesByVersion(version.id)

    setProfile(newProfile)
    setDefaultNodes(newDefaultNodes)

    if (lastVersion === undefined) {
      setNodes(newDefaultNodes)
      setEdges(newDefaultEdges)
    } else {
      setNodes(newDefaultNodes)
      setEdges(newDefaultEdges)
      const lastVersionId = lastVersion.id
      const { profile: lastProfile, defaultNodes: oldDefaultNodes } =
        await hydratedProfileAndNodesByVersion(lastVersionId)

      const changedNodeIDs = getChangedCourseNodeIDs(lastProfile, newProfile)
      const changedEdgeIDs = newDefaultEdges
        .filter(e => changedNodeIDs.includes(e.source) || changedNodeIDs.includes(e.target))
        .map(e => e.id)

      const { ghostCourseNodes, ghostEdges } = getGhostCourseNodesAndEdges(
        newProfile,
        changedNodeIDs,
        oldDefaultNodes
      )

      setNodes([
        ...ghostCourseNodes,
        ...getModifiedNodes(newDefaultNodes, changedNodeIDs, n => ({
          ...n,
          data: {
            ...n.data,
            pulsing: true
          }
        }))
      ])
      setEdges([
        ...ghostEdges,
        ...getModifiedEdges(newDefaultEdges, changedEdgeIDs, e => ({
          ...e,
          style: { ...e.style, stroke: "lightskyblue" },
          hidden: false
        }))
      ])
    }
  }

  useEffect(() => {
    const initialLoad = versions === initialVersions
    if (versions.length == 0) return
    if (versions.length >= 1) {
      const versionsCopy = [...versions.map(v => ({ id: v.id }))]
      if (versions.at(-1)?.id == versions.at(-2)?.id) {
        while (versionsCopy.at(-1)?.id == versionsCopy.at(-2)?.id) {
          versionsCopy.pop()
        }
        setVersions(versionsCopy)
      } else {
        renderVersion(versions.at(-1)!, initialLoad ? undefined : versions.at(-2)).then(
          () => setStatus("clean"),
          reason => {
            console.error(reason)
            setStatus("error")
          }
        )
      }
    }
  }, [initialVersions, versions])

  const [prompt, setPrompt] = useState("")
  const ChatScrollerRef = useRef<HTMLDivElement>(null)

  const { messages, sendMessage, loading, isConnected, waiting, ready } = useAdvisor({
    conversationId: conversation.id,
    initialMessages: conversation?.messages ?? [],
    userId: conversation.userId,
    versions: versions,
    handleSelectedVersion: (versionId: string) => {
      const newVersion = { id: versionId }
      setVersions(prevVersions => [...prevVersions, newVersion])
    },
    handleAppointmentTimes: (times: Date[]) => setAppointmentTimes(times)
  })

  function scrollToEnd({ now = false }: { now?: boolean }) {
    ChatScrollerRef?.current?.scrollTo({
      top: ChatScrollerRef?.current?.scrollHeight,
      behavior: now ? "auto" : "smooth"
    })
  }

  async function submitMessage(content: string, role?: MessageRole) {
    if (appointmentTimes) {
      setAppointmentTimes([])
    }
    setChatOpen(true)
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
  })

  return (
    <div className="w-full">
      {!profile ?
        <div className="flex flex-grow items-center justify-center">
          <Loader2 className="h-4 w-4 animate-spin" />
        </div>
      : <>
          <div className="relative w-full h-[95%] rounded-xl border">
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
            <ChatPopover open={chatOpen} toggleOpen={toggleChatOpen} scrollToEnd={scrollToEnd}>
              <div className="h-[70vh] w-full rounded-xl shadow-lg border border-slate-200 bg-background py-4 px-2">
                <div className="sticky">
                  <h2 className="px-2 py-2 spaced uppercase font-semibold tracking-wide text-slate-500">
                    AI Advisor
                  </h2>
                  <Separator className="bg-slate-100 h-[0.1rem]" />
                </div>

                <ScrollArea
                  ref={ChatScrollerRef}
                  className="relative h-[calc(100%-2.75rem)] rounded-xl"
                >
                  <div className="mx-auto">
                    <div className="px-1">
                      {messages.length > 0 ?
                        <AssistantChat
                          messages={messages}
                          disabled={!ready}
                          submitMessage={submitMessage}
                          loading={loading}
                        />
                      : <MdxContent
                          className="py-2 px-2"
                          content={
                            "Hello! I'm the AI course advisor for USF's Computer Science program. I'm here to help you with course information, scheduling, and any other academic guidance you might need throughout your journey at USF. How can I assist you today?"
                          }
                        />
                      }
                    </div>
                  </div>
                  {ChatScrollerRef?.current && (
                    <ChatScrollAnchor
                      trackVisibility={waiting || loading}
                      scrollerRef={ChatScrollerRef}
                    />
                  )}
                  {appointmentTimes.length > 0 ?
                    <AppointmentScheduler
                      times={appointmentTimes}
                      handleBookAppointment={(readableTime: string) => {
                        setAppointmentTimes([])
                        submitMessage(
                          `Let's book an appointment for ${readableTime.toLocaleString()}.`
                        )
                      }}
                    />
                  : <></>}
                </ScrollArea>
              </div>
            </ChatPopover>
          </div>
          <div className="relative w-full h-[5%]">
            <SuggestedPrompts
              handleClick={(prompt: string) => submitMessage(prompt, "user")}
              prompts={["What can you do?", "Reschedule Data Structures"]}
            />
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
        </>
      }
    </div>
  )
}
