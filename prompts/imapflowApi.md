# imapflow

### imapflow~ImapFlow ⇐ EventEmitter
IMAP client class for accessing IMAP mailboxes

Kind: inner class of imapflow
Extends: EventEmitter
Properties

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| host | String |  | Hostname of the IMAP server. |
| port | Number |  | Port number for the IMAP server. |
| [secure] | Boolean | false | If `true`, establishes the connection directly over TLS (commonly on port 993).     If `false`, a plain (unencrypted) connection is used first and, if possible, the connection is upgraded to STARTTLS. |
| [doSTARTTLS] | Boolean |  | Determines whether to upgrade the connection to TLS via STARTTLS:       - true: Start unencrypted and upgrade to TLS using STARTTLS before authentication.         The connection fails if the server does not support STARTTLS or the upgrade fails.         Note that `secure=true` combined with `doSTARTTLS=true` is invalid.       - false: Never use STARTTLS, even if the server advertises support.         This is useful if the server has a broken TLS setup.         Combined with `secure=false`, this results in a fully unencrypted connection.         Make sure you warn users about the security risks.       - undefined (default): If `secure=false` (default), attempt to upgrade to TLS via STARTTLS before authentication if the server supports it. If not supported, continue unencrypted. This may expose the connection to a downgrade attack. |
| [servername] | String |  | Server name for SNI or when using an IP address as `host`. |
| [disableCompression] | Boolean | false | If `true`, the client does not attempt to use the COMPRESS=DEFLATE extension. |
| auth | Object |  | Authentication options. Authentication occurs automatically during connect. |
| auth.user | String |  | Username for authentication. |
| [auth.pass] | String |  | Password for regular authentication. |
| [auth.accessToken] | String |  | OAuth2 access token, if using OAuth2 authentication. |
| [auth.loginMethod] | String |  | Optional login method for password-based authentication (e.g., "LOGIN", "AUTH=LOGIN", or "AUTH=PLAIN").     If not set, ImapFlow chooses based on available mechanisms. |
| [clientInfo] | IdInfoObject |  | Client identification info sent to the server (via the ID command). |
| [disableAutoIdle] | Boolean | false | If `true`, do not start IDLE automatically. Useful when only specific operations are needed. |
| [tls] | Object |  | Additional TLS options. For details, see [Node.js TLS connect](https://nodejs.org/api/tls.html#tls_tls_connect_options_callback). |
| [tls.rejectUnauthorized] | Boolean | true | If `false`, allows self-signed or expired certificates. |
| [tls.minVersion] | String | &#x27;TLSv1.2&#x27; | Minimum accepted TLS version (e.g., `'TLSv1.2'`). |
| [tls.minDHSize] | Number | 1024 | Minimum size (in bits) of the DH parameter for TLS connections. |
| [logger] | Object \| Boolean |  | Custom logger instance with `debug(obj)`, `info(obj)`, `warn(obj)`, and `error(obj)` methods.     If `false`, logging is disabled. If not provided, ImapFlow logs to console in [pino format](https://getpino.io/). |
| [logRaw] | Boolean | false | If `true`, logs all raw data (read and written) in base64 encoding. You can pipe such logs to eerawlog command for readable output. |
| [emitLogs] | Boolean | false | If `true`, emits `'log'` events with the same data passed to the logger. |
| [verifyOnly] | Boolean | false | If `true`, disconnects after successful authentication without performing other actions. |
| [proxy] | String |  | Proxy URL. Supports HTTP CONNECT (`http://`, `https://`) and SOCKS (`socks://`, `socks4://`, `socks5://`). |
| [qresync] | Boolean | false | If `true`, enables QRESYNC support so that EXPUNGE notifications include `uid` instead of `seq`. |
| [maxIdleTime] | Number |  | If set, breaks and restarts IDLE every `maxIdleTime` milliseconds. |
| [missingIdleCommand] | String | &quot;NOOP&quot; | Command to use if the server does not support IDLE. |
| [disableBinary] | Boolean | false | If `true`, ignores the BINARY extension for FETCH and APPEND operations. |
| [disableAutoEnable] | Boolean | false | If `true`, do not automatically enable supported IMAP extensions. |
| [connectionTimeout] | Number | 90000 | Maximum time (in milliseconds) to wait for the connection to establish. Defaults to 90 seconds. |
| [greetingTimeout] | Number | 16000 | Maximum time (in milliseconds) to wait for the server greeting after a connection is established. Defaults to 16 seconds. |
| [socketTimeout] | Number | 300000 | Maximum period of inactivity (in milliseconds) before terminating the connection. Defaults to 5 minutes. |

#### new ImapFlow()
IMAP connection options

#### imapFlow.version
Current module version as a static class property

Kind: instance property of ImapFlow
Properties

| Name | Type | Description |
| --- | --- | --- |
| version | String | Module version |

#### imapFlow.id : String
Instance ID for logs

Kind: instance property of ImapFlow

#### imapFlow.serverInfo : IdInfoObject \| null
Server identification info. Available after successful `connect()`.
If server does not provide identification info then this value is `null`.

Kind: instance property of ImapFlow
Example
```js
await client.connect();
console.log(client.serverInfo.vendor);
```

#### imapFlow.secureConnection : Boolean
Is the connection currently encrypted or not

Kind: instance property of ImapFlow

#### imapFlow.capabilities : Map.&lt;string, (boolean\|number)&gt;
Active IMAP capabilities. Value is either `true` for togglabe capabilities (eg. `UIDPLUS`)
or a number for capabilities with a value (eg. `APPENDLIMIT`)

Kind: instance property of ImapFlow

#### imapFlow.enabled : Set.&lt;string&gt;
Enabled capabilities. Usually `CONDSTORE` and `UTF8=ACCEPT` if server supports these.

Kind: instance property of ImapFlow

#### imapFlow.usable : Boolean
Is the connection currently usable or not

Kind: instance property of ImapFlow

#### imapFlow.authenticated : String \| Boolean
Currently authenticated user or `false` if mailbox is not open
or `true` if connection was authenticated by PREAUTH

Kind: instance property of ImapFlow

#### imapFlow.mailbox : MailboxObject \| Boolean
Currently selected mailbox or `false` if mailbox is not open

Kind: instance property of ImapFlow

#### imapFlow.idling : Boolean
Is current mailbox idling (`true`) or not (`false`)

Kind: instance property of ImapFlow

#### imapFlow.upgradeToSTARTTLS() ⇒ boolean
Tries to upgrade the connection to TLS using STARTTLS.

Kind: instance method of ImapFlow
Returns: boolean - true, if the connection is now protected by TLS, either direct TLS or STARTTLS.
Throws:

- if STARTTLS is required, but not possible.


#### imapFlow.connect() ⇒ Promise.&lt;void&gt;
Initiates a connection against IMAP server. Throws if anything goes wrong. This is something you have to call before you can run any IMAP commands

Kind: instance method of ImapFlow
Throws:

- Will throw an error if connection or authentication fails

Example
```js
let client = new ImapFlow({...});
await client.connect();
```

#### imapFlow.logout() ⇒ Promise.&lt;void&gt;
Graceful connection close by sending logout command to server. TCP connection is closed once command is finished.

Kind: instance method of ImapFlow
Example
```js
let client = new ImapFlow({...});
await client.connect();
...
await client.logout();
```

#### imapFlow.close()
Closes TCP connection without notifying the server.

Kind: instance method of ImapFlow
Example
```js
let client = new ImapFlow({...});
await client.connect();
...
client.close();
```

#### imapFlow.getQuota([path]) ⇒ Promise.&lt;(QuotaResponse\|Boolean)&gt;
Returns current quota

Kind: instance method of ImapFlow
Returns: Promise.&lt;(QuotaResponse\|Boolean)&gt; - Quota information or `false` if QUTOA extension is not supported or requested path does not exist

| Param | Type | Description |
| --- | --- | --- |
| [path] | String | Optional mailbox path if you want to check quota for specific folder |

Example
```js
let quota = await client.getQuota();
console.log(quota.storage.used, quota.storage.available)
```

#### imapFlow.list([options]) ⇒ Promise.&lt;Array.&lt;ListResponse&gt;&gt;
Lists available mailboxes as an Array

Kind: instance method of ImapFlow
Returns: Promise.&lt;Array.&lt;ListResponse&gt;&gt; - An array of ListResponse objects

| Param | Type | Description |
| --- | --- | --- |
| [options] | ListOptions | defines additional listing options |

Example
```js
let list = await client.list();
list.forEach(mailbox=>console.log(mailbox.path));
```

#### imapFlow.listTree([options]) ⇒ Promise.&lt;ListTreeResponse&gt;
Lists available mailboxes as a tree structured object

Kind: instance method of ImapFlow
Returns: Promise.&lt;ListTreeResponse&gt; - Tree structured object

| Param | Type | Description |
| --- | --- | --- |
| [options] | ListOptions | defines additional listing options |

Example
```js
let tree = await client.listTree();
tree.folders.forEach(mailbox=>console.log(mailbox.path));
```

#### imapFlow.noop() ⇒ Promise.&lt;void&gt;
Performs a no-op call against server

Kind: instance method of ImapFlow

#### imapFlow.mailboxCreate(path) ⇒ Promise.&lt;MailboxCreateResponse&gt;
Creates a new mailbox folder and sets up subscription for the created mailbox. Throws on error.

Kind: instance method of ImapFlow
Returns: Promise.&lt;MailboxCreateResponse&gt; - Mailbox info
Throws:

- Will throw an error if mailbox can not be created

| Param | Type | Description |
| --- | --- | --- |
| path | string \| array | Full mailbox path. Unicode is allowed. If value is an array then it is joined using current delimiter symbols. Namespace prefix is added automatically if required. |

Example
```js
let info = await client.mailboxCreate(['parent', 'child']);
console.log(info.path);
// "INBOX.parent.child" // assumes "INBOX." as namespace prefix and "." as delimiter
```

#### imapFlow.mailboxRename(path, newPath) ⇒ Promise.&lt;MailboxRenameResponse&gt;
Renames a mailbox. Throws on error.

Kind: instance method of ImapFlow
Returns: Promise.&lt;MailboxRenameResponse&gt; - Mailbox info
Throws:

- Will throw an error if mailbox does not exist or can not be renamed

| Param | Type | Description |
| --- | --- | --- |
| path | string \| array | Path for the mailbox to rename. Unicode is allowed. If value is an array then it is joined using current delimiter symbols. Namespace prefix is added automatically if required. |
| newPath | string \| array | New path for the mailbox |

Example
```js
let info = await client.mailboxRename('parent.child', 'Important stuff ❗️');
console.log(info.newPath);
// "INBOX.Important stuff ❗️" // assumes "INBOX." as namespace prefix
```

#### imapFlow.mailboxDelete(path) ⇒ Promise.&lt;MailboxDeleteResponse&gt;
Deletes a mailbox. Throws on error.

Kind: instance method of ImapFlow
Returns: Promise.&lt;MailboxDeleteResponse&gt; - Mailbox info
Throws:

- Will throw an error if mailbox does not exist or can not be deleted

| Param | Type | Description |
| --- | --- | --- |
| path | string \| array | Path for the mailbox to delete. Unicode is allowed. If value is an array then it is joined using current delimiter symbols. Namespace prefix is added automatically if required. |

Example
```js
let info = await client.mailboxDelete('Important stuff ❗️');
console.log(info.path);
// "INBOX.Important stuff ❗️" // assumes "INBOX." as namespace prefix
```

#### imapFlow.mailboxSubscribe(path) ⇒ Promise.&lt;Boolean&gt;
Subscribes to a mailbox

Kind: instance method of ImapFlow
Returns: Promise.&lt;Boolean&gt; - `true` if subscription operation succeeded, `false` otherwise

| Param | Type | Description |
| --- | --- | --- |
| path | string \| array | Path for the mailbox to subscribe to. Unicode is allowed. If value is an array then it is joined using current delimiter symbols. Namespace prefix is added automatically if required. |

Example
```js
await client.mailboxSubscribe('Important stuff ❗️');
```

#### imapFlow.mailboxUnsubscribe(path) ⇒ Promise.&lt;Boolean&gt;
Unsubscribes from a mailbox

Kind: instance method of ImapFlow
Returns: Promise.&lt;Boolean&gt; - `true` if unsubscription operation succeeded, `false` otherwise

| Param | Type | Description |
| --- | --- | --- |
| path | string \| array | **Path for the mailbox** to unsubscribe from. Unicode is allowed. If value is an array then it is joined using current delimiter symbols. Namespace prefix is added automatically if required. |

Example
```js
await client.mailboxUnsubscribe('Important stuff ❗️');
```

#### imapFlow.mailboxOpen(path, [options]) ⇒ Promise.&lt;MailboxObject&gt;
Opens a mailbox to access messages. You can perform message operations only against an opened mailbox.
Using getMailboxLock() instead of `mailboxOpen()` is preferred. Both do the same thing
but next `getMailboxLock()` call is not executed until previous one is released.

Kind: instance method of ImapFlow
Returns: Promise.&lt;MailboxObject&gt; - Mailbox info
Throws:

- Will throw an error if mailbox does not exist or can not be opened

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| path | string \| array |  | **Path for the mailbox** to open |
| [options] | Object |  | optional options |
| [options.readOnly] | Boolean | false | If `true` then opens mailbox in read-only mode. You can still try to perform write operations but these would probably fail. |

Example
```js
let mailbox = await client.mailboxOpen('Important stuff ❗️');
console.log(mailbox.exists);
// 125
```

#### imapFlow.mailboxClose() ⇒ Promise.&lt;Boolean&gt;
Closes a previously opened mailbox

Kind: instance method of ImapFlow
Returns: Promise.&lt;Boolean&gt; - Did the operation succeed or not
Example
```js
let mailbox = await client.mailboxOpen('INBOX');
await client.mailboxClose();
```

#### imapFlow.status(path, query) ⇒ Promise.&lt;StatusObject&gt;
Requests the status of the indicated mailbox. Only requested status values will be returned.

Kind: instance method of ImapFlow
Returns: Promise.&lt;StatusObject&gt; - status of the indicated mailbox

| Param | Type | Description |
| --- | --- | --- |
| path | String | mailbox path to check for (unicode string) |
| query | Object | defines requested status items |
| query.messages | Boolean | if `true` request count of messages |
| query.recent | Boolean | if `true` request count of messages with \\Recent tag |
| query.uidNext | Boolean | if `true` request predicted next UID |
| query.uidValidity | Boolean | if `true` request mailbox `UIDVALIDITY` value |
| query.unseen | Boolean | if `true` request count of unseen messages |
| query.highestModseq | Boolean | if `true` request last known modseq value |

Example
```js
let status = await client.status('INBOX', {unseen: true});
console.log(status.unseen);
// 123
```

#### imapFlow.idle() ⇒ Promise.&lt;Boolean&gt;
Starts listening for new or deleted messages from the currently opened mailbox. Only required if ImapFlow#disableAutoIdle is set to `true`
otherwise IDLE is started by default on connection inactivity. NB! If `idle()` is called manually then it does not
return until IDLE is finished which means you would have to call some other command out of scope.

Kind: instance method of ImapFlow
Returns: Promise.&lt;Boolean&gt; - Did the operation succeed or not
Example
```js
let mailbox = await client.mailboxOpen('INBOX');

await client.idle();
```

#### imapFlow.messageFlagsSet(range, Array, [options]) ⇒ Promise.&lt;Boolean&gt;
Sets flags for a message or message range

Kind: instance method of ImapFlow
Returns: Promise.&lt;Boolean&gt; - Did the operation succeed or not

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| range | SequenceString \| Array.&lt;Number&gt; \| SearchObject |  | Range to filter the messages |
| Array | Array.&lt;string&gt; |  | of flags to set. Only flags that are permitted to set are used, other flags are ignored |
| [options] | Object |  |  |
| [options.uid] | Boolean |  | If `true` then uses UID SequenceString instead of sequence numbers |
| [options.unchangedSince] | BigInt |  | If set then only messages with a lower or equal `modseq` value are updated. Ignored if server does not support `CONDSTORE` extension. |
| [options.useLabels] | Boolean | false | If true then update Gmail labels instead of message flags |

Example
```js
let mailbox = await client.mailboxOpen('INBOX');
// mark all unseen messages as seen (and remove other flags)
await client.messageFlagsSet({seen: false}, ['\Seen]);
```

#### imapFlow.messageFlagsAdd(range, Array, [options]) ⇒ Promise.&lt;Boolean&gt;
Adds flags for a message or message range

Kind: instance method of ImapFlow
Returns: Promise.&lt;Boolean&gt; - Did the operation succeed or not

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| range | SequenceString \| Array.&lt;Number&gt; \| SearchObject |  | Range to filter the messages |
| Array | Array.&lt;string&gt; |  | of flags to set. Only flags that are permitted to set are used, other flags are ignored |
| [options] | Object |  |  |
| [options.uid] | Boolean |  | If `true` then uses UID SequenceString instead of sequence numbers |
| [options.unchangedSince] | BigInt |  | If set then only messages with a lower or equal `modseq` value are updated. Ignored if server does not support `CONDSTORE` extension. |
| [options.useLabels] | Boolean | false | If true then update Gmail labels instead of message flags |

Example
```js
let mailbox = await client.mailboxOpen('INBOX');
// mark all unseen messages as seen (and keep other flags as is)
await client.messageFlagsAdd({seen: false}, ['\Seen]);
```

#### imapFlow.messageFlagsRemove(range, Array, [options]) ⇒ Promise.&lt;Boolean&gt;
Remove specific flags from a message or message range

Kind: instance method of ImapFlow
Returns: Promise.&lt;Boolean&gt; - Did the operation succeed or not

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| range | SequenceString \| Array.&lt;Number&gt; \| SearchObject |  | Range to filter the messages |
| Array | Array.&lt;string&gt; |  | of flags to remove. Only flags that are permitted to set are used, other flags are ignored |
| [options] | Object |  |  |
| [options.uid] | Boolean |  | If `true` then uses UID SequenceString instead of sequence numbers |
| [options.unchangedSince] | BigInt |  | If set then only messages with a lower or equal `modseq` value are updated. Ignored if server does not support `CONDSTORE` extension. |
| [options.useLabels] | Boolean | false | If true then update Gmail labels instead of message flags |

Example
```js
let mailbox = await client.mailboxOpen('INBOX');
// mark all seen messages as unseen by removing \\Seen flag
await client.messageFlagsRemove({seen: true}, ['\Seen]);
```

#### imapFlow.setFlagColor(range, The, [options]) ⇒ Promise.&lt;Boolean&gt;
Sets a colored flag for an email. Only supported by mail clients like Apple Mail

Kind: instance method of ImapFlow
Returns: Promise.&lt;Boolean&gt; - Did the operation succeed or not

| Param | Type | Description |
| --- | --- | --- |
| range | SequenceString \| Array.&lt;Number&gt; \| SearchObject | Range to filter the messages |
| The | string | color to set. One of 'red', 'orange', 'yellow', 'green', 'blue', 'purple', and 'grey' |
| [options] | Object |  |
| [options.uid] | Boolean | If `true` then uses UID SequenceString instead of sequence numbers |
| [options.unchangedSince] | BigInt | If set then only messages with a lower or equal `modseq` value are updated. Ignored if server does not support `CONDSTORE` extension. |

Example
```js
let mailbox = await client.mailboxOpen('INBOX');
// add a purple flag for all emails
await client.setFlagColor('1:*', 'Purple');
```

#### imapFlow.messageDelete(range, [options]) ⇒ Promise.&lt;Boolean&gt;
Delete messages from the currently opened mailbox. Method does not indicate info about deleted messages,
instead you should be using ImapFlow#expunge event for this

Kind: instance method of ImapFlow
Returns: Promise.&lt;Boolean&gt; - Did the operation succeed or not

| Param | Type | Description |
| --- | --- | --- |
| range | SequenceString \| Array.&lt;Number&gt; \| SearchObject | Range to filter the messages |
| [options] | Object |  |
| [options.uid] | Boolean | If `true` then uses UID SequenceString instead of sequence numbers |

Example
```js
let mailbox = await client.mailboxOpen('INBOX');
// delete all seen messages
await client.messageDelete({seen: true});
```

#### imapFlow.append(path, content, [flags], [idate]) ⇒ Promise.&lt;AppendResponseObject&gt;
Appends a new message to a mailbox

Kind: instance method of ImapFlow
Returns: Promise.&lt;AppendResponseObject&gt; - info about uploaded message

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| path | String |  | Mailbox path to upload the message to (unicode string) |
| content | string \| Buffer |  | RFC822 formatted email message |
| [flags] | Array.&lt;string&gt; |  | an array of flags to be set for the uploaded message |
| [idate] | Date \| string | now | internal date to be set for the message |

Example
```js
await client.append('INBOX', rawMessageBuffer, ['\\Seen'], new Date(2000, 1, 1));
```

#### imapFlow.messageCopy(range, destination, [options]) ⇒ Promise.&lt;CopyResponseObject&gt;
Copies messages from current mailbox to destination mailbox

Kind: instance method of ImapFlow
Returns: Promise.&lt;CopyResponseObject&gt; - info about copies messages

| Param | Type | Description |
| --- | --- | --- |
| range | SequenceString \| Array.&lt;Number&gt; \| SearchObject | Range of messages to copy |
| destination | String | Mailbox path to copy the messages to |
| [options] | Object |  |
| [options.uid] | Boolean | If `true` then uses UID SequenceString instead of sequence numbers |

Example
```js
await client.mailboxOpen('INBOX');
// copy all messages to a mailbox called "Backup" (must exist)
let result = await client.messageCopy('1:*', 'Backup');
console.log('Copied %s messages', result.uidMap.size);
```

#### imapFlow.messageMove(range, destination, [options]) ⇒ Promise.&lt;CopyResponseObject&gt;
Moves messages from current mailbox to destination mailbox

Kind: instance method of ImapFlow
Returns: Promise.&lt;CopyResponseObject&gt; - info about moved messages

| Param | Type | Description |
| --- | --- | --- |
| range | SequenceString \| Array.&lt;Number&gt; \| SearchObject | Range of messages to move |
| destination | String | Mailbox path to move the messages to |
| [options] | Object |  |
| [options.uid] | Boolean | If `true` then uses UID SequenceString instead of sequence numbers |

Example
```js
await client.mailboxOpen('INBOX');
// move all messages to a mailbox called "Trash" (must exist)
let result = await client.messageMove('1:*', 'Trash');
console.log('Moved %s messages', result.uidMap.size);
```

#### imapFlow.search(query, [options]) ⇒ Promise.&lt;Array.&lt;Number&gt;&gt;
Search messages from the currently opened mailbox

Kind: instance method of ImapFlow
Returns: Promise.&lt;Array.&lt;Number&gt;&gt; - An array of sequence or UID numbers

| Param | Type | Description |
| --- | --- | --- |
| query | SearchObject | Query to filter the messages |
| [options] | Object |  |
| [options.uid] | Boolean | If `true` then returns UID numbers instead of sequence numbers |

Example
```js
let mailbox = await client.mailboxOpen('INBOX');
// find all unseen messages
let list = await client.search({seen: false});
// use OR modifier (array of 2 or more search queries)
let list = await client.search({
  seen: false,
  or: [
    {flagged: true},
    {from: 'andris'},
    {subject: 'test'}
  ]});
```

#### imapFlow.fetch(range, query, [options])
Fetch messages from the currently opened mailbox

Kind: instance method of ImapFlow

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| range | SequenceString \| Array.&lt;Number&gt; \| SearchObject |  | Range of messages to fetch |
| query | FetchQueryObject |  | Fetch query |
| [options] | Object |  |  |
| [options.uid] | Boolean |  | If `true` then uses UID numbers instead of sequence numbers for `range` |
| [options.changedSince] | BigInt |  | If set then only messages with a higher modseq value are returned. Ignored if server does not support `CONDSTORE` extension. |
| [options.binary] | Boolean | false | If `true` then requests a binary response if the server supports this |

Example
```js
let mailbox = await client.mailboxOpen('INBOX');
// fetch UID for all messages in a mailbox
for await (let msg of client.fetch('1:*', {uid: true})){
    console.log(msg.uid);
    // NB! You can not run any IMAP commands in this loop
    // otherwise you will end up in a deadloop
}
```

#### imapFlow.fetchAll(range, query, [options]) ⇒ Promise.&lt;Array.&lt;FetchMessageObject&gt;&gt;
Fetch messages from the currently opened mailbox.

This method will fetch all messages before resolving the promise, unlike .fetch(), which
is an async generator. Do not use large ranges like 1:*, as this might exhaust all available
memory if the mailbox contains a large number of emails.

Kind: instance method of ImapFlow
Returns: Promise.&lt;Array.&lt;FetchMessageObject&gt;&gt; - Array of Message data object

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| range | SequenceString \| Array.&lt;Number&gt; \| SearchObject |  | Range of messages to fetch |
| query | FetchQueryObject |  | Fetch query |
| [options] | Object |  |  |
| [options.uid] | Boolean |  | If `true` then uses UID numbers instead of sequence numbers for `range` |
| [options.changedSince] | BigInt |  | If set then only messages with a higher modseq value are returned. Ignored if server does not support `CONDSTORE` extension. |
| [options.binary] | Boolean | false | If `true` then requests a binary response if the server supports this |

Example
```js
let mailbox = await client.mailboxOpen('INBOX');
// fetch UID for all messages in a mailbox
const messages = await client.fetchAll('1:*', {uid: true});
for (let msg of messages){
    console.log(msg.uid);
}
```

#### imapFlow.fetchOne(seq, query, [options]) ⇒ Promise.&lt;FetchMessageObject&gt;
Fetch a single message from the currently opened mailbox

Kind: instance method of ImapFlow
Returns: Promise.&lt;FetchMessageObject&gt; - Message data object

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| seq | SequenceString |  | Single UID or sequence number of the message to fetch for |
| query | FetchQueryObject |  | Fetch query |
| [options] | Object |  |  |
| [options.uid] | Boolean |  | If `true` then uses UID number instead of sequence number for `seq` |
| [options.binary] | Boolean | false | If `true` then requests a binary response if the server supports this |

Example
```js
let mailbox = await client.mailboxOpen('INBOX');
// fetch UID for the last email in the selected mailbox
let lastMsg = await client.fetchOne('*', {uid: true})
console.log(lastMsg.uid);
```

#### imapFlow.download(range, [part], [options]) ⇒ Promise.&lt;DownloadObject&gt;
Download either full rfc822 formatted message or a specific bodystructure part as a Stream.
Bodystructure parts are decoded so the resulting stream is a binary file. Text content
is automatically converted to UTF-8 charset.

Kind: instance method of ImapFlow
Returns: Promise.&lt;DownloadObject&gt; - Download data object

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| range | SequenceString |  | UID or sequence number for the message to fetch |
| [part] | String |  | If not set then downloads entire rfc822 formatted message, otherwise downloads specific bodystructure part |
| [options] | Object |  |  |
| [options.uid] | Boolean |  | If `true` then uses UID number instead of sequence number for `range` |
| [options.maxBytes] | number |  | If set then limits download size to specified bytes |
| [options.chunkSize] | number | 65536 | How large content parts to ask from the server |

Example
```js
let mailbox = await client.mailboxOpen('INBOX');
// download body part nr '1.2' from latest message
let {meta, content} = await client.download('*', '1.2');
content.pipe(fs.createWriteStream(meta.filename));
```

#### imapFlow.downloadMany(range, parts, [options]) ⇒ Promise.&lt;Object&gt;
Fetch multiple attachments as Buffer values

Kind: instance method of ImapFlow
Returns: Promise.&lt;Object&gt; - Download data object

| Param | Type | Description |
| --- | --- | --- |
| range | SequenceString | UID or sequence number for the message to fetch |
| parts | String | A list of bodystructure parts |
| [options] | Object |  |
| [options.uid] | Boolean | If `true` then uses UID number instead of sequence number for `range` |

Example
```js
let mailbox = await client.mailboxOpen('INBOX');
// download body parts '2', and '3' from all messages in the selected mailbox
let response = await client.downloadMany('*', ['2', '3']);
process.stdout.write(response[2].content)
process.stdout.write(response[3].content)
```

#### imapFlow.getMailboxLock(path, [options]) ⇒ Promise.&lt;MailboxLockObject&gt;
Opens a mailbox if not already open and returns a lock. Next call to `getMailboxLock()` is queued
until previous lock is released. This is suggested over mailboxOpen() as
`getMailboxLock()` gives you a weak transaction while `mailboxOpen()` has no guarantees whatsoever that another
mailbox is opened while you try to call multiple fetch or store commands.

Kind: instance method of ImapFlow
Returns: Promise.&lt;MailboxLockObject&gt; - Mailbox lock
Throws:

- Will throw an error if mailbox does not exist or can not be opened

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| path | string \| array |  | **Path for the mailbox** to open |
| [options] | Object |  | optional options |
| [options.readOnly] | Boolean | false | If `true` then opens mailbox in read-only mode. You can still try to perform write operations but these would probably fail. |

Example
```js
let lock = await client.getMailboxLock('INBOX');
try {
  // do something in the mailbox
} finally {
  // use finally{} to make sure lock is released even if exception occurs
  lock.release();
}
```

#### "close"
Connection close event. **NB!** ImapFlow does not handle reconnects automatically.
So whenever a 'close' event occurs you must create a new connection yourself.

Kind: event emitted by ImapFlow

#### "error"
Error event. In most cases getting an error event also means that connection is closed
and pending operations should return with a failure.

Kind: event emitted by ImapFlow
Example
```js
client.on('error', err=>{
    console.log(`Error occurred: ${err.message}`);
});
```

#### "exists"
Message count in currently opened mailbox changed

Kind: event emitted by ImapFlow
Properties

| Name | Type | Description |
| --- | --- | --- |
| path | String | mailbox path this event applies to |
| count | Number | updated count of messages |
| prevCount | Number | message count before this update |

Example
```js
client.on('exists', data=>{
    console.log(`Message count in "${data.path}" is ${data.count}`);
});
```

#### "expunge"
Deleted message sequence number in currently opened mailbox. One event is fired for every deleted email.

Kind: event emitted by ImapFlow
Properties

| Name | Type | Description |
| --- | --- | --- |
| path | String | mailbox path this event applies to |
| seq | Number | sequence number of deleted message |

Example
```js
client.on('expunge', data=>{
    console.log(`Message #${data.seq} was deleted from "${data.path}"`);
});
```

#### "flags"
Flags were updated for a message. Not all servers fire this event.

Kind: event emitted by ImapFlow
Properties

| Name | Type | Description |
| --- | --- | --- |
| path | String | mailbox path this event applies to |
| seq | Number | sequence number of updated message |
| [uid] | Number | UID number of updated message (if server provided this value) |
| [modseq] | BigInt | Updated modseq number for the mailbox (if server provided this value) |
| flags | Set.&lt;string&gt; | A set of all flags for the updated message |

Example
```js
client.on('flags', data=>{
    console.log(`Flag set for #${data.seq} is now "${Array.from(data.flags).join(', ')}"`);
});
```

#### "mailboxOpen"
Mailbox was opened

Kind: event emitted by ImapFlow
Example
```js
client.on('mailboxOpen', mailbox => {
    console.log(`Mailbox ${mailbox.path} was opened`);
});
```

#### "mailboxClose"
Mailbox was closed

Kind: event emitted by ImapFlow
Example
```js
client.on('mailboxClose', mailbox => {
    console.log(`Mailbox ${mailbox.path} was closed`);
});
```

#### "log"
Log event if `emitLogs=true`

Kind: event emitted by ImapFlow
Example
```js
client.on('log', entry => {
    console.log(`${log.cid} ${log.msg}`);
});
```

## MailboxObject : Object
Kind: global typedef
Properties

| Name | Type | Description |
| --- | --- | --- |
| path | String | mailbox path |
| delimiter | String | mailbox path delimiter, usually "." or "/" |
| flags | Set.&lt;string&gt; | list of flags for this mailbox |
| [specialUse] | String | one of special-use flags (if applicable): "\All", "\Archive", "\Drafts", "\Flagged", "\Junk", "\Sent", "\Trash". Additionally INBOX has non-standard "\Inbox" flag set |
| listed | Boolean | `true` if mailbox was found from the output of LIST command |
| subscribed | Boolean | `true` if mailbox was found from the output of LSUB command |
| permanentFlags | Set.&lt;string&gt; | A Set of flags available to use in this mailbox. If it is not set or includes special flag "\\\*" then any flag can be used. |
| [mailboxId] | String | unique mailbox ID if server has `OBJECTID` extension enabled |
| [highestModseq] | BigInt | latest known modseq value if server has CONDSTORE or XYMHIGHESTMODSEQ enabled |
| [noModseq] | String | if true then the server doesn't support the persistent storage of mod-sequences for the mailbox |
| uidValidity | BigInt | Mailbox `UIDVALIDITY` value |
| uidNext | Number | Next predicted UID |
| exists | Number | Messages in this folder |


## MailboxLockObject : Object
Kind: global typedef
Properties

| Name | Type | Description |
| --- | --- | --- |
| path | String | mailbox path |
| release | function | Release current lock |

Example
```js
let lock = await client.getMailboxLock('INBOX');
try {
  // do something in the mailbox
} finally {
  // use finally{} to make sure lock is released even if exception occurs
  lock.release();
}
```

## IdInfoObject : Object
Client and server identification object, where key is one of RFC2971 defined [data fields](https://tools.ietf.org/html/rfc2971#section-3.3) (but not limited to).

Kind: global typedef
Properties

| Name | Type | Description |
| --- | --- | --- |
| [name] | String | Name of the program |
| [version] | String | Version number of the program |
| [os] | String | Name of the operating system |
| [vendor] | String | Vendor of the client/server |
| ['support-url'] | String | URL to contact for support |
| [date] | Date | Date program was released |


## QuotaResponse : Object
Kind: global typedef
Properties

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| path | String | INBOX | mailbox path this quota applies to |
| [storage] | Object |  | Storage quota if provided by server |
| [storage.used] | Number |  | used storage in bytes |
| [storage.limit] | Number |  | total storage available |
| [messages] | Object |  | Message count quota if provided by server |
| [messages.used] | Number |  | stored messages |
| [messages.limit] | Number |  | maximum messages allowed |


## ListResponse : Object
Kind: global typedef
Properties

| Name | Type | Description |
| --- | --- | --- |
| path | String | mailbox path (unicode string) |
| pathAsListed | String | mailbox path as listed in the LIST/LSUB response |
| name | String | mailbox name (last part of path after delimiter) |
| delimiter | String | mailbox path delimiter, usually "." or "/" |
| parent | Array.&lt;String&gt; | An array of parent folder names. All names are in unicode |
| parentPath | String | Same as `parent`, but as a complete string path (unicode string) |
| flags | Set.&lt;string&gt; | a set of flags for this mailbox |
| specialUse | String | one of special-use flags (if applicable): "\All", "\Archive", "\Drafts", "\Flagged", "\Junk", "\Sent", "\Trash". Additionally INBOX has non-standard "\Inbox" flag set |
| listed | Boolean | `true` if mailbox was found from the output of LIST command |
| subscribed | Boolean | `true` if mailbox was found from the output of LSUB command |
| [status] | StatusObject | If `statusQuery` was used, then this value includes the status response |


## ListOptions : Object
Kind: global typedef
Properties

| Name | Type | Description |
| --- | --- | --- |
| [statusQuery] | Object | request status items for every listed entry |
| [statusQuery.messages] | Boolean | if `true` request count of messages |
| [statusQuery.recent] | Boolean | if `true` request count of messages with \\Recent tag |
| [statusQuery.uidNext] | Boolean | if `true` request predicted next UID |
| [statusQuery.uidValidity] | Boolean | if `true` request mailbox `UIDVALIDITY` value |
| [statusQuery.unseen] | Boolean | if `true` request count of unseen messages |
| [statusQuery.highestModseq] | Boolean | if `true` request last known modseq value |
| [specialUseHints] | Object | set specific paths as special use folders, this would override special use flags provided from the server |
| [specialUseHints.sent] | String | Path to "Sent Mail" folder |
| [specialUseHints.trash] | String | Path to "Trash" folder |
| [specialUseHints.junk] | String | Path to "Junk Mail" folder |
| [specialUseHints.drafts] | String | Path to "Drafts" folder |


## ListTreeResponse : Object
Kind: global typedef
Properties

| Name | Type | Description |
| --- | --- | --- |
| root | Boolean | If `true` then this is root node without any additional properties besides *folders* |
| path | String | mailbox path |
| name | String | mailbox name (last part of path after delimiter) |
| delimiter | String | mailbox path delimiter, usually "." or "/" |
| flags | Array.&lt;String&gt; | list of flags for this mailbox |
| specialUse | String | one of special-use flags (if applicable): "\All", "\Archive", "\Drafts", "\Flagged", "\Junk", "\Sent", "\Trash". Additionally INBOX has non-standard "\Inbox" flag set |
| listed | Boolean | `true` if mailbox was found from the output of LIST command |
| subscribed | Boolean | `true` if mailbox was found from the output of LSUB command |
| disabled | Boolean | If `true` then this mailbox can not be selected in the UI |
| folders | Array.&lt;ListTreeResponse&gt; | An array of subfolders |


## MailboxCreateResponse : Object
Kind: global typedef
Properties

| Name | Type | Description |
| --- | --- | --- |
| path | String | full mailbox path |
| [mailboxId] | String | unique mailbox ID if server supports `OBJECTID` extension (currently Yahoo and some others) |
| created | Boolean | If `true` then mailbox was created otherwise it already existed |


## MailboxRenameResponse : Object
Kind: global typedef
Properties

| Name | Type | Description |
| --- | --- | --- |
| path | String | full mailbox path that was renamed |
| newPath | String | new full mailbox path |


## MailboxDeleteResponse : Object
Kind: global typedef
Properties

| Name | Type | Description |
| --- | --- | --- |
| path | String | full mailbox path that was deleted |


## StatusObject : Object
Kind: global typedef
Properties

| Name | Type | Description |
| --- | --- | --- |
| path | String | full mailbox path that was checked |
| [messages] | Number | Count of messages |
| [recent] | Number | Count of messages with \\Recent tag |
| [uidNext] | Number | Predicted next UID |
| [uidValidity] | BigInt | Mailbox `UIDVALIDITY` value |
| [unseen] | Number | Count of unseen messages |
| [highestModseq] | BigInt | Last known modseq value (if CONDSTORE extension is enabled) |


## SequenceString : String
Sequence range string. Separate different values with commas, number ranges with colons and use \\* as the placeholder for the newest message in mailbox

Kind: global typedef
Example
```js
"1:*" // for all messages
"1,2,3" // for messages 1, 2 and 3
"1,2,4:6" // for messages 1,2,4,5,6
"*" // for the newest message
```

## SearchObject : Object
IMAP search query options. By default all conditions must match. In case of `or` query term at least one condition must match.

Kind: global typedef
Properties

| Name | Type | Description |
| --- | --- | --- |
| [seq] | SequenceString | message ordering sequence range |
| [answered] | Boolean | Messages with (value is `true`) or without (value is `false`) \\Answered flag |
| [deleted] | Boolean | Messages with (value is `true`) or without (value is `false`) \\Deleted flag |
| [draft] | Boolean | Messages with (value is `true`) or without (value is `false`) \\Draft flag |
| [flagged] | Boolean | Messages with (value is `true`) or without (value is `false`) \\Flagged flag |
| [seen] | Boolean | Messages with (value is `true`) or without (value is `false`) \\Seen flag |
| [all] | Boolean | If `true` matches all messages |
| [new] | Boolean | If `true` matches messages that have the \\Recent flag set but not the \\Seen flag |
| [old] | Boolean | If `true` matches messages that do not have the \\Recent flag set |
| [recent] | Boolean | If `true` matches messages that have the \\Recent flag set |
| [from] | String | Matches From: address field |
| [to] | String | Matches To: address field |
| [cc] | String | Matches Cc: address field |
| [bcc] | String | Matches Bcc: address field |
| [body] | String | Matches message body |
| [subject] | String | Matches message subject |
| [larger] | Number | Matches messages larger than value |
| [smaller] | Number | Matches messages smaller than value |
| [uid] | SequenceString | UID sequence range |
| [modseq] | BigInt | Matches messages with modseq higher than value |
| [emailId] | String | unique email ID. Only used if server supports `OBJECTID` or `X-GM-EXT-1` extensions |
| [threadId] | String | unique thread ID. Only used if server supports `OBJECTID` or `X-GM-EXT-1` extensions |
| [before] | Date \| string | Matches messages received before date |
| [on] | Date \| string | Matches messages received on date (ignores time) |
| [since] | Date \| string | Matches messages received after date |
| [sentBefore] | Date \| string | Matches messages sent before date |
| [sentOn] | Date \| string | Matches messages sent on date (ignores time) |
| [sentSince] | Date \| string | Matches messages sent after date |
| [keyword] | String | Matches messages that have the custom flag set |
| [unKeyword] | String | Matches messages that do not have the custom flag set |
| [header] | Object.&lt;string, (Boolean\|String)&gt; | Matches messages with header key set if value is `true` (**NB!** not supported by all servers) or messages where header partially matches a string value |
| [or] | Array.&lt;SearchObject&gt; | An array of 2 or more SearchObject objects. At least on of these must match |


## AppendResponseObject : Object
Kind: global typedef
Properties

| Name | Type | Description |
| --- | --- | --- |
| destination | String | full mailbox path where the message was uploaded to |
| [uidValidity] | BigInt | mailbox `UIDVALIDITY` if server has `UIDPLUS` extension enabled |
| [uid] | Number | UID of the uploaded message if server has `UIDPLUS` extension enabled |
| [seq] | Number | sequence number of the uploaded message if path is currently selected mailbox |


## CopyResponseObject : Object
Kind: global typedef
Properties

| Name | Type | Description |
| --- | --- | --- |
| path | String | path of source mailbox |
| destination | String | path of destination mailbox |
| [uidValidity] | BigInt | destination mailbox `UIDVALIDITY` if server has `UIDPLUS` extension enabled |
| [uidMap] | Map.&lt;number, number&gt; | Map of UID values (if server has `UIDPLUS` extension enabled) where key is UID in source mailbox and value is the UID for the same message in destination mailbox |


## FetchQueryObject : Object
Kind: global typedef
Properties

| Name | Type | Description |
| --- | --- | --- |
| [uid] | Boolean | if `true` then include UID in the response |
| [flags] | Boolean | if `true` then include flags Set in the response. Also adds `flagColor` to the response if the message is flagged. |
| [bodyStructure] | Boolean | if `true` then include parsed BODYSTRUCTURE object in the response |
| [envelope] | Boolean | if `true` then include parsed ENVELOPE object in the response |
| [internalDate] | Boolean | if `true` then include internal date value in the response |
| [size] | Boolean | if `true` then include message size in the response |
| [source] | boolean \| Object | if `true` then include full message in the response |
| [source.start] | Number | include full message in the response starting from *start* byte |
| [source.maxLength] | Number | include full message in the response, up to *maxLength* bytes |
| [threadId] | String | if `true` then include thread ID in the response (only if server supports either `OBJECTID` or `X-GM-EXT-1` extensions) |
| [labels] | Boolean | if `true` then include GMail labels in the response (only if server supports `X-GM-EXT-1` extension) |
| [headers] | boolean \| Array.&lt;string&gt; | if `true` then includes full headers of the message in the response. If the value is an array of header keys then includes only headers listed in the array |
| [bodyParts] | Array.&lt;string&gt; | An array of BODYPART identifiers to include in the response |


## MessageAddressObject : Object
Parsed email address entry

Kind: global typedef
Properties

| Name | Type | Description |
| --- | --- | --- |
| [name] | String | name of the address object (unicode) |
| [address] | String | email address |


## MessageEnvelopeObject : Object
Parsed IMAP ENVELOPE object

Kind: global typedef
Properties

| Name | Type | Description |
| --- | --- | --- |
| [date] | Date | header date |
| [subject] | String | message subject (unicode) |
| [messageId] | String | Message ID of the message |
| [inReplyTo] | String | Message ID from In-Reply-To header |
| [from] | Array.&lt;MessageAddressObject&gt; | Array of addresses from the From: header |
| [sender] | Array.&lt;MessageAddressObject&gt; | Array of addresses from the Sender: header |
| [replyTo] | Array.&lt;MessageAddressObject&gt; | Array of addresses from the Reply-To: header |
| [to] | Array.&lt;MessageAddressObject&gt; | Array of addresses from the To: header |
| [cc] | Array.&lt;MessageAddressObject&gt; | Array of addresses from the Cc: header |
| [bcc] | Array.&lt;MessageAddressObject&gt; | Array of addresses from the Bcc: header |


## MessageStructureObject : Object
Parsed IMAP BODYSTRUCTURE object

Kind: global typedef
Properties

| Name | Type | Description |
| --- | --- | --- |
| part | String | Body part number. This value can be used to later fetch the contents of this part of the message |
| type | String | Content-Type of this node |
| [parameters] | Object | Additional parameters for Content-Type, eg "charset" |
| [id] | String | Content-ID |
| [encoding] | String | Transfer encoding |
| [size] | Number | Expected size of the node |
| [envelope] | MessageEnvelopeObject | message envelope of embedded RFC822 message |
| [disposition] | String | Content disposition |
| [dispositionParameters] | Object | Additional parameters for Content-Disposition |
| childNodes | Array.&lt;MessageStructureObject&gt; | An array of child nodes if this is a multipart node. Not present for normal nodes |


## FetchMessageObject : Object
Fetched message data

Kind: global typedef
Properties

| Name | Type | Description |
| --- | --- | --- |
| seq | Number | message sequence number. Always included in the response |
| uid | Number | message UID number. Always included in the response |
| [source] | Buffer | message source for the requested byte range |
| [modseq] | BigInt | message Modseq number. Always included if the server supports CONDSTORE extension |
| [emailId] | String | unique email ID. Always included if server supports `OBJECTID` or `X-GM-EXT-1` extensions |
| [threadid] | String | unique thread ID. Only present if server supports `OBJECTID` or `X-GM-EXT-1` extension |
| [labels] | Set.&lt;string&gt; | a Set of labels. Only present if server supports `X-GM-EXT-1` extension |
| [size] | Number | message size |
| [flags] | Set.&lt;string&gt; | a set of message flags |
| [flagColor] | String | flag color like "red", or "yellow". This value is derived from the `flags` Set and it uses the same color rules as Apple Mail |
| [envelope] | MessageEnvelopeObject | message envelope |
| [bodyStructure] | MessageStructureObject | message body structure |
| [internalDate] | Date | message internal date |
| [bodyParts] | Map.&lt;string, Buffer&gt; | a Map of message body parts where key is requested part identifier and value is a Buffer |
| [headers] | Buffer | Requested header lines as Buffer |


## DownloadObject : Object
Kind: global typedef
Properties

| Name | Type | Description |
| --- | --- | --- |
| meta | Object | content metadata |
| meta.expectedSize | number | The fetch response size |
| meta.contentType | String | Content-Type of the streamed file. If part was not set then this value is "message/rfc822" |
| [meta.charset] | String | Charset of the body part. Text parts are automatically converted to UTF-8, attachments are kept as is |
| [meta.disposition] | String | Content-Disposition of the streamed file |
| [meta.filename] | String | Filename of the streamed body part |
| content | ReadableStream | Streamed content |

