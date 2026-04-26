'use client'
import { Button } from "@/components/ui/button"
import {
    Drawer,
    DrawerClose,
    DrawerContent,
    DrawerDescription,
    DrawerFooter,
    DrawerHeader,
    DrawerTitle,
    DrawerTrigger,
} from "@/components/ui/drawer"
import { Pencil } from "lucide-react"

import React from 'react'
import EmailEditor from "./email-editor"
import { api } from "@/trpc/react"
import { useLocalStorage } from "usehooks-ts"
import { toast } from "sonner"
import { useAIAction } from "../use-ai-action"
import { uploadToS3 } from "@/lib/s3"

const ComposeButton = () => {
    const [open, setOpen] = React.useState(false)
    const [accountId] = useLocalStorage('accountId', '')
    const [toValues, setToValues] = React.useState<{ label: string; value: string; }[]>([])
    const [ccValues, setCcValues] = React.useState<{ label: string; value: string; }[]>([])
    const [subject, setSubject] = React.useState<string>('')
    const [aiBody, setAiBody] = React.useState<string>('')
    const { data: account } = api.mail.getMyAccount.useQuery({ accountId })
    const [attachments, setAttachments] = React.useState<{ name: string; content: string; mimeType: string; size: number }[]>([])

    const [aiAction, setAIAction] = useAIAction()

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || [])
        if (files.length === 0) return

        const currentSize = attachments.reduce((acc, curr) => acc + curr.size, 0)
        const newSize = files.reduce((acc, curr) => acc + curr.size, 0)

        // Separate files into small (<20MB) and large (>20MB)
        const smallFiles = files.filter(f => f.size <= 20 * 1024 * 1024)
        const largeFiles = files.filter(f => f.size > 20 * 1024 * 1024)

        if (largeFiles.length > 0) {
            toast.promise(
                Promise.all(largeFiles.map(async (file) => {
                    const url = await uploadToS3(file)
                    return { name: file.name, url }
                })),
                {
                    loading: 'Uploading large files...',
                    success: (uploadedFiles) => {
                        const links = uploadedFiles.map(f => `<p>Attachment: <a href="${f.url}" target="_blank">${f.name}</a></p>`).join('')
                        setAiBody(prev => prev + links)
                        return 'Large files uploaded and linked'
                    },
                    error: 'Failed to upload large files'
                }
            )
        }

        if (smallFiles.length > 0) {
            if (currentSize + smallFiles.reduce((acc, curr) => acc + curr.size, 0) > 20 * 1024 * 1024) {
                toast.error("Total size of small attachments cannot exceed 20MB")
                return
            }

            const newAttachments = await Promise.all(
                smallFiles.map(async (file) => {
                    const content = await new Promise<string>((resolve) => {
                        const reader = new FileReader()
                        reader.onload = () => {
                            const base64 = (reader.result as string).split(',')[1]
                            resolve(base64)
                        }
                        reader.readAsDataURL(file)
                    })
                    return {
                        name: file.name,
                        content,
                        mimeType: file.type,
                        size: file.size
                    }
                })
            )
            setAttachments(prev => [...prev, ...newAttachments])
        }
    }

    const removeAttachment = (index: number) => {
        setAttachments(prev => prev.filter((_, i) => i !== index))
    }

    // Listen for AI compose_email actions
    React.useEffect(() => {
        if (aiAction?.type !== 'compose_email') return

        const fillFields = async () => {
            // Step 1: Open drawer
            setOpen(true)

            // Step 2: Fill fields with staggered delays for visible effect
            await delay(400) // let drawer animate open
            setToValues(aiAction.to.map(email => ({ label: email, value: email })))

            await delay(250)
            if (aiAction.cc && aiAction.cc.length > 0) {
                setCcValues(aiAction.cc.map(email => ({ label: email, value: email })))
                await delay(250)
            }

            setSubject(aiAction.subject)

            await delay(300)
            // Set body — pass to EmailEditor which will type it in
            setAiBody(aiAction.body || '')
        }

        fillFields()
        setAIAction(null) // clear the action
    }, [aiAction])

    React.useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'c' && (event.ctrlKey || event.metaKey) && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName || '')) {
                event.preventDefault();
                setOpen(true);
            }
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, []);

    const sendEmail = api.mail.sendEmail.useMutation()

    const handleSend = async (value: string) => {
        console.log(account)
        console.log({ value })
        if (!account) return
        sendEmail.mutate({
            accountId,
            threadId: undefined,
            body: value,
            subject,
            from: { name: account?.name ?? 'Me', address: account?.emailAddress ?? 'me@example.com' },
            to: toValues.map(to => ({ name: to.value, address: to.value })),
            cc: ccValues.map(cc => ({ name: cc.value, address: cc.value })),
            replyTo: { name: account?.name ?? 'Me', address: account?.emailAddress ?? 'me@example.com' },
            inReplyTo: undefined,
            attachments: attachments.map(a => ({
                name: a.name,
                content: a.content,
                mimeType: a.mimeType,
                size: a.size
            }))
        }, {
            onSuccess: () => {
                toast.success("Email sent")
                setOpen(false)
                // Reset fields
                setToValues([])
                setCcValues([])
                setSubject('')
                setAiBody('')
                setAttachments([])
            },
            onError: (error) => {
                console.log(error)
                toast.error(error.message)
            }
        })
    }


    return (
        <Drawer open={open} onOpenChange={setOpen}>
            <DrawerTrigger asChild>
                <Button>
                    <Pencil className='size-4 mr-1' />
                    Compose
                </Button>
            </DrawerTrigger>
            <DrawerContent className="">
                <DrawerHeader>
                    <DrawerTitle>Compose Email</DrawerTitle>
                    <EmailEditor
                        toValues={toValues}
                        ccValues={ccValues}

                        onToChange={(values) => {
                            setToValues(values)
                        }}
                        onCcChange={(values) => {
                            setCcValues(values)
                        }}

                        subject={subject}
                        setSubject={setSubject}

                        to={toValues.map(to => to.value)}
                        handleSend={handleSend}
                        isSending={sendEmail.isPending}

                        attachments={attachments}
                        handleFileChange={handleFileChange}
                        removeAttachment={removeAttachment}

                        defaultToolbarExpand
                        aiBody={aiBody}
                        onAiBodyConsumed={() => setAiBody('')}
                    />
                </DrawerHeader>
            </DrawerContent>

        </Drawer>
    )
}

function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

export default ComposeButton