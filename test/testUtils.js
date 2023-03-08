import { addFilesApiLogger, MemFilesApi } from "@statewalker/webrun-files";
import GitHistory from "../src/GitHistory.js";
import * as git from "isomorphic-git";

// import { NodeFilesApi } from "@statewalker/webrun-files";
// import fsPromises from "fs/promises";
// const __dirname = new URL(".", import.meta.url).pathname;

export async function newGitHistory(
  { files, userName = "JohnSmith", filesApiLog, ...options } = {},
) {
  let filesApi = new MemFilesApi();
  if (filesApiLog) filesApi = addFilesApiLogger({ filesApi, log: filesApiLog });
  // const filesApi = new NodeFilesApi({
  //   rootDir : __dirname + "test-dir",
  //   fs : fsPromises
  // })

  await filesApi.remove("/");
  await writeFiles(filesApi, files);

  const history = new GitHistory({
    git,
    userName,
    ...options,
    filesApi,
  });
  return history;
}

export async function writeFiles(api, files) {
  if (!files) return;
  for (const [path, content] of Object.entries(files)) {
    await writeFileContent(api, path, content);
  }
}

export async function writeFileContent(api, path, content) {
  await api.write(path, async function* () {
    const textEncoder = new TextEncoder();
    yield textEncoder.encode(content);
  });
}

export async function readFileContent(api, path) {
  const decoder = new TextDecoder();
  let str = "";
  for await (let chunk of api.read(path)) {
    str += decoder.decode(chunk);
  }
  return str;
}
