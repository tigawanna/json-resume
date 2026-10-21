# Chat performance postmortem

The chat lab at `/dev/chat-lab` dropped under 10 fps and the tab ran out of memory during a scripted tool-call burst. The lab uses the same résumé chat UI as the main résumé chat, with a free scripted stream instead of a paid model. Measurements below are that JD-draft preset, résumé pinned, dev server unless a row says production.

## What the data said

The frame-rate counter and the tool-card DOM were signals, not the leak.

| Observation                                 | Evidence                                                                                                                                                                                                                                                                                            |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Visible tool cards were not the stall       | Omitting the folded tool `<pre>` bodies left fps at 6–10 and the heap climb unchanged.                                                                                                                                                                                                              |
| The list was already small when fps fell    | After one message was split into one virtual row per part: about 716 DOM nodes and 5 tool cards, fps still 7–13 while status was "Working".                                                                                                                                                         |
| The unreclaimed memory was the devtools log | One heap snapshot string was 22.1 MB and started with `{"records":[{"source":"client","type":"tanstack-ai-devtools:hook:state-snapshot"`. External string data was 81.1 MB across 4,332 strings.                                                                                                    |
| The lab never ended its turn                | `continuingAfterTool` only looked for `parts` of type `tool-call` or `tool-result`. The client posts assistant `toolCalls` and `role: "tool"`, so the script replayed, including another `clone_resume`. The request body grew about 8.5 KB per round (42 KB to 255 KB in 10 seconds, 51 requests). |
| Production removed the log, not the replay  | Idle heap 35 MB instead of 130 MB. Peak during the same replay was 120 MB, and the collector gave large chunks back. fps stayed in the low 20s.                                                                                                                                                     |

## Actions taken

| Action                                      | Where                                                                                        | Why                                                                                                                                                                                                                                                   |
| ------------------------------------------- | -------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Removed the AI devtools event log and panel | `devtools.tsx`, the `/api/dev/ai-devtools-log` route, the client and server loggers          | The panel and the log each kept every hook snapshot. Router, query, and pacer panels stay. The fps badge still records to the console.                                                                                                                |
| Taught the lab the posted message shape     | `chat-lab-script.ts`                                                                         | The follow-up request now writes its closing line and stops.                                                                                                                                                                                          |
| Pinned the lab résumé                       | `ChatLabPage.tsx`                                                                            | A new clone was the newest résumé, which remounted the workbench and aborted the follow-up.                                                                                                                                                           |
| Debounced résumé chat saves with Pacer      | `event-sourced-chat-persistence.ts`, `use-event-sourced-resume-ai.ts`                        | `ChatPersistor` calls `setItem` on every streamed change. The save waits 500 ms, and flushes when the run stops, on `pagehide`, and on unmount.                                                                                                       |
| Skipped unchanged chat rows in our own list | `chat-message-equal.ts`, `ResumeAiVirtualMessages.tsx`, `DashboardAssistantConversation.tsx` | The chat UI rebuilds its interrupt list on every snapshot, so its memo never holds. `replace_resume_document` still renders every time, because its approval state is not on the part.                                                                |
| Measured every virtual row                  | `ResumeAiVirtualMessages.tsx`                                                                | Collapsed tool rows used a fixed 44 px estimate, so opening the tool panel was clipped. Rows now report their height. Checked in the lab: a "Get Resume" row was 90 px closed and 410 px open, and the parameter `<pre>` (124 px) sat inside the row. |

## Where the same fixes landed

| Surface             | Virtual rows                                                                                                      | Skip unchanged rows            | Debounced save                                                                                                                               |
| ------------------- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Chat lab            | Yes. It renders the résumé workbench.                                                                             | Yes                            | The lab is signed out, so the résumé save does not write. The replay fix is what this surface measures.                                      |
| Main résumé chat    | Yes. `EventSourcedResumeAiTab` renders `ResumeAiConversationCard`.                                                | Yes                            | Yes. Pacer `Debouncer`, flushed when the run settles.                                                                                        |
| Dashboard assistant | No. One bubble per message, and the list stays short, so a virtualizer is not worth a second list implementation. | Yes. `StableDashboardMessage`. | Yes. Its `localStorage` adapter was still writing the whole transcript on every chunk. It now uses the same 500 ms Pacer debounce and flush. |

