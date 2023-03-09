import expect from "expect.js";
import {
  checkFile,
  checkHistoryStatus,
  newGitHistory,
  readFileContent,
  writeFiles,
} from "../testUtils.js";

// Note:
// These parameters are valid for the repository defined in the
// "test/docker-nginx-git/" folder.
// To launch these tests you need to start the Docker container with the
// image defined in this directory.
//
const serverConfig = {
  url: "http://localhost:8180/myrepo.git",
  userName: "admin",
  userPassword: "admin",
};

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
      persistent: true,
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

    let files = [];
    for await (
      let file of api.filesApi.list(api.workDir, { recursive: true })
    ) {
      if (file.path.indexOf(api.gitDir) === 0) continue;
      files.push(file.path);
    }
    expect(files).to.eql(["/abc/hello.txt"]);

    const branch = await api.getCurrentBranch();
    expect(branch).to.be(api.mainBranch);

    const list = await api.getLog();
    expect(Array.isArray(list)).to.be(true);
    expect(list.length).to.be(1); // Just one commit in the repository
    expect(list[0].commit.message).to.be("1st commit\n");

    await writeFiles(api.filesApi, {
      "/abc/toto.txt": "This is a TOTO file! " + Date.now(),
    });

    ({ files } = await api.saveFiles());
    expect(files).to.eql(["toto.txt"]);

    const result = await api.sendToRemote();
    expect(result.ok).to.be(true);
  });
});
