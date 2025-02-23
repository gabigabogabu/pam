import _ from 'lodash';
import { ImapFlow, type ImapFlowOptions } from 'imapflow';
import path from 'path';
import type { UUID } from 'crypto';
import { randomUUID } from 'crypto';
import { z } from 'zod';
import dotenv from 'dotenv';
import OpenAI from 'openai';
import type { ChatCompletionMessageParam, ChatModel } from 'openai/resources/index.mjs';

dotenv.config();

type Req = Request & { params?: { [key: string]: string; } };

const cleanup: Array<() => Promise<void> | void> = [];


type Message = ChatCompletionMessageParam;
type SavedMessage = { id: UUID, timestamp: Date } & ChatCompletionMessageParam;
type Chat = SavedMessage[];

const getCompletion = async (chat: Chat, openai: OpenAI, model: ChatModel = 'gpt-4o'): Promise<string | null> => {
    const messages = chat.map(message =>
        _.omit(message, 'timestamp', 'id') as Omit<SavedMessage, 'timestamp' | 'id'>
    ) as ChatCompletionMessageParam[];
    console.debug('requesting chat completion', { messages, model });
    const response = await openai.chat.completions.create({
        messages,
        model,
    });
    console.debug('received chat completion', { messages, model, response });
    return response.choices[0].message.content;
};

/**
 * For this example input string:
 * "You are a very helpful assistant. You are tasked with managing a important person's email inbox.
 * You have access to a preconfigures ImapFlow client. Use it to help the person manage their email inbox.
 * For example you can fetch a single email by issuing this command:
 * ```js
 * return (async () => {
 *    const message = await imapClient.fetchOne('*', { source: true });
 *    return message.source.toString();
 * })();
 * ```"
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

const isCommandSafe = async (command: string, openai: OpenAI): Promise<{ isSafe: boolean, reason?: string }> => {
    const content = `\`\`\`js\n${command}\n\`\`\`
Is the previous code safe to run? It should not access anything except the ImapFlow client to help a user manage their inbox. It should not access the filesystem. It should not access the network except to access the mailbox. If it is ok, reply ONLY with "SAFE TO RUN". If it is not safe reply with a reason.`;
    try {
        const response = await getCompletion([{
            role: 'user',
            content,
            timestamp: new Date(),
            id: randomUUID()
        }], openai, 'gpt-4o-mini');
        if (!response)
            return {
                isSafe: false,
                reason: 'Failed to verify command safety'
            };
        if (response === 'SAFE TO RUN')
            return { isSafe: true };
        return {
            isSafe: false,
            reason: response || 'No reason provided'
        };
    } catch (error) {
        console.error('failed to check command safety', { command, error });
        return {
            isSafe: false,
            reason: 'Failed to verify command safety'
        };
    };
};

const executeImapCommand = async (command: string, imapFlowOpt: ImapFlowOptions): Promise<any> => {
    try {
        const imapClient = new ImapFlow(imapFlowOpt);
        await imapClient.connect();
        const executor = new Function('imapClient', command);
        const output = await executor(imapClient);
        console.debug({ command, output });
        await imapClient.logout();
        return output;
    } catch (error) {
        console.error({ command, error });
        if (error instanceof Error)
            return `Error: ${error.message}\n${error.stack}`;
        else
            return `Error: ${error}`;
    }
};

const loadChat = async (dir: string): Promise<Chat> => {
    const chatFile = path.join(dir, `chat.json`);
    if (!await Bun.file(chatFile).exists())
        return [];
    const content = await Bun.file(chatFile).json();
    const validated = z.array(z.object({
        id: z.string().uuid().default(() => randomUUID()),
        role: z.string(),
        name: z.string().optional(),
        content: z.string(),
        timestamp: z.union([z.string(), z.date()]).transform(val => new Date(val))
    })).parse(content) as Chat;
    return validated;
}

const saveChat = async (chat: Chat, dir: string) => {
    await Bun.file(path.join(dir, `chat.json`)).write(JSON.stringify(chat, null, 2));
}

const message = (chat: Chat, message: Message, hide: boolean = false) => {
    chat.push({ id: randomUUID(), timestamp: new Date(), ...message });
    if (!hide) {
        console.log(JSON.stringify({ message }, null, 2))
        console.log('')
    }
}

const validateRequest = async <
    THeaders extends z.ZodType,
    TQuery extends z.ZodType,
    TParams extends z.ZodType,
    TBody extends z.ZodType
>(schema: {
    headers?: THeaders;
    query?: TQuery;
    params?: TParams;
    body?: TBody;
}, req: Req) => {
    return {
        headers: schema.headers?.parse(req.headers.toJSON()) as z.infer<THeaders> | undefined,
        query: schema.query?.parse(Object.fromEntries(new URL(req.url).searchParams.entries())) as z.infer<TQuery> | undefined,
        params: schema.params?.parse(req.params) as z.infer<TParams> | undefined,
        body: schema.body?.parse(await req.json()) as z.infer<TBody> | undefined,
    };
};

const handleChatCompletion = async (chat: Chat, openai: OpenAI, imapFlowOpt: ImapFlowOptions, chatDir: string) => {
    let commands: string[];
    do {
        const response = await getCompletion(chat, openai);
        if (!response) throw new Error('Failed to get chat completion');
        message(chat, { role: 'assistant', content: response });
        saveChat(chat, chatDir);
        commands = parseCommands(response);
        const outputs = await Promise.all(commands.map(async command => {
            const { isSafe, reason } = await isCommandSafe(command, openai);
            if (!isSafe)
                return { output: `Command is not safe to run: ${reason}`, command };
            return { output: await executeImapCommand(command, imapFlowOpt), command };
        }));
        outputs.forEach(output => {
            message(chat, { role: 'system', content: output.command });
            let content;
            try {
                content = JSON.stringify(output.output, null, 2);
            } catch (error) {
                content = output.output;
            }
            message(chat, { role: 'system', content });
        });
        saveChat(chat, chatDir);
    } while (commands.length > 0);
};

const main = async () => {
    const env = z.object({
        EMAIL_HOST: z.string(),
        EMAIL_PORT: z.union([z.string(), z.number()]).transform(val => Number(val)).default(993),
        EMAIL_USER: z.string(),
        EMAIL_PASS: z.string(),
        OPENAI_API_KEY: z.string(),
        CHAT_DIR: z.string().default('.'),
        SERVER_PORT: z.union([z.string(), z.number()]).transform(val => Number(val)).default(3000),
    }).parse(process.env);
    const chat = await loadChat(env.CHAT_DIR);
    const imapflowOpt: ImapFlowOptions = {
        host: env.EMAIL_HOST,
        port: env.EMAIL_PORT,
        secure: true,
        auth: {
            user: env.EMAIL_USER,
            pass: env.EMAIL_PASS,
        },
        logger: false,
    }
    const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

    let userCanTalk = true;
    const testCommand = `return (async () => { await imapClient.mailboxOpen('INBOX'); const messages = await imapClient.search({ seen: false }); return messages?.length || 0; })();`;
    // check if imap client is working
    const output = await executeImapCommand(testCommand, imapflowOpt);
    if (output === undefined) throw new Error('Imap client is not working');

    if (chat.length === 0) {
        message(chat, { role: 'developer', content: `You are a very helpful assistant. You are tasked with managing an important person's email inbox.\nYou have access to a preconfigured ImapFlow client.\n\`\`\`js\nimport { ImapFlow } from 'imapflow';\nconst imapClient = new ImapFlow({\n\thost: env.EMAIL_HOST,\n\tport: env.EMAIL_PORT,\n\tsecure: true,\n\tauth: {\n\t\tuser: env.EMAIL_USER,\n\t\tpass: env.EMAIL_PASS,\n\t},\n\tlogger: false,});\nawait imapClient.connect();\n\`\`\`\nUse it to help the person manage their email inbox. Do not use logging as a means of returning data. Instead, return the data directly from the function. The code you submit will be awaited.\nThe person is just starting their day. Start by fetching useful information from their email inbox and give the user an overview.` });
        // practice run
        message(chat, { role: 'user', content: 'How many unread mails do I have?' });
        message(chat, { role: 'assistant', content: `Let's see how many unread emails there are\n\`\`\`js\n${testCommand}\n\`\`\`` });
        message(chat, { role: 'system', content: `\`\`\`js\n${testCommand}\n\`\`\`` });
        const output = await executeImapCommand(testCommand, imapflowOpt);
        message(chat, { role: 'system', content: JSON.stringify(output, null, 2) });
        message(chat, { role: 'assistant', content: `You have ${output} unread emails.` });
        saveChat(chat, env.CHAT_DIR);
    } else {
    }

    const routes = {} as Record<string, (req: Req) => Promise<Response>>;
    const app = (
        path: string,
        handler: (req: Req) => Promise<Response>
    ) => {
        const regex = new RegExp(`^${path.replace(/\/:(\w+)/g, '/(?<$1>[^/]+)')}$`);
        routes[regex.source] = handler;
    };

    const staticFileHandler = async (path: string) => {
        const file = Bun.file(path);
        if (!await file.exists()) return new Response(undefined, { status: 404 });
        return new Response(file);
    };

    app('/', async (req) => {
        return staticFileHandler('./public/index.html');
    });

    app('/api/chat', async (req) => {
        switch (req.method) {
            case 'GET':
                return new Response(JSON.stringify({ chat, userCanTalk }), { status: 200 });
            case 'POST':
                const validated = await validateRequest({
                    body: z.object({
                        content: z.string(),
                    }),
                }, req);
                if (!validated.body) return new Response(undefined, { status: 400 });
                if (!userCanTalk) return new Response(JSON.stringify({ error: 'ASSISTANT_PROCESSING' }), { status: 429 });

                const msg: Message = {
                    role: 'user',
                    content: validated.body.content,
                }
                userCanTalk = false;  // Disable input while processing
                message(chat, msg);
                saveChat(chat, env.CHAT_DIR);
                // Trigger async completion without waiting
                handleChatCompletion(chat, openai, imapflowOpt, env.CHAT_DIR)
                    .then(() => { userCanTalk = true; })
                    .catch(error => {
                        console.error(error);
                        userCanTalk = true;
                    });
                return new Response(JSON.stringify({ chat, userCanTalk }), { status: 201 });
            default:
                return new Response(undefined, { status: 405 });
        }
    });

    const server = Bun.serve({
        port: env.SERVER_PORT,
        fetch: async (req, server) => {
            const now = new Date();
            console.log(`${now} ${req.method} ${req.url}`);
            console.debug(`${server.pendingRequests} pending requests`);
            const path = new URL(req.url).pathname;
            for (const [route, handler] of Object.entries(routes)) {
                const result = path.match(route);
                if (!result) continue;
                const expendedReq = req as Req;
                expendedReq.params = result?.groups;
                const response = await handler(expendedReq);
                const took = new Date().getTime() - now.getTime();
                console.log(`${now} ${req.method} ${req.url} ${response.status} ${took}ms`);
                return response;
            }
            return new Response(undefined, { status: 404 })
        },
        error: (error) => {
            console.error(error);
            return new Response(undefined, { status: 500 });
        }
    })
    console.log(`Server running on http://${server.hostname}:${server.port}`);

    await Promise.all(cleanup.map(fn => fn()));
};

main().catch(console.error);