## Final gains

Dev server, JD-draft, one pinned résumé.

|                                   | With the devtools log, replaying    | Log removed, still replaying             | Turn ends (Pacer save in place)                                          |
| --------------------------------- | ----------------------------------- | ---------------------------------------- | ------------------------------------------------------------------------ |
| Requests in the run               | Continuous. Body 42 KB and growing. | 51 in 10 s. Body 42 KB to 255 KB.        | 2. Body 42 KB to 51 KB.                                                  |
| Idle heap                         | ~130 MB                             | 125 MB                                   | 128 MB                                                                   |
| Peak heap                         | 257 MB, still held                  | 220 MB, then a collection back to 141 MB | 145 MB during the reply, 127 MB once idle                                |
| fps while a request was in flight | 6–11 for the whole loop             | 7–13 for the whole loop                  | 60 while streaming. One sample at 16 as the clone card mounted, then 60. |
| Heap snapshot file                | 582 MB                              | 161 MB                                   | Not retaken. The idle heap matches the start of the run.                 |
| `hook:state-snapshot` records     | 3,313 strings, one of them 22.1 MB  | 2 mentions, both in library source       | Same                                                                     |

What is still on the idle heap in dev, and was there before the chat started: the Vite module sources and the source maps for `react-pdf` (7.2 MB), Sentry (2.9 MB), `lucide-react` (2.8 MB), and `react-dom` (1.9 MB).

## Checks

| Check                          | Result                                                                                                       |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| Expand a tool panel in the lab | Row grew from 90 px to 410 px. The parameter panel was inside the row. Closing it returned the row to 90 px. |
| Playwright e2e                 | 24 passed in 9.3 minutes.                                                                                    |

The signed-in résumé save and the dashboard `localStorage` save were not exercised by the lab. The lab has no user id, and the dashboard was not driven through a model turn.

## Recheck, 21 Oct 2026

Same JD-draft preset, one pinned résumé, one prompt. `VITE_REACT_DEVTOOLS_MCP` was unset, so the React DevTools MCP hook was not in either bundle. The dev fps badge only logs after it is clicked, and this pass read it at 60 fps once the reply was on screen. Production has no badge, so frames there come from `requestAnimationFrame`.

|                         | Dev (`localhost:3040`)                                                                    | Production bundle                                                            |
| ----------------------- | ----------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Requests                | 2. Bodies 42,899 B then 51,396 B. Both 200.                                               | 2. Bodies 42,630 B then 51,117 B. Both 200.                                  |
| Turn                    | Closed on the draft line. No further `POST /api/ai/chat-lab`.                             | Closed on the same line.                                                     |
| DOM after the reply     | 638 nodes                                                                                 | 763 nodes                                                                    |
| Heap (`usedJSHeapSize`) | 131 MB idle after the reply                                                               | 84 MB before the prompt, 95 MB peak while the cards mounted, 59 MB once idle |
| Heap snapshot file      | 155 MB, 1,113,012 nodes                                                                   | 75 MB, 726,259 nodes                                                         |
| `hook:state-snapshot`   | 2 mentions, in library source                                                             | 1 mention                                                                    |
| fps                     | Badge at 60 after the reply                                                               | 60, then 40 and 28 for the two seconds the tool cards mounted, then 60       |
| Large strings           | Source maps: `react-pdf` 7.2 MB, Sentry 2.9 MB, `lucide-react` 2.8 MB, `react-dom` 1.9 MB | No string over 400 KB                                                        |

The dev numbers match the "turn ends" column above. The replay loop did not return.

A normal production build does not serve this lab. `/dev/chat-lab` calls `notFound()` when `import.meta.env.DEV` is false, and `POST /api/ai/chat-lab` returns 404 for the same reason. The production row used a production bundle with those two checks opened, and `VITE_API_URL` pointed at that server so sign-in stayed on the same origin. Those source checks were put back after the build. The fps dip to 28 is the clone card mounting, then the frame rate returns to 60. The idle heap is about half the dev heap because the Vite source maps are gone.
