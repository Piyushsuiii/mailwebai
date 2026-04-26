"use client"

import { useState } from "react";
import { signIn } from "@/lib/auth-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";

export default function Page() {
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    async function handleSubmit(formData: FormData) {
        setIsLoading(true);
        setError(null);
        const res = await signIn(formData);
        if (res?.error) {
            setError(res.error);
        }
        setIsLoading(false);
    }

    return (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-4">
            <div className="w-full max-w-sm p-8 space-y-6 bg-white dark:bg-zinc-900 rounded-xl shadow-lg border border-zinc-200 dark:border-zinc-800">
                <div className="space-y-2 text-center">
                    <h1 className="text-3xl font-bold tracking-tight">Welcome back</h1>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        Enter your email to sign in to your account
                    </p>
                </div>
                <form action={handleSubmit} className="space-y-4">
                    {error && (
                        <div className="p-3 text-sm text-red-500 bg-red-50 dark:bg-red-900/10 rounded-md border border-red-200 dark:border-red-900/50">
                            {error}
                        </div>
                    )}
                    <div className="space-y-2">
                        <label htmlFor="emailAddress" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                            Email
                        </label>
                        <Input id="emailAddress" name="emailAddress" type="email" placeholder="m@example.com" required />
                    </div>
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <label htmlFor="password" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                Password
                            </label>
                        </div>
                        <Input id="password" name="password" type="password" required />
                    </div>
                    <Button type="submit" className="w-full" disabled={isLoading}>
                        {isLoading ? "Signing in..." : "Sign in"}
                    </Button>
                </form>
                <div className="text-center text-sm">
                    Don&apos;t have an account?{" "}
                    <Link href="/sign-up" className="font-medium text-primary hover:underline">
                        Sign up
                    </Link>
                </div>
            </div>
        </div>
    );
}