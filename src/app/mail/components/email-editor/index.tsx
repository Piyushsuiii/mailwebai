"use client";
import GhostExtension from "./extension";
import React from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import { StarterKit } from "@tiptap/starter-kit";
import TipTapMenuBar from "./menu-bar";
import Text from "@tiptap/extension-text";
import { Button } from "@/components/ui/button";

import { generate } from './action';
import { readStreamableValue } from 'ai/rsc';
import { Separator } from "@/components/ui/separator";
import { useThread } from "../../use-thread";
import useThreads from "../../use-threads";
import { api } from "@/trpc/react";
import { Input } from "@/components/ui/input";
import TagInput from "./tag-input";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import { useLocalStorage } from "usehooks-ts";
import { Bot, Paperclip } from "lucide-react";
import AIComposeButton from "./ai-compose-button";

type EmailEditorProps = {
    toValues: { label: string, value: string }[];
    ccValues: { label: string, value: string }[];

    subject: string;
    setSubject: (subject: string) => void;
    to: string[]
    handleSend: (value: string) => void;
    isSending: boolean;

    onToChange: (values: { label: string, value: string }[]) => void;
    onCcChange: (values: { label: string, value: string }[]) => void;

    defaultToolbarExpand?: boolean;

    // AI body injection props
    aiBody?: string;
    onAiBodyConsumed?: () => void;

    // Attachments
    attachments?: { name: string; content: string; mimeType: string; size: number }[];
    handleFileChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    removeAttachment?: (index: number) => void;
}

const EmailEditor = ({ toValues, ccValues, subject, setSubject, to, handleSend, isSending, onToChange, onCcChange, defaultToolbarExpand, aiBody, onAiBodyConsumed, attachments, handleFileChange, removeAttachment }: EmailEditorProps) => {

    const [ref] = useAutoAnimate();
    const [accountId] = useLocalStorage('accountId', '');
    const { data: suggestions } = api.mail.getEmailSuggestions.useQuery({ accountId: accountId, query: '' }, { enabled: !!accountId });


    const [expanded, setExpanded] = React.useState(defaultToolbarExpand ?? false);

    const [generation, setGeneration] = React.useState('');

    const aiGenerate = async (prompt: string) => {
        const { output } = await generate(prompt)

        for await (const delta of readStreamableValue(output)) {
            if (delta) {
                setGeneration(delta);
            }
        }

    }



    const customText = Text.extend({
        addKeyboardShortcuts() {
            return {
                "Meta-j": () => {
                    aiGenerate(this.editor.getText());
                    return true;
                },
            };
        },
    });


    const editor = useEditor({
        autofocus: false,
        extensions: [StarterKit, customText, GhostExtension],
        editorProps: {
            attributes: {
                placeholder: "Write your email here..."
            }
        },
        onUpdate: ({ editor, transaction }) => {
            setValue(editor.getHTML())
        }
    });

    React.useEffect(() => {
        if (typeof window === 'undefined') return;

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Enter' && editor && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName || '')) {
                editor.commands.focus();
            }
            if (event.key === 'Escape' && editor) {
                editor.commands.blur();
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => {
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [editor]);

    React.useEffect(() => {
        if (!generation || !editor) return;
        editor.commands.insertContent(generation)
    }, [generation, editor]);

    // AI Body typewriter effect — when aiBody is set, type it into the editor character-by-character
    React.useEffect(() => {
        if (!aiBody || !editor) return;

        // Clear any existing content first
        editor.commands.clearContent();

        let cancelled = false;
        const words = aiBody.split(' ');
        let currentIndex = 0;

        const typeNextChunk = () => {
            if (cancelled || currentIndex >= words.length) {
                // Once done, update the value and notify parent
                setValue(editor.getHTML());
                onAiBodyConsumed?.();
                return;
            }

            // Type 2-3 words at a time for a natural feel
            const chunkSize = Math.floor(Math.random() * 2) + 2;
            const chunk = words.slice(currentIndex, currentIndex + chunkSize).join(' ');
            const suffix = currentIndex + chunkSize < words.length ? ' ' : '';

            editor.commands.insertContent(chunk + suffix);
            currentIndex += chunkSize;

            // Random delay between 30-80ms per chunk for visible typing effect
            setTimeout(typeNextChunk, Math.floor(Math.random() * 50) + 30);
        };

        // Start typing after a brief delay
        const timer = setTimeout(typeNextChunk, 200);

        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [aiBody, editor]);

    const [value, setValue] = React.useState('');




    return (
        <div>
            <div className="flex p-4 py-2 border-b justify-between items-center">
                {editor && <TipTapMenuBar editor={editor} />}
            </div>

            <div ref={ref} className="p-4 pb-0 space-y-2">
                {expanded && (
                    <>
                        <TagInput suggestions={suggestions?.map(s => s.address) || []} value={toValues} placeholder="Add tags" label="To" onChange={onToChange} />
                        <TagInput suggestions={suggestions?.map(s => s.address) || []} value={ccValues} placeholder="Add tags" label="Cc" onChange={onCcChange} />
                        <Input id="subject" className="w-full" placeholder="Subject" value={subject} onChange={e => setSubject(e.target.value)} />
                    </>
                )}
                <div className="flex items-center gap-2">
                    <div className="cursor-pointer" onClick={() => setExpanded(e => !e)}>
                        <span className="text-green-600 font-medium">
                            Draft{' '}
                        </span>
                        <span>
                            to {to.join(', ')}
                        </span>
                    </div>
                    <AIComposeButton
                        isComposing={defaultToolbarExpand}
                        onGenerate={setGeneration}
                    />
                </div>
            </div>

            <div className="prose prose-invert w-full px-4">
                <EditorContent value={value} editor={editor} placeholder="Write your email here..." />
            </div>

            <Separator />

            {/* Attachments Display */}
            {attachments && attachments.length > 0 && (
                <div className="p-4 flex flex-wrap gap-2">
                    {attachments.map((file, index) => (
                        <div key={index} className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 px-3 py-2 rounded-md text-sm">
                            <span className="truncate max-w-[200px]">{file.name}</span>
                            <span className="text-gray-500 text-xs">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                            <button
                                onClick={() => removeAttachment?.(index)}
                                className="text-gray-500 hover:text-red-500 ml-2"
                            >
                                ×
                            </button>
                        </div>
                    ))}
                </div>
            )}

            <div className="py-3 px-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    {/* <span className="text-sm text-gray-500">
                        Tip: Press{" "}
                        <kbd className="px-2 py-1.5 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg">
                            Cmd + J
                        </kbd>{" "}
                        for AI autocomplete
                    </span> */}
                    <input
                        type="file"
                        multiple
                        className="hidden"
                        id="attachment-input"
                        onChange={handleFileChange}
                    />
                    <label
                        htmlFor="attachment-input"
                        className="cursor-pointer text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                        title="Attach file"
                    >
                        <Paperclip className="size-5" />
                    </label>
                </div>
                <Button onClick={async () => { editor?.commands.clearContent(); await handleSend(value) }} disabled={isSending}>
                    Send
                </Button>
            </div>
        </div>
    );
};

export default EmailEditor;
