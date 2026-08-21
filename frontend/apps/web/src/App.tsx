import {
  useMemo,
  useState,
} from "react"

import {
  AlertTriangle,
  ArrowRight,
  Bot,
  BrainCircuit,
  Check,
  CheckCircle2,
  Clipboard,
  Clock3,
  MessageSquareText,
  Route,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  Users,
} from "lucide-react"

import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { Progress } from "@workspace/ui/components/progress"
import { Separator } from "@workspace/ui/components/separator"
import { Textarea } from "@workspace/ui/components/textarea"

import {
  classifyTicket,
  submitFeedback,
} from "@/lib/api"

import type {
  PredictionResponse,
} from "@/types"


const EXAMPLES = [
  "My card has still not arrived",
  "The ATM declined my withdrawal",
  "I forgot the passcode to my account",
  "The recipient has not received my transfer",
]


function percentage(
  value: number,
): string {
  return `${Math.round(value * 100)}%`
}


function App() {
  const [message, setMessage] = useState(
    EXAMPLES[0],
  )

  const [result, setResult] = useState<
    PredictionResponse | null
  >(null)

  const [loading, setLoading] =
    useState(false)

  const [error, setError] =
    useState("")

  const [
    feedbackState,
    setFeedbackState,
  ] = useState<"idle" | "sent">(
    "idle",
  )


  const confidenceDescription =
    useMemo(() => {
      if (!result) {
        return "Unknown"
      }

      if (
        result.prediction.confidence
        >= 0.65
      ) {
        return "High confidence"
      }

      if (
        result.prediction.confidence
        >= 0.35
      ) {
        return "Medium confidence"
      }

      return "Low confidence"
    }, [result])


  async function handleSubmit() {
    const cleanedMessage =
      message.trim()

    if (!cleanedMessage) {
      setError(
        "Please enter a customer message.",
      )
      return
    }

    setLoading(true)
    setError("")
    setFeedbackState("idle")

    try {
      const prediction =
        await classifyTicket(
          cleanedMessage,
        )

      setResult(prediction)
    } catch (caughtError) {
      if (
        caughtError instanceof Error
      ) {
        setError(
          caughtError.message
        )
      } else {
        setError(
          "Something went wrong."
        )
      }
    } finally {
      setLoading(false)
    }
  }


  async function handleFeedback(
    helpful: boolean,
  ) {
    if (!result) {
      return
    }

    try {
      await submitFeedback(
        result.request_id,
        helpful,
      )

      setFeedbackState("sent")
    } catch {
      setError(
        "Feedback could not be saved.",
      )
    }
  }


  async function copySummary() {
    if (!result) {
      return
    }

    const summary = [
      `Intent: ${result.prediction.display_name}`,
      `Confidence: ${percentage(
        result.prediction.confidence,
      )}`,
      `Team: ${result.support_team}`,
      `Recommendation: ${result.recommendation}`,
    ].join("\n")

    await navigator.clipboard.writeText(
      summary,
    )
  }


  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-100">
      <Background />

      <div className="relative mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <Header />

        <section className="mb-10 max-w-4xl">
          <Badge className="mb-5 border border-cyan-400/20 bg-cyan-400/10 text-cyan-300 hover:bg-cyan-400/10">
            <Sparkles className="mr-1 size-3.5" />
            NLP-powered support triage
          </Badge>

          <h1 className="text-balance text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
            Turn every customer message into
            <span className="bg-gradient-to-r from-cyan-300 via-blue-400 to-violet-400 bg-clip-text text-transparent">
              {" "}
              the right action.
            </span>
          </h1>

          <p className="mt-5 max-w-2xl text-base leading-7 text-slate-400 sm:text-lg">
            Classify intent, route the
            ticket, retrieve similar cases,
            and escalate uncertain predictions
            for human review.
          </p>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <Card className="border-white/10 bg-white/[0.06] shadow-2xl shadow-black/20 backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-100">
                <MessageSquareText className="size-5 text-cyan-300" />
                Customer message
              </CardTitle>

              <CardDescription className="text-slate-400">
                Enter the message exactly as
                it arrived from the customer.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-5">
              <div className="relative">
                <Textarea
                  value={message}
                  onChange={(event) =>
                    setMessage(
                      event.target.value
                    )
                  }
                  maxLength={1_000}
                  placeholder="Example: My card payment was charged twice..."
                  className="min-h-44 resize-none border-white/10 bg-slate-950/50 p-4 text-base text-slate-100 placeholder:text-slate-600 focus-visible:ring-cyan-400"
                />

                <span className="absolute bottom-3 right-3 text-xs text-slate-500">
                  {message.length}/1000
                </span>
              </div>

              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wider text-slate-500">
                  Try an example
                </p>

                <div className="flex flex-wrap gap-2">
                  {EXAMPLES.map(
                    (example) => (
                      <button
                        key={example}
                        type="button"
                        onClick={() =>
                          setMessage(
                            example
                          )
                        }
                        className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-left text-xs text-slate-300 transition hover:border-cyan-400/40 hover:bg-cyan-400/10 hover:text-cyan-200"
                      >
                        {example}
                      </button>
                    ),
                  )}
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-2 rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-200">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                  {error}
                </div>
              )}

              <Button
                onClick={handleSubmit}
                disabled={loading}
                size="lg"
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/20 transition hover:scale-[1.01] hover:from-cyan-400 hover:to-blue-500"
              >
                {loading ? (
                  <>
                    <BrainCircuit className="mr-2 size-4 animate-pulse" />
                    Analysing message...
                  </>
                ) : (
                  <>
                    Analyse and route
                    <Send className="ml-2 size-4" />
                  </>
                )}
              </Button>

              <p className="flex items-center justify-center gap-2 text-center text-xs text-slate-500">
                <ShieldCheck className="size-3.5" />
                Predictions assist agents;
                they do not change accounts.
              </p>
            </CardContent>
          </Card>

          <ResultCard
            result={result}
            confidenceDescription={
              confidenceDescription
            }
            feedbackState={
              feedbackState
            }
            onFeedback={
              handleFeedback
            }
            onCopy={
              copySummary
            }
          />
        </section>

        {result && (
          <SimilarCases
            result={result}
          />
        )}

        <FeatureCards />

        <footer className="mt-12 border-t border-white/5 py-8 text-center text-xs text-slate-600">
          SupportDesk AI · Portfolio
          demonstration · Predictions
          require human verification
        </footer>
      </div>
    </main>
  )
}


