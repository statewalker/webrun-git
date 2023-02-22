import * as git from 'git-essentials'
import {
  makeWebHttpClient
} from 'git-essentials/clients/WebHttpClient'

import {
  makeNodeHttpClient
} from 'git-essentials/clients/NodeHttpClient'

import fetch from 'node-fetch'
//const http = makeNodeHttpClient()

const authConfig = {
  username: 'test-bot',
  password: '*testbot-tst*'
}



const http = makeWebHttpClient({
  fetch: async (url, options) => {
    const response = await fetch(url, options)
    return response;
  }
  //transformRequestUrl: url => `https://gitcorsproxy.vercel.app/api/cors?url=${encodeURIComponent(url)}`
})

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
    url: `https://projects.statewalker.com/StateWalkerProjects/TestRepo.git`,
  };


  const branch = `test/${Date.now()}`
  const filename= `hello-${Date.now()}.txt`

  const auth = () => {
    const {
      username,
      password
    } = authConfig
    const headers = {
      Authorization: `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`
    }
    return {
      headers
    }
  }

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

  await git.addRemote({
    fs,
    ...config,
    remote: 'origin'
  })

  await git.fetch({
    fs,
    http,
    ...config,
    remote: 'origin',
    ref: 'main',
    onAuth: auth
  })

  await git.checkout({
    fs,
    http,
    ...config,
    ref: 'main',
    onAuth: auth
  })

  let commits = await git.log({
    fs,
    ...config
  })
  console.log({
    commits
  })

  const { oid } =  commits.pop() ;

  await git.checkout({
    fs,
    ...config,
    ref: oid,
  })


  await git.branch({
    fs,
    ...config,
    ref: branch,
    checkout: true
  })

  await fs.writeFile(`${config.dir}/${filename}`, `# TEST ${Date.now()}`)

  await git.add({
    fs,
    filepath: filename,
    ...config
  })

  let sha = await git.commit({
    fs,
    author: {
      name: 'Mr. Test',
      email: 'mrtest@example.com',
    },
    message: `Added the ${filename} file`,
    ...config
  })
  console.log({
    sha
  })


  const fileList = await git.listFiles({
    fs,
    ...config
  })

  console.log({
    fileList
  });


  commits = await git.log({
    fs,
    ...config
  })
  console.log({
    commits
  })


  let push = await git.push({
    fs,
    http,
    dir: config.dir,
    remote: branch,
    url: config.url,
    ref: branch,
    onAuth: auth
  })
  console.log({
    push
  })


  // await git.pull({
  //   fs,
  //   ...config,
  //   ref: 'main'
  // })

  // commits = await git.log({
  //   fs,
  //   ...config,
  //   ref: 'main'
  // })
  // console.log({
  //   commits
  // })

  // await git.branch({
  //   fs,
  //   ...config,
  //   ref: branch,
  //   checkout: true
  // })


  const merge = await git.merge({
    fs,
    ...config,
    ours: branch,
    theirs: 'main',
    fastForward: false,
    author: {
      name: 'Mr. Test',
      email: 'mrtest@example.com',
    },
  })

  console.log({
    merge
  })


  push = await git.push({
    fs,
    http,
    dir: config.dir,
    remote: branch,
    url: config.url,
    ref: branch,
    onAuth: auth
  })
  console.log({
    push
  })


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