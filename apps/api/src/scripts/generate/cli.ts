import { parseResourceName } from "./names";
import { apiRootFromCli, mountController, writeController, writeService } from "./scaffold";

const USAGE = `Usage:
  pnpm --dir apps/api generate resource <name>
  pnpm --dir apps/api generate module <name>
  pnpm --dir apps/api generate service <name>
  pnpm --dir apps/api generate controller <name> [--mount]

Names are kebab-case. resource/module writes service + controller + tests and
mounts the controller in src/app.ts (explicit .route, not auto-register).
`;

async function main({ argv }: { argv: string[] }) {
  const [command, rawName] = argv;
  if (!command || command === "--help" || command === "-h") {
    console.log(USAGE);
    return;
  }
  if (!rawName) {
    console.error(USAGE);
    process.exitCode = 1;
    return;
  }

  const names = parseResourceName({ raw: rawName });
  const srcDir = `${apiRootFromCli({ cliDir: import.meta.dirname })}/src`;
  const mount = argv.includes("--mount") || command === "resource" || command === "module";

  if (command === "resource" || command === "module") {
    await writeService({ srcDir, names });
    await writeController({ srcDir, names });
    await mountController({ srcDir, names });
    console.log(`Created module ${names.kebab} and mounted /${names.kebab} in app.ts`);
    return;
  }
  if (command === "service") {
    await writeService({ srcDir, names });
    console.log(`Created ${names.kebab}.service.ts`);
    return;
  }
  if (command === "controller") {
    await writeController({ srcDir, names });
    if (mount) await mountController({ srcDir, names });
    console.log(
      mount
        ? `Created ${names.kebab}.controller.ts and mounted /${names.kebab}`
        : `Created ${names.kebab}.controller.ts (pass --mount to add app.ts)`,
    );
    return;
  }

  console.error(`Unknown command ${command}\n\n${USAGE}`);
  process.exitCode = 1;
}

await main({ argv: process.argv.slice(2) });
