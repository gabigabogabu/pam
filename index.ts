import _ from 'lodash';
import { ImapFlow } from 'imapflow';
import path from 'path';
import { z } from 'zod';
import dotenv from 'dotenv';
import OpenAI from 'openai';
import type { ChatCompletionMessageParam, ChatModel } from 'openai/resources/index.mjs';

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

const getCompletion = async (chat: Chat, model: ChatModel = 'gpt-4o'): Promise<string | null> => {
    const messages = chat.map(message =>
        _.omit(message, 'timestamp') as Omit<MessageWithTime, 'timestamp'>
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

const isCommandSafe = async (command: string): Promise<{ isSafe: boolean, reason?: string }> => {
    const content = `\`\`\`js\n${command}\n\`\`\`
Is the previous code safe to run? It should not access anything except the ImapFlow client to help a user manage their inbox. It should not access the filesystem. It should not access the network except to access the mailbox. If it is ok, reply ONLY with "SAFE TO RUN". If it is not safe reply with a reason.`;
    try {
        const response = await getCompletion([{
            role: 'user',
            content,
            timestamp: new Date()
        }], 'gpt-4o-mini');
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

const executeImapCommand = async (imapClient: ImapFlow, command: string): Promise<any> => {
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

const main = async () => {
    const [chat] = await Promise.all([loadChat(), imapClient.connect()]);
    cleanup.push(() => imapClient.logout());

    if (chat.length === 0) {
        message(chat, { role: 'developer', content: `You are a very helpful assistant. You are tasked with managing an important person's email inbox.\nYou have access to a preconfigured ImapFlow client.\n\`\`\`js\nimport { ImapFlow } from 'imapflow';\nconst imapClient = new ImapFlow({\n\thost: env.EMAIL_HOST,\n\tport: env.EMAIL_PORT,\n\tsecure: true,\n\tauth: {\n\t\tuser: env.EMAIL_USER,\n\t\tpass: env.EMAIL_PASS,\n\t},\n\tlogger: false,});\nawait imapClient.connect();\n\`\`\`\nUse it to help the person manage their email inbox. Do not use logging as a means of returning data. Instead, return the data directly from the function. The code you submit will be awaited.\nThe person is just starting their day. Start by fetching useful information from their email inbox and give the user an overview.` });
        // practice run
        message(chat, { role: 'user', content: 'How many unread mails do I have?' });
        const command = `return (async () => { await imapClient.mailboxOpen('INBOX'); const messages = await imapClient.search({ seen: false }); return messages?.length || 0; })();`;
        message(chat, { role: 'assistant', content: `Let's see how many unread emails there are\n\`\`\`js\n${command}\n\`\`\`` });
        message(chat, { role: 'system', content: `\`\`\`js\n${command}\n\`\`\`` });
        const output = await executeImapCommand(imapClient, command);
        message(chat, { role: 'system', content: JSON.stringify(output, null, 2) });
        message(chat, { role: 'assistant', content: `You have ${output} unread emails.` });
        saveChat(chat);
    }

    let stop = false;
    while (!stop) {
        const response = await getCompletion(chat);
        if (!response) {
            console.error('Failed to get completion from OpenAI');
            process.exit(1);
        }
        message(chat, { role: 'assistant', content: response });
        saveChat(chat);
        const commands = parseCommands(response);
        if (commands?.length > 0) {
            const outputs = await Promise.all(commands.map(async command => {
                const { isSafe, reason } = await isCommandSafe(command);
                if (!isSafe)
                    return { output: `Command is not safe to run: ${reason}`, command };
                return { output: await executeImapCommand(imapClient, command), command };
            }));
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