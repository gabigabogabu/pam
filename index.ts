import _ from 'lodash';
import { ImapFlow } from 'imapflow';
import path from 'path';
import { z } from 'zod';
import dotenv from 'dotenv';
import OpenAI from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources/index.mjs';

dotenv.config();

const cleanup: Array<() => Promise<void> | void> = [];

const env = z.object({
    EMAIL_HOST: z.string(),
    EMAIL_PORT: z.union([z.string(), z.number()]).transform(val => Number(val)).default(993),
    EMAIL_USER: z.string(),
    EMAIL_PASS: z.string(),
    OPENAI_API_KEY: z.string(),
    CHAT_DIR: z.string().default('.'),
}).parse(process.env);

const imapClient = new ImapFlow({
    host: env.EMAIL_HOST,
    port: env.EMAIL_PORT,
    secure: true,
    auth: {
        user: env.EMAIL_USER,
        pass: env.EMAIL_PASS,
    },
    logger: false,
});

const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

type Message = ChatCompletionMessageParam;
type MessageWithTime = ChatCompletionMessageParam & { timestamp: Date };
type Chat = MessageWithTime[];

const loadPrompts = async () => {
    const promptsDir = './prompts';
    const promptFiles = await Array.fromAsync(new Bun.Glob('*.{txt,md}').scan({ cwd: promptsDir }));
    const promises = promptFiles.map(async (file) => {
        const content = await Bun.file(path.join(promptsDir, file)).text();
        const name = file.split('/').pop()?.replace(/\.(txt|md)$/, '');
        return [name, content];
    });
    const prompts = Object.fromEntries(await Promise.all(promises));
    const validated = z.object({
        startup: z.string(),
        imapflowApi: z.string()
    }).parse(prompts);
    return validated;
}

const getCompletion = async (chat: Chat): Promise<string | null> => {
    const messages = chat.map(message => _.omit(message, 'timestamp'));
    const response = await openai.chat.completions.create({
        messages,
        model: 'gpt-4o',
    });
    return response.choices[0].message.content;
};

/**
 * For this example input string:
 * You are a very helpful assistant. You are tasked with managing a important person's email inbox.
 * You have access to a preconfigures ImapFlow client. Use it to help the person manage their email inbox.
 * For example you can fetch a single email by issuing this command:
 * ```js
 * return (async () => {
 *    const message = await imapClient.fetchOne('*', { source: true });
 *    return message.source.toString();
 * })();
 * ```
 * The output is:
 * [`return (async () => {
 *    const message = await imapClient.fetchOne('*', { source: true });
 *    return message.source.toString();
 * })();`]
 * @param input natural language input with potential code blocks
 * @returns parsed commands from code blocks
 */
const parseCommands = (input: string): string[] => {
    const codeBlockRegex = /```js\n([\s\S]*?)```/g;
    const matches = [...input.matchAll(codeBlockRegex)];
    return matches.map(match => match[1].trim());
};

const executeImapCommand = async (imapClient: ImapFlow, command: string): Promise<unknown> => {
    try {
        const executor = new Function('imapClient', command);
        const output = await executor(imapClient);
        console.debug({ command, output });
        return output;
    } catch (error) {
        console.error({ command, error });
        if (error instanceof Error)
            return `Error: ${error.message}\n${error.stack}`;
        else
            return `Error: ${error}`;
    }
};

const loadChat = async (): Promise<Chat> => {
    const chatFile = path.join(env.CHAT_DIR, `chat.json`);
    if (!await Bun.file(chatFile).exists())
        return [];
    const content = await Bun.file(chatFile).json();
    const validated = z.array(z.object({
        role: z.enum(['developer', 'assistant', 'user', 'system']),
        content: z.string(),
        timestamp: z.union([z.string(), z.date()]).transform(val => new Date(val))
    })).parse(content);
    return validated;
}

const saveChat = async (chat: Chat) => {
    await Bun.file(path.join(env.CHAT_DIR, `chat.json`)).write(JSON.stringify(chat, null, 2));
}

const message = (chat: Chat, message: Message, hide: boolean = false) => {
    chat.push({ ...message, timestamp: new Date() });
    if (!hide) {
        console.log(JSON.stringify({ message }, null, 2))
        console.log('')
    }
}

/**
 * Run a limited number of promises in parallel
 * @param promises Promises to run in parallel
 * @param options Configuration options
 * @param options.concurrency Number of promises to run in parallel. Defaults to 1
 * @returns results of all promises
 */
const pAll = async <T>(promises: Promise<T>[], options?: { concurrency?: number }): Promise<T[]> => {
    const chunks = _.chunk(promises, options?.concurrency)
    const results: T[] = []
    for (const chunk of chunks)
        results.push(...await Promise.all(chunk))
    return results
};

const main = async () => {
    let chat: Chat = await loadChat();

    const prompts = await loadPrompts();

    await imapClient.connect();
    cleanup.push(() => imapClient.logout());

    if (chat.length === 0) {
        // message(chat, { role: 'developer', content: prompts.imapflowApi }, true);
        message(chat, { role: 'developer', content: prompts.startup });
    }

    while (true) {
        const response = await getCompletion(chat);
        if (!response) {
            console.error('Failed to get completion from OpenAI');
            process.exit(1);
        }
        message(chat, { role: 'assistant', content: response });
        saveChat(chat);
        const commands = parseCommands(response);
        if (commands?.length > 0) {
            const outputs = await pAll(commands.map(async command => ({
                command,
                output: await executeImapCommand(imapClient, command)
            })), { concurrency: 4 });
            outputs.forEach(output => {
                message(chat, { role: 'system', content: output.command });
                let content;
                try {
                    content = JSON.stringify(output.output, null, 2);
                } catch (error) {
                    content = output.output;
                }
                message(chat, { role: 'system', content })
            });
        } else {
            let userInput
            while (!userInput) {
                userInput = prompt('> ');
            }
            message(chat, { role: 'user', content: userInput });
            saveChat(chat);
        }
    }

    await Promise.all(cleanup.map(fn => fn()));
};

main().catch(console.error);