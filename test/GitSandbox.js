import * as git from 'git-essentials'
import {
  makeWebHttpClient
} from 'git-essentials/clients/WebHttpClient'

import {
  makeNodeHttpClient
} from 'git-essentials/clients/NodeHttpClient'

import fetch from 'node-fetch'
//const http = makeNodeHttpClient()

const authConfig = { username: 'test-bot', password: '*testbot-tst*' }



const http = makeWebHttpClient({  
  fetch: async (url,options) => {
    //console.log({ url, options })
    /*
    const { username, password } = authConfig
    options.headers = {
      ...options.headers,
      'Authorization': `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`
    }*/
    const response = await fetch(url, options )
   // console.log({response,headers:[...response.headers.entries()]})
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
    //ref: "main"
  };
  

  const branch=`test/${Date.now()}`


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

  await git.branch({
    fs,
    ...config,
    ref: branch,
    checkout: true
  })

  //await git.checkout({ fs, ...config })


  await fs.writeFile(`${config.dir}/hello.txt`, `# TEST ${Date.now()}`)

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


  let commits = await git.log({
    fs,
    ...config
  })
  console.log(commits)


  let push = await git.push({
    fs,
    http,
    dir:config.dir,
    remote: branch,
    url:config.url,
    ref: branch,
    onMessage: async m => {
     // console.log(m)
    },
    onAuthSuccess:  async (...args) => {
     // console.log(args)
    },
    onAuthFailures:  async (...args) => {
     // console.log(args)
    },
    onAuth: () => {
      //console.log('onAuth ici');
      
      const {username,password}=authConfig
      const headers = {
        Authorization: `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`
      }

      return {headers}
    } ,
  })
  console.log(push)

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