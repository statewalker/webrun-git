import git from "isomorphic-git";
import http from "isomorphic-git/http/web/index.js";
import fs from "fs/promises";
import LightFsAdapter from "./LightFsAdapter.js";
import { MemFilesApi, NodeFilesApi } from "@statewalker/webrun-files";

Promise.resolve().then(main).catch(console.error);

function newLocalFilesApi(){
  return new NodeFilesApi({
    fs,
    rootDir: new URL("./data-workspaces", import.meta.url).pathname,
  });
}

function newMemFilesApi() {
  return new MemFilesApi()
}

async function main() {
  // const config = {
  //   dir : "./isomorphic-git",
  //   url: "https://github.com/tw-in-js/twind.git",
  //   ref: "main",
  //   singleBranch: true,
  //   depth: 0
  // };
  const config = {
    dir : "./twind",
    url: "https://github.com/tw-in-js/twind.git",
    ref: "main",
    singleBranch: true,
    // depth: 0
  };
  const inMem = false;
  const filesApi = inMem ? newMemFilesApi() : newLocalFilesApi();

  await git.clone({
    fs: { promises: new LightFsAdapter({ filesApi }) },
    http,
    // corsProxy: "https://cors.isomorphic-git.org",
    // url: "https://github.com/isomorphic-git/isomorphic-git",
    ...config
  });

  const logs = await git.log({fs, dir : config.dir})

  console.log(logs);

  // Now it should not be empty...
  // const content = await fs.readdir(dir);
}
