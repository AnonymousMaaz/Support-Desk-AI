export interface IntentPrediction {
  category: string
  display_name: string
  confidence: number
}

export interface SimilarCase {
  text: string
  category: string
  display_name: string
  similarity: number
}

export interface PredictionResponse {
  request_id: string
  message: string
  prediction: IntentPrediction
  alternatives: IntentPrediction[]
  support_team: string
  human_review_required: boolean
  recommendation: string
  similar_cases: SimilarCase[]
}