1. Resume items seem to be pegged to resumes making duplicats occur alot for example in the links section there no point to have diffrent entry for linkedin and githb for the multiple resumes
   ![links screenshot](todos/Screenshot from 2026-05-10 09-16-07.png)
   Investigate all such caces and see hwre decpuling from resume id is adivisble na do it to avoid the dupliation that this current approach will create

2. Edit resume ai chat section has a few quirks i wish we could address
   todos/Screenshot from 2026-05-10 09-23-23.png

- chat history and having it in the db and use tanstack db loccaly for great
  we can use this library to fix almosta ll of the UI issues https://www.prompt-kit.com/docs/installation
- markdown output support
- abilty to resend a past prompt if for example the response was bad maybe reword it then send
- better indicators for pending responses and not just when thinking

You can refrence the agnt skills in apps/web/node_modules/@tanstack/ai/skills
