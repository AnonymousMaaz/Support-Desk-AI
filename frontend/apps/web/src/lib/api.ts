import type {
  PredictionResponse,
} from "@/types"


interface ErrorResponse {
  error?: string
}


async function parseResponse<T>(
  response: Response,
): Promise<T> {
  const body = (
    await response.json()
  ) as T & ErrorResponse

  if (!response.ok) {
    throw new Error(
      body.error ??
        "The server could not complete the request.",
    )
  }

  return body
}


export async function classifyTicket(
  message: string,
): Promise<PredictionResponse> {
  const response = await fetch(
    "/api/predict",
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        message,
      }),
    },
  )

  return parseResponse<PredictionResponse>(
    response,
  )
}


export async function submitFeedback(
  requestId: string,
  helpful: boolean,
): Promise<void> {
  const response = await fetch(
    "/api/feedback",
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        request_id: requestId,
        helpful,
      }),
    },
  )

  await parseResponse(response)
}