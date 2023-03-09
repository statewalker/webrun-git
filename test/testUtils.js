import { addFilesApiLogger, MemFilesApi } from "@statewalker/webrun-files";
import GitHistory from "../src/GitHistory.js";
import * as git from "isomorphic-git";
import http from "isomorphic-git/http/web/index.js";
import expect from "expect.js";
import { NodeFilesApi } from "@statewalker/webrun-files";
import fsPromises from "fs/promises";
const __dirname = new URL(".", import.meta.url).pathname;

export async function newGitHistory(
  {
    persistent = false,
    files,
    userName = "JohnSmith",
    filesApiLog,
    ...options
  } = {},
) {
  let filesApi = persistent
    ? new NodeFilesApi({
      rootDir: __dirname + "data-workspaces",
      fs: fsPromises,
    })
    : new MemFilesApi();

  if (filesApiLog) filesApi = addFilesApiLogger({ filesApi, log: filesApiLog });

  await filesApi.remove("/");
  await writeFiles(filesApi, files);

  const history = new GitHistory({
    git,
    gitHttp: http,
    userName,
    ...options,
    filesApi,
  });
  return history;
}

export async function checkHistoryStatus(historyApi, branchName, filesStatus) {
  const results = {};
  for await (let fileInfo of historyApi.getFilesStatus()) {
    results[fileInfo.path] = fileInfo.status;
  }
  expect(results).to.eql(filesStatus);

  // await showFiles(api, api.gitDir);

  const branch = await historyApi.getCurrentBranch();
  expect(branch).to.be(branchName);
}

// ----------------------------------

export async function checkFile(filesApi, path, control) {
  const info = await filesApi.stats(path);
  if (!control) expect(info).to.be(null);
  else {
    const { lastModified, ...testInfo } = info;
    expect(testInfo.path).to.eql(path);
    expect(testInfo).to.eql(control);
  }
}

export async function writeFiles(filesApi, files) {
  if (!files) return;
  for (const [path, content] of Object.entries(files)) {
    await writeFileContent(filesApi, path, content);
  }
}

export async function writeFileContent(filesApi, path, content) {
  await filesApi.write(path, async function* () {
    const textEncoder = new TextEncoder();
    yield textEncoder.encode(content);
  });
}

export async function readFileContent(filesApi, path) {
  const decoder = new TextDecoder();
  let str = "";
  for await (let chunk of filesApi.read(path)) {
    str += decoder.decode(chunk);
  }
  return str;
}
