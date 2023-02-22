import * as git from 'git-essentials'
import {
  makeWebHttpClient
} from 'git-essentials/clients/WebHttpClient'

const http = makeWebHttpClient({
  fetch,
  //transformRequestUrl: url => `https://gitcorsproxy.vercel.app/api/cors?url=${encodeURIComponent(url)}`
})
const dir = 'data-repo'
const url = "https://github.com/isomorphic-git/isomorphic-git"


import fs from "fs/promises";
import LightFsAdapter from "./LightFsAdapter.js";
import {
  MemFilesApi,
  NodeFilesApi
} from "@statewalker/webrun-files";

Promise.resolve().then(main).catch(console.error);

function newLocalFilesApi() {
  return new NodeFilesApi({
    fs,
    rootDir: new URL("./data-workspaces",
      import.meta.url).pathname,
  });
}

function newMemFilesApi() {
  return new MemFilesApi()
}

async function main() {

  //  await clone({ fs, http, dir, url, depth: 1, ref: 'dist' })

  const inMem = true;
  const filesApi = inMem ? newMemFilesApi() : newLocalFilesApi();

  const config = {
    dir: "./test-repo",
    url: "https://projects.statewalker.com/StateWalkerProjects/TestRepo.git",
    ref: "main"
  };

  await fs.rm(config.dir, {
    recursive: true,
    force: true
  })

  await fs.mkdir(config.dir, {
    recursive: true
  })

  await git.init({
    fs,
    ...config
  })

  await git.branch({ fs, ...config, checkout:true })
  
  await git.checkout({ fs, ...config })


  await fs.writeFile(`${config.dir}/hello.txt`, `# TEST`)

  await git.add({
    fs,
    filepath: 'hello.txt',
    ...config
  })

  let sha = await git.commit({
    fs,
    author: {
      name: 'Mr. Test',
      email: 'mrtest@example.com',
    },
    message: 'Added the hello.txt file',
    ...config
  })
  console.log(sha)

  let commits = await git.log({
    fs,
    ...config
  })
  console.log(commits)

  commits = await git.log({
    fs,
    ...config
  })
  console.log(commits)

  
  console.log('done')

  /*
    await clone({
      fs,//: new LightFsAdapter({ filesApi }),
      http,
      // corsProxy: "https://cors.isomorphic-git.org",
      // url: "https://github.com/isomorphic-git/isomorphic-git",
      ...config
    });
    */

  return;

  const logs = await git.log({
    fs,
    dir: config.dir
  })

  console.log(logs);

  // Now it should not be empty...
  // const content = await fs.readdir(dir);
}