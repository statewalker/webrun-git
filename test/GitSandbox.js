import git from "isomorphic-git";
import http from "isomorphic-git/http/web/index.js";
import fs from "fs/promises";
import LightFsAdapter from "./LightFsAdapter.js";
import { MemFilesApi, NodeFilesApi } from "@statewalker/webrun-files";

Promise.resolve().then(main).catch(console.error);

function newLocalFilesApi(){
  return new NodeFilesApi({
    fs,
    rootDir: new URL("./data-test", import.meta.url).pathname,
  });
}

function newMemFilesApi() {
  return new MemFilesApi()
}

async function main() {
  const dir = "./isomorphic-git";
  const inMem = true;
  const filesApi = inMem ? newMemFilesApi() : newLocalFilesApi();

  await git.clone({
    fs: { promises: new LightFsAdapter({ filesApi }) },
    http,
    dir,
    // corsProxy: "https://cors.isomorphic-git.org",
    url: "https://github.com/isomorphic-git/isomorphic-git",
    // url: "https://github.com/tw-in-js/twind.git",
    ref: "main",
    singleBranch: true,
    depth: 10
  });

  const logs = await git.log({fs, dir})

  console.log(logs);

  // Now it should not be empty...
  // const content = await fs.readdir(dir);
}
