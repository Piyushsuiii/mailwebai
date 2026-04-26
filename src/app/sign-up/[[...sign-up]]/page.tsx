"use client"

import { useState } from "react";
import { signUp } from "@/lib/auth-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";

export default function Page() {
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    async function handleSubmit(formData: FormData) {
        setIsLoading(true);
        setError(null);
        const res = await signUp(formData);
        if (res?.error) {
            setError(res.error);
        }
        setIsLoading(false);
    }

    return (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-4">
            <div className="w-full max-w-sm p-8 space-y-6 bg-white dark:bg-zinc-900 rounded-xl shadow-lg border border-zinc-200 dark:border-zinc-800">
                <div className="space-y-2 text-center">
                    <h1 className="text-3xl font-bold tracking-tight">Create an account</h1>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        Enter your information to get started
                    </p>
                </div>
                <form action={handleSubmit} className="space-y-4">
                    {error && (
                        <div className="p-3 text-sm text-red-500 bg-red-50 dark:bg-red-900/10 rounded-md border border-red-200 dark:border-red-900/50">
                            {error}
                        </div>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label htmlFor="firstName" className="text-sm font-medium leading-none">
                                First name
                            </label>
                            <Input id="firstName" name="firstName" placeholder="Max" required />
                        </div>
                        <div className="space-y-2">
                            <label htmlFor="lastName" className="text-sm font-medium leading-none">
                                Last name
                            </label>
                            <Input id="lastName" name="lastName" placeholder="Robinson" required />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label htmlFor="emailAddress" className="text-sm font-medium leading-none">
                            Email
                        </label>
                        <Input id="emailAddress" name="emailAddress" type="email" placeholder="m@example.com" required />
                    </div>
                    <div className="space-y-2">
                        <label htmlFor="password" className="text-sm font-medium leading-none">
                            Password
                        </label>
                        <Input id="password" name="password" type="password" required />
                    </div>
                    <Button type="submit" className="w-full" disabled={isLoading}>
                        {isLoading ? "Signing up..." : "Sign up"}
                    </Button>
                </form>
                <div className="text-center text-sm">
                    Already have an account?{" "}
                    <Link href="/sign-in" className="font-medium text-primary hover:underline">
                        Sign in
                    </Link>
                </div>
            </div>
        </div>
    );
}