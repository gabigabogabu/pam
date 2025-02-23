import { randomUUID, type UUID } from 'crypto';
import dotenv from 'dotenv';
import { ImapFlow, type ImapFlowOptions } from 'imapflow';
import _ from 'lodash';
import OpenAI from 'openai';
import type { ChatCompletionMessageParam, ChatModel } from 'openai/resources/index.mjs';
import { z } from 'zod';

type Req = Request & { params?: { [key: string]: string; } };
type Message = { id: UUID; timestamp: Date; } & ChatCompletionMessageParam;

dotenv.config();

const env = z.object({
    OPENAI_API_KEY: z.string(),
    SERVER_PORT: z.union([z.string(), z.number()]).transform(val => Number(val)).default(3000),
}).parse(process.env);

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

const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

const getCompletion = async (chat: Message[], openai: OpenAI, model: ChatModel = 'gpt-4o'): Promise<string | null> => {
    const messages = chat.map(message =>
        _.omit(message, 'timestamp', 'id') as ChatCompletionMessageParam
    );
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
    const codeBlockRegex = /```(?:js|javascript)\n([\s\S]*?)```/g;
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
    const imapClient = new ImapFlow(imapFlowOpt);
    try {
        await imapClient.connect();
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
    } finally {
        await imapClient.logout();
    }
};

const handleChatCompletion = async (messages: Message[], imapFlowOpt: ImapFlowOptions): Promise<ReadableStream> => {
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();
    const encoder = new TextEncoder();

    (async () => {
        try {
            let commands: string[];
            do {
                const response = await getCompletion(messages, openai);
                if (!response) throw new Error('Failed to get chat completion');
                const assistantMsg = { role: 'assistant', content: response, id: randomUUID(), timestamp: new Date() };
                await writer.write(encoder.encode(`data: ${JSON.stringify(assistantMsg)}\n\n`));

                commands = parseCommands(response);
                for (const command of commands) {
                    const { isSafe, reason } = await isCommandSafe(command, openai);
                    const systemMsg = { role: 'developer', content: command, id: randomUUID(), timestamp: new Date() } as Message;
                    messages.push(systemMsg);
                    await writer.write(encoder.encode(`data: ${JSON.stringify(systemMsg)}\n\n`));

                    if (!isSafe) {
                        const errorMsg = { role: 'developer', content: `Command is not safe to run: ${reason}`, id: randomUUID(), timestamp: new Date() } as Message;
                        messages.push(errorMsg);
                        await writer.write(encoder.encode(`data: ${JSON.stringify(errorMsg)}\n\n`));
                        continue;
                    }

                    const output = await executeImapCommand(command, imapFlowOpt).catch(error => {
                        console.error('Error executing command:', error);
                        return `Error: ${error}`;
                    });
                    const outputMsg = { role: 'developer', content: JSON.stringify(output, null, 2), id: randomUUID(), timestamp: new Date() } as Message;
                    messages.push(outputMsg);
                    await writer.write(encoder.encode(`data: ${JSON.stringify(outputMsg)}\n\n`));
                }
            } while (commands.length > 0);
        } catch (error) {
            console.error('Error in chat completion:', error);
            const errorMsg = { role: 'developer', content: 'An error occurred while processing your request', id: randomUUID(), timestamp: new Date() } as Message;
            messages.push(errorMsg);
            await writer.write(encoder.encode(`data: ${JSON.stringify(errorMsg)}\n\n`));
        } finally {
            console.debug('closing stream');
            await writer.close();
        }
    })();

    return stream.readable;
};

const routes = {} as Record<string, (req: Req) => Promise<Response>>;
const app = (path: string, handler: (req: Req) => Promise<Response>) => {
    const regex = new RegExp(`^${path.replace(/\/:(\w+)/g, '/(?<$1>[^/]+)')}$`);
    routes[regex.source] = handler;
};

app('/', async (req) => {
    return new Response(Bun.file('./public/index.html'));
});

app('/api/chat', async (req) => {
    if (req.method !== 'POST') return new Response(undefined, { status: 405 });

    const validated = await validateRequest({
        body: z.object({
            messages: z.array(z.object({
                id: z.string().uuid(),
                role: z.enum(['user', 'assistant', 'developer']),
                content: z.string(),
                timestamp: z.string().transform(val => new Date(val))
            })).transform((msgs): Message[] => msgs.map(msg => ({ ...msg, id: msg.id as UUID }))),
            imapConfig: z.object({
                host: z.string(),
                port: z.number(),
                secure: z.boolean(),
                auth: z.object({
                    user: z.string(),
                    pass: z.string(),
                })
            })
        }),
    }, req);
    if (!validated.body) return new Response(undefined, { status: 400 });

    const stream = await handleChatCompletion(
        validated.body.messages,
        { ...validated.body.imapConfig, logger: false }
    );

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
        }
    });
});

const main = async () => {
    const server = Bun.serve({
        port: env.SERVER_PORT,
        idleTimeout: 60,
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
};

main().catch(console.error);