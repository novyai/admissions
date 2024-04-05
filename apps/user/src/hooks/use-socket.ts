import { useCallback, useEffect, useRef, useState } from "react"
import { SOCKET_BASE_URL } from "@/constants"
import { EventDataTypes, SOCKET_EVENTS, SocketListeners, SocketMsg } from "@repo/constants"
import { toast } from "sonner"

export function useSocket({
  listeners = {},
  reconnectAttempts = 3,
  reconnectInterval = 5000,
  userId,
  streamId
}: {
  listeners: SocketListeners
  reconnectAttempts?: number
  reconnectInterval?: number
  userId: string | null
  streamId: string
}) {
  const [isConnected, setIsConnected] = useState(false)
  const [isInitialLoad, setInitialLoad] = useState(true)

  const socket = useRef<WebSocket | null>(null)
  const attemptCountRef = useRef(0)

  const onMessage = useCallback(
    (e: MessageEvent) => {
      try {
        const msg = JSON.parse(e.data) as SocketMsg<keyof typeof SOCKET_EVENTS>

        if (msg.type in SOCKET_EVENTS && msg.type in listeners) {
          const listener = listeners[msg.type] as (data: EventDataTypes[typeof msg.type]) => void

          if (listener) {
            listener(msg.data)
          } else {
            console.warn(`No listener for message type: ${msg.type}`)
          }
        } else {
          console.error(`Received unknown message type: ${msg.type}`)
          console.log(msg)
        }
      } catch (error) {
        console.error("Error parsing message:", error)
      }
    },
    [listeners]
  )

  const cleanUpSocket = () => {
    console.log("Cleaning up socket exec", socket.current)
    if (socket.current) {
      socket.current.onclose = null
      socket.current.close()
      socket.current = null
    }
  }

  const connect = async () => {
    if (isConnected) return

    try {
      const socketParams = `?streamId=${streamId}&userId=${userId}&id=${userId}`

      const newConnect = new WebSocket(`${SOCKET_BASE_URL}${socketParams}`)

      newConnect.onmessage = onMessage
      newConnect.onopen = () => {
        socket.current = newConnect
        setIsConnected(true)
        if (attemptCountRef.current > 0) toast.success("Reconnected")
        attemptCountRef.current = 0
      }

      newConnect.onclose = e => {
        setIsConnected(false)
        console.log("Socket closed", e.reason)

        if (attemptCountRef.current < reconnectAttempts) {
          attemptCountRef.current = attemptCountRef.current + 1
          const attemptingToast = toast.loading("Connection lost", {
            description: "Attempting to reconnect..."
          })

          setTimeout(() => {
            toast.dismiss(attemptingToast)
            connect()
          }, reconnectInterval)
        } else {
          const disconnectedToast = toast.warning("Disconnected..", {
            dismissible: false,
            duration: 1000000,
            action: {
              label: "Reconnect",
              onClick: () => {
                connect()
                toast.dismiss(disconnectedToast)
              }
            }
          })
        }
      }

      newConnect.onerror = e => {
        console.error("Socket encountered error: ", e, "Closing socket")
        newConnect.close()
      }
    } catch (error) {
      console.log("Error connecting to socket:", error)
    }
  }

  useEffect(() => {
    setInitialLoad(false)

    if (isInitialLoad || !userId || socket?.current || isConnected) return

    connect()

    return () => {
      cleanUpSocket()
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInitialLoad])

  return {
    isConnected
  }
}
