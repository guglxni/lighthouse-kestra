import { Suspense } from "react";
import { AuthCard } from "@/components/auth/AuthCard";

export const dynamic = "force-dynamic";

export default function SignupPage() {
  return (
    <div className="relative isolate min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-grid-fade" />
      <main className="relative mx-auto flex min-h-screen max-w-6xl items-center justify-center px-6 py-20">
        <Suspense>
          <AuthCard mode="signup" />
        </Suspense>
      </main>
    </div>
  );
}