function Background() {
  return (
    <div className="pointer-events-none absolute inset-0">
      <div className="absolute -left-24 top-8 h-80 w-80 rounded-full bg-cyan-500/20 blur-3xl" />

      <div className="absolute right-0 top-48 h-96 w-96 rounded-full bg-violet-500/20 blur-3xl" />

      <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-blue-500/10 blur-3xl" />
    </div>
  )
}


function Header() {
  return (
    <nav className="mb-12 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="grid size-11 place-items-center rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-600 shadow-lg shadow-cyan-500/20">
          <Bot className="size-6 text-white" />
        </div>

        <div>
          <p className="font-semibold tracking-tight">
            SupportDesk AI
          </p>

          <p className="text-xs text-slate-400">
            Intelligent ticket operations
          </p>
        </div>
      </div>

      <Badge
        variant="outline"
        className="border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
      >
        <span className="mr-2 size-2 animate-pulse rounded-full bg-emerald-400" />
        CPU friendly
      </Badge>
    </nav>
  )
}


interface ResultCardProps {
  result: PredictionResponse | null
  confidenceDescription: string
  feedbackState: "idle" | "sent"
  onFeedback: (
    helpful: boolean,
  ) => Promise<void>
  onCopy: () => Promise<void>
}


function ResultCard({
  result,
  confidenceDescription,
  feedbackState,
  onFeedback,
  onCopy,
}: ResultCardProps) {
  if (!result) {
    return (
      <Card className="border-white/10 bg-white/[0.06] shadow-2xl shadow-black/20 backdrop-blur-xl">
        <CardContent className="grid min-h-[510px] place-items-center p-8">
          <div className="max-w-sm text-center">
            <div className="mx-auto mb-5 grid size-16 place-items-center rounded-3xl border border-cyan-400/20 bg-cyan-400/10">
              <Search className="size-7 text-cyan-300" />
            </div>

            <h2 className="text-xl font-semibold text-slate-200">
              Ready to analyse
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Classification, routing,
              alternatives, and similar cases
              will appear here.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-white/10 bg-white/[0.06] shadow-2xl shadow-black/20 backdrop-blur-xl">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardDescription className="text-slate-500">
              Predicted intent
            </CardDescription>

            <CardTitle className="mt-1 text-2xl text-slate-100">
              {
                result.prediction
                  .display_name
              }
            </CardTitle>
          </div>

          <Badge
            className={
              result.human_review_required
                ? "border border-amber-400/30 bg-amber-400/10 text-amber-200"
                : "border border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
            }
          >
            {result.human_review_required ? (
              <>
                <Users className="mr-1 size-3.5" />
                Human review
              </>
            ) : (
              <>
                <CheckCircle2 className="mr-1 size-3.5" />
                Ready to route
              </>
            )}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm text-slate-400">
              {confidenceDescription}
            </span>

            <span className="font-mono text-sm font-semibold text-cyan-300">
              {percentage(
                result.prediction
                  .confidence
              )}
            </span>
          </div>

          <Progress
            value={
              result.prediction
                .confidence * 100
            }
            className="h-2 bg-slate-800"
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <InformationBox
            icon={Route}
            label="Route to"
            value={result.support_team}
          />

          <InformationBox
            icon={Clock3}
            label="Model action"
            value={
              result.human_review_required
                ? "Review manually"
                : "Queue for agent"
            }
          />
        </div>

        <div className="rounded-2xl border border-blue-400/20 bg-blue-400/10 p-4">
          <p className="text-sm leading-6 text-blue-100">
            {result.recommendation}
          </p>
        </div>

        <Separator className="bg-white/10" />

        <div>
          <h3 className="mb-3 text-sm font-medium text-slate-300">
            Alternative intents
          </h3>

          <div className="space-y-2">
            {result.alternatives.map(
              (alternative) => (
                <div
                  key={
                    alternative.category
                  }
                  className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2"
                >
                  <span className="text-sm text-slate-400">
                    {
                      alternative.display_name
                    }
                  </span>

                  <span className="font-mono text-xs text-slate-500">
                    {percentage(
                      alternative.confidence
                    )}
                  </span>
                </div>
              ),
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={onCopy}
            className="border-white/10 bg-transparent text-slate-300 hover:bg-white/10 hover:text-white"
          >
            <Clipboard className="mr-2 size-4" />
            Copy summary
          </Button>

          {feedbackState === "sent" ? (
            <Button
              variant="outline"
              disabled
              className="border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
            >
              <Check className="mr-2 size-4" />
              Feedback saved
            </Button>
          ) : (
            <>
              <Button
                variant="ghost"
                onClick={() =>
                  onFeedback(true)
                }
                className="text-slate-400 hover:bg-emerald-400/10 hover:text-emerald-300"
              >
                <ThumbsUp className="mr-2 size-4" />
                Helpful
              </Button>

              <Button
                variant="ghost"
                onClick={() =>
                  onFeedback(false)
                }
                className="text-slate-400 hover:bg-red-400/10 hover:text-red-300"
              >
                <ThumbsDown className="mr-2 size-4" />
                Incorrect
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}


interface InformationBoxProps {
  icon: typeof Route
  label: string
  value: string
}


function InformationBox({
  icon: Icon,
  label,
  value,
}: InformationBoxProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-wider text-slate-500">
        <Icon className="size-4" />
        {label}
      </div>

      <p className="font-medium text-slate-200">
        {value}
      </p>
    </div>
  )
}


function SimilarCases({
  result,
}: {
  result: PredictionResponse
}) {
  return (
    <section className="mt-6">
      <Card className="border-white/10 bg-white/[0.05] backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-slate-100">
            <Search className="size-5 text-violet-300" />
            Similar historical questions
          </CardTitle>

          <CardDescription className="text-slate-500">
            Retrieved using TF-IDF cosine
            similarity.
          </CardDescription>
        </CardHeader>

        <CardContent className="grid gap-3 md:grid-cols-3">
          {result.similar_cases.map(
            (similarCase, index) => (
              <article
                key={
                  `${similarCase.text}-${index}`
                }
                className="group rounded-2xl border border-white/10 bg-slate-950/30 p-4 transition hover:-translate-y-1 hover:border-violet-400/30 hover:bg-violet-400/[0.06]"
              >
                <div className="mb-4 flex items-center justify-between">
                  <Badge
                    variant="outline"
                    className="border-violet-400/20 text-violet-300"
                  >
                    {percentage(
                      similarCase.similarity
                    )} match
                  </Badge>

                  <ArrowRight className="size-4 text-slate-600 transition group-hover:text-violet-300" />
                </div>

                <p className="min-h-14 text-sm leading-6 text-slate-300">
                  “{similarCase.text}”
                </p>

                <p className="mt-4 text-xs text-slate-500">
                  {
                    similarCase.display_name
                  }
                </p>
              </article>
            ),
          )}
        </CardContent>
      </Card>
    </section>
  )
}


function FeatureCards() {
  const features = [
    {
      icon: BrainCircuit,
      label: "77 support intents",
      description:
        "Fine-grained multiclass NLP",
    },
    {
      icon: Search,
      label: "Similar-case retrieval",
      description:
        "TF-IDF cosine similarity",
    },
    {
      icon: Users,
      label: "Human-in-the-loop",
      description:
        "Low-confidence escalation",
    },
  ]

  return (
    <section className="mt-6 grid gap-4 sm:grid-cols-3">
      {features.map(
        (feature) => {
          const Icon = feature.icon

          return (
            <div
              key={feature.label}
              className="rounded-2xl border border-white/5 bg-white/[0.03] p-4"
            >
              <Icon className="mb-3 size-5 text-cyan-300" />

              <p className="text-sm font-medium text-slate-200">
                {feature.label}
              </p>

              <p className="mt-1 text-xs text-slate-500">
                {feature.description}
              </p>
            </div>
          )
        },
      )}
    </section>
  )
}


export default App