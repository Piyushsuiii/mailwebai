import dynamic from "next/dynamic"
import { validateRequest } from "@/lib/auth"
import { redirect } from "next/navigation"

const MailPage = dynamic(() => import("@/app/mail"), {
  loading: () => (
    <div className="flex flex-col items-center justify-center py-16 space-y-6 animate-fade-in h-screen">
      {/* Animated Spinner */}
      <div className="relative">
        <div className="h-16 w-16 rounded-full border-4 border-muted border-t-primary animate-spin"></div>
        <div className="absolute inset-0 flex items-center justify-center text-xs font-medium text-primary">
          Loading
        </div>
      </div>

      {/* Animated Dots */}
      <div className="flex space-x-1 text-muted-foreground text-lg font-medium">
        <span className="animate-bounce [animation-delay:-0.3s]">.</span>
        <span className="animate-bounce [animation-delay:-0.15s]">.</span>
        <span className="animate-bounce">.</span>
      </div>

      {/* Optional Progress Bar */}
      <div className="w-64 h-2 bg-muted rounded-full overflow-hidden">
        <div className="h-full bg-primary animate-[loading_2s_ease-in-out_infinite]"></div>
      </div>

      <p className="text-sm text-muted-foreground">
        Preparing your experience...
      </p>
    </div>
  ),
  ssr: false,
})

export default async function MailPageRoute() {
  const { user } = await validateRequest()

  if (!user) {
    return redirect("/sign-in")
  }

  return <MailPage />
}
