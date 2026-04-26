"use server"

import { lucia } from "@/lib/auth";
import { db } from "@/server/db";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Argon2id } from "oslo/password";

export async function signUp(formData: FormData) {
    const emailAddress = formData.get("emailAddress") as string;
    const password = formData.get("password") as string;
    const firstName = formData.get("firstName") as string;
    const lastName = formData.get("lastName") as string;

    if (!emailAddress || !password) {
        return { error: "Email and password are required" };
    }

    try {
        const hashedPassword = await new Argon2id().hash(password);

        const user = await db.user.create({
            data: {
                emailAddress,
                password: hashedPassword,
                firstName,
                lastName
            }
        });

        const session = await lucia.createSession(user.id, {});
        const sessionCookie = lucia.createSessionCookie(session.id);
        cookies().set(sessionCookie.name, sessionCookie.value, sessionCookie.attributes);

        redirect("/mail");
    } catch (e) {
        return { error: "An error occurred during sign up" };
    }
}

export async function signIn(formData: FormData) {
    const emailAddress = formData.get("emailAddress") as string;
    const password = formData.get("password") as string;

    if (!emailAddress || !password) {
        return { error: "Email and password are required" };
    }

    const user = await db.user.findUnique({
        where: { emailAddress }
    });

    if (!user) {
        return { error: "Invalid email or password" };
    }

    const validPassword = await new Argon2id().verify(user.password, password);
    if (!validPassword) {
        return { error: "Invalid email or password" };
    }

    const session = await lucia.createSession(user.id, {});
    const sessionCookie = lucia.createSessionCookie(session.id);
    cookies().set(sessionCookie.name, sessionCookie.value, sessionCookie.attributes);

    redirect("/mail");
}

export async function signOut() {
    const sessionId = cookies().get(lucia.sessionCookieName)?.value ?? null;
    if (sessionId) {
        await lucia.invalidateSession(sessionId);
        const sessionCookie = lucia.createBlankSessionCookie();
        cookies().set(sessionCookie.name, sessionCookie.value, sessionCookie.attributes);
    }
    redirect("/sign-in");
}
