import { z } from "zod";
import { exportBrowserDb, queryBrowserDb } from "./support/browser-db";
import { queryServerDb } from "./support/database";
import { BROWSER_DB_FILE, expect, test } from "./support/fixtures";
import { createAndOpenResume } from "./support/resume-workflow";
import { enableManagedSync, syncNow } from "./support/sync";

test(
  "resume editor edits are pushed to the sync server",
  { tag: "@smoke" },
  async ({ page, account }, testInfo) => {
    const name = `Sync smoke ${account.uniqueId}`;
    const headline = "Staff Platform Engineer";

    await page.goto("/resumes");
    await enableManagedSync(page);
    await createAndOpenResume(page, name);

    const metadata = page.getByTestId("metadata-form");
    await metadata.getByLabel("Headline").fill(headline);
    await metadata.getByRole("button", { name: "Save details" }).click();
    await expect(page.getByText("Details saved")).toBeVisible();

    await syncNow(page);

    const serverEvents = z.array(z.object({ type: z.string(), payload: z.string() })).parse(
      await queryServerDb(
        `select type, payload from sync_event
         where user_id = ? and collection_id = 'resume'
         order by global_seq`,
        [account.userId],
      ),
    );
    expect(serverEvents[0]?.type).toBe("insert");
    expect(JSON.parse(serverEvents.at(-1)?.payload ?? "{}")).toMatchObject({ name, headline });

    const projected = await queryServerDb("select name, headline from resume where user_id = ?", [
      account.userId,
    ]);
    expect(projected).toEqual([{ name, headline }]);

    const browserDb = await exportBrowserDb(page, testInfo.outputPath(BROWSER_DB_FILE));
    const localResumes = queryBrowserDb(
      browserDb,
      "select json_extract(value, '$.name') as name, json_extract(value, '$.headline') as headline from resume",
    );
    expect(localResumes).toEqual([{ name, headline }]);

    const outbox = z.array(z.object({ collectionId: z.string(), syncStatus: z.string() })).parse(
      queryBrowserDb(
        browserDb,
        `select json_extract(value, '$.collectionId') as collectionId,
                json_extract(value, '$.syncStatus') as syncStatus
         from outbox`,
      ),
    );
    expect(outbox.length).toBeGreaterThan(0);
    expect(outbox.filter((event) => event.syncStatus !== "synced")).toEqual([]);
  },
);
