import expect from "expect.js";
import {
  checkFile,
  checkHistoryStatus,
  newGitHistory,
  readFileContent,
  writeFiles,
} from "../testUtils.js";

// const serverConfig = {
//   url: "https://projects.statewalker.com/StateWalkerProjects/TestRepo.git",
//   userName: "test-bot",
//   userPassword: "*testbot-tst*",
// };

const serverConfig = {
  url: "http://localhost:8180/myrepo.git",
  userName: "admin",
  userPassword: "admin",
}

describe("Check synchronization of the local Git repository with the server", function () {

  it(`should initialize the git history with a predefined server URL`, async () => {
    const api = await newGitHistory({
      ...serverConfig, // this config contains a server URL
      workDir: "/abc",
      gitDir: "/abc/.git",
    });
    let url = await api.getRemoteServerUrl();
    expect(url).to.eql(serverConfig.url);
  });

  it(`should be able to explicitly add and retrieve configurations for remote servers`, async () => {
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
      ...serverConfig,
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

    await api.syncWithRemote();
    for await (let file of api.filesApi.list(api.workDir, { recursive : true })) {
      if (file.path.indexOf(api.gitDir) === 0) continue;
      console.log('>', file);
    };

    const branch = await api.getCurrentBranch();
    expect(branch).to.be(api.mainBranch);

    const list = await api.getLog();
    console.log('LOG:', list);


    await writeFiles(api.filesApi, {
      "/abc/toto.txt" : "This is a TOTO file! " + Date.now()
    });
    await api.saveFiles();
    await api.sendToRemote();

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
