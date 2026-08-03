node:internal/errors:985
  const err = new Error(message);
              ^

Error: Command failed: /Users/lehanouyang/.npm/_npx/aa8e5c70f9d8d161/node_modules/@supabase/cli-darwin-arm64/bin/supabase gen types typescript --project-id bfjkiwwbivyxonsosxxd
    at genericNodeError (node:internal/errors:985:15)
    at wrappedFn (node:internal/errors:539:14)
    at checkExecSyncError (node:child_process:925:11)
    at execFileSync (node:child_process:961:15)
    at file:///Users/lehanouyang/.npm/_npx/aa8e5c70f9d8d161/node_modules/supabase/dist/supabase.js:39:3
    at ModuleJob.run (node:internal/modules/esm/module_job:377:25)
    at async onImport.tracePromise.__proto__ (node:internal/modules/esm/loader:691:26)
    at async asyncRunEntryPointWithESMLoader (node:internal/modules/run_main:101:5) {
  status: null,
  signal: 'SIGKILL',
  output: [ null, null, null ],
  pid: 45339,
  stdout: null,
  stderr: null
}

Node.js v24.11.0
