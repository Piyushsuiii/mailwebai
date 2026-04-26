'use server'

import { validateRequest } from "@/lib/auth";
import { stripe } from "./stripe";
import { redirect } from "next/navigation";
import { db } from "@/server/db";
import { cacheGet, cacheSet, cacheDel } from "./redis";

const SUBSCRIPTION_CACHE_TTL = 300; // 5 minutes

export async function createCheckoutSession() {
    const { user } = await validateRequest();
    const userId = user?.id;

    if (!userId) {
        throw new Error('User not found');
    }

    const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
            {
                price: process.env.STRIPE_PRICE_ID,
                quantity: 1,
            },
        ],
        mode: 'subscription',
        success_url: `${process.env.NEXT_PUBLIC_URL}/mail`,
        cancel_url: `${process.env.NEXT_PUBLIC_URL}/pricing`,
        client_reference_id: userId.toString(),
    });

    redirect(session.url!);
}

export async function createBillingPortalSession() {
    const { user } = await validateRequest();
    const userId = user?.id;
    if (!userId) {
        return false
    }
    const subscription = await db.stripeSubscription.findUnique({
        where: { userId: userId },
    });
    if (!subscription?.customerId) {
        throw new Error('Subscription not found');
    }
    const session = await stripe.billingPortal.sessions.create({
        customer: subscription.customerId,
        return_url: `${process.env.NEXT_PUBLIC_URL}/pricing`,
    });
    redirect(session.url!)
}

export async function getSubscriptionStatus() {
    const { user } = await validateRequest();
    const userId = user?.id;
    if (!userId) {
        return false
    }

    // Check Redis cache first
    const cacheKey = `sub:status:${userId}`;
    const cached = await cacheGet<boolean>(cacheKey);
    if (cached !== null) {
        return cached;
    }

    // Cache miss — query DB
    const subscription = await db.stripeSubscription.findUnique({
        where: { userId: userId },
    });
    if (!subscription) {
        await cacheSet(cacheKey, false, SUBSCRIPTION_CACHE_TTL);
        return false;
    }

    const isActive = subscription.currentPeriodEnd > new Date();
    await cacheSet(cacheKey, isActive, SUBSCRIPTION_CACHE_TTL);
    return isActive;
}

/**
 * Invalidate subscription cache when Stripe sends a webhook event.
 * Call this from your Stripe webhook handler.
 */
export async function invalidateSubscriptionCache(userId: string) {
    await cacheDel(`sub:status:${userId}`);
}

