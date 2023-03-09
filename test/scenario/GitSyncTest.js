import expect from "expect.js";
import {
  checkFile,
  checkHistoryStatus,
  newGitHistory,
  readFileContent,
  writeFiles,
} from "../testUtils.js";

const serverConfig = {
  url: "https://projects.statewalker.com/StateWalkerProjects/TestRepo.git",
  username: "test-bot",
  password: "*testbot-tst*",
};

describe("Check synchronization of the local Git repository with the server", function () {
  it(`should be able to add and retrieve configurations for remote servers`, async () => {
    const api = await newGitHistory({
      workDir: "/abc",
      gitDir: "/abc/.git",
    });
    let url = await api.getRemoteServerUrl();
    expect(url).to.eql(null);

    url = await api.setRemoteServerUrl(serverConfig.url);
    expect(url).to.eql(serverConfig.url);
  });

  it(`should be able to checkout a remote repository`, async () => {
    const api = await newGitHistory({
      persistent : true,
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

    await api.setRemoteServerUrl(serverConfig.url);
    await api.syncWithRemote(serverConfig);
    for await (let file of api.filesApi.list(api.workDir, { recursive : true })) {
      if (file.path.indexOf(api.gitDir) === 0) continue;
      console.log('>', file);
    };

    const branch = await api.getCurrentBranch();
    console.log('BRANCH:', branch);

    const list = await api.getLog();
    console.log('LOG:', list);

    // ----------------------------------
    async function checkDir(path, control) {
      const info = await api.filesApi.stats(path);
      if (!control) expect(info).to.be(null);
      else {
        const { lastModified, ...testInfo } = info;
        expect(testInfo.path).to.eql(path);
        expect(testInfo).to.eql(control);
      }
    }

    async function checkStatus(api, branchName, filesStatus) {
      const results = {};
      for await (let fileInfo of api.getFilesStatus()) {
        results[fileInfo.path] = fileInfo.status;
      }
      expect(results).to.eql(filesStatus);

      // await showFiles(api, api.gitDir);

      const branch = await api.getCurrentBranch();
      expect(branch).to.be(branchName);
    }

    async function showFiles(api, path) {
      console.log("--------------------");
      for await (let file of api.filesApi.list(path)) {
        // if (file.kind !== 'file') continue;
        console.log(">", file.kind, file.path);
      }
    }
  });
});
