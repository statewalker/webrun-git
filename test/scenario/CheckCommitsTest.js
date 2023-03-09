import expect from "expect.js";
import { newGitHistory, readFileContent, writeFiles, checkFile, checkHistoryStatus } from "../testUtils.js";

describe("Check bugs with commits", function () {
  it(`should properly switch branches after initial commits`, async () => {
    let trackFiles = false;
    const api = await newGitHistory({
      workDir: "/abc",
      gitDir: "/abc/.git",
      // log : console.error,
      // filesApiLog : (options) => {
      //   if (!trackFiles) return ;
      //   if (options.stage !== 'enter') return ;
      //   if (["write"].indexOf(options.method) < 0) return ;
      //   console.log(`filesApi.${options.method}(`, options.args, `)`);
      // }
    });
    await writeFiles(api.filesApi, {
      "/abc/index.md": "Hello world",
    });
    await api.init();

    await checkFile(api.filesApi, api.workDir, {
      "kind": "directory",
      "name": "abc",
      "path": "/abc",
    });
    await checkFile(api.filesApi, "/abc/index.md", {
      "kind": "file",
      "name": "index.md",
      "path": "/abc/index.md",
      "type": "text/markdown",
      "size": 11,
    });

    const workingBranchName = api.workingBranch;

    // Step 1: check that we are in a good branch just after the project initialization
    await checkHistoryStatus(api, workingBranchName, {
      "/abc/index.md": "*added",
    });

    trackFiles = true;
    // Step 2: save files - check that we are still in a good branch and files are added to the history
    await api.saveFiles();
    await checkHistoryStatus(api, workingBranchName, {
      "/abc/index.md": "unmodified",
    });

    // Step 3: modify - check that we are still in a good branch and files are changed
    await writeFiles(api.filesApi, {
      "/abc/index.md": "Hello world 123",
    });
    await checkHistoryStatus(api, workingBranchName, {
      "/abc/index.md": "*modified",
    });

    // Step 4: save files - check that we are still in a good branch and files are added to the history
    await api.saveFiles();
    await checkHistoryStatus(api, workingBranchName, {
      "/abc/index.md": "unmodified",
    });

    // let history = await api.getLog();
    // expect(Array.isArray(history)).to.be(true);
    // expect(history.length).to.be(1);
    // // const status = api._run("log")

    // ----------------------------------

    async function showFiles(api, path) {
      console.log('--------------------')
      for await (let file of api.filesApi.list(path)) {
        // if (file.kind !== 'file') continue;
        console.log('>', file.kind, file.path);
      }
    }
  });
});
