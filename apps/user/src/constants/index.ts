export const SUMMARIZE_TOKEN_THRESHOLD = 1500
export const MAX_TOKEN_COUNT_PER_COMPLETION = 5000

const isLocal = true //process?.env?.["NEXT_PUBLIC_IS_LOCAL"] === "1"
const isQA = true //process?.env?.["NEXT_PUBLIC_RW_ENV"] === "QA"

export const OLMPA_BASE_URL =
  isQA ?
    "admissions-olmpa-api-production.up.railway.app"
  : "admissions-olmpa-api-production.up.railway.app"

export const WS_BASE_URL =
  isQA ?
    "admissions-ws-api-production.up.railway.app"
  : "admissions-ws-api-production.up.railway.app"

export const SOCKET_BASE_URL = isLocal ? `ws://localhost:6970/ws` : `wss://${WS_BASE_URL}/ws`
export const Q_BASE_URL = isLocal ? "http://localhost:6969/q" : `https://${OLMPA_BASE_URL}/q`
