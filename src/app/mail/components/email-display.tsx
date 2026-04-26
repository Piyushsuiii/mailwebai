'use client'
import Avatar from 'react-avatar';
import { Letter } from 'react-letter';
import { api, type RouterOutputs } from '@/trpc/react'
import React from 'react'
import { useLocalStorage } from 'usehooks-ts'
import useThreads from '../use-threads';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

type Props = {
    email: RouterOutputs['mail']['getThreads'][number]['emails'][number]
}

const EmailDisplay = ({ email }: Props) => {
    const { account } = useThreads()
    const letterRef = React.useRef<HTMLDivElement>(null);


    React.useEffect(() => {
        if (letterRef.current) {
            const gmailQuote = letterRef.current.querySelector('div[class*="_gmail_quote"]');
            if (gmailQuote) {
                gmailQuote.innerHTML = '';
            }
        }
    }, [email]);

    const isMe = account?.emailAddress === email.from.address

    return (
        <div className={cn(
            'border border-white/10 rounded-xl p-5 cursor-pointer transition-all duration-200',
            'bg-white/[0.03] backdrop-blur-sm',
            'hover:bg-white/[0.06] hover:border-white/20 hover:shadow-lg hover:shadow-black/20',
            {
                'border-l-2 border-l-blue-400/70': isMe
            }
        )} ref={letterRef}>
            <div className="flex items-center justify-between gap-2">
                <div className='flex items-center gap-3'>
                    {!isMe && <Avatar name={email.from.name ?? email.from.address} email={email.from.address} size='35' textSizeRatio={2} round={true} />}
                    <span className='font-medium text-white/90'>
                        {isMe ? 'Me' : email.from.address}
                    </span>
                </div>
                <p className='text-xs text-white/40'>
                    {formatDistanceToNow(email.sentAt ?? new Date(), {
                        addSuffix: true,
                    })}
                </p>
            </div>
            <div className="h-4"></div>
            <div className="email-body-wrapper rounded-lg overflow-hidden">
                <Letter className='rounded-lg' html={email?.body ?? ""} />
            </div>
        </div>
    )
}

export default EmailDisplay