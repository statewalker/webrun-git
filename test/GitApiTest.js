import { MemFilesApi } from "@statewalker/files";
import expect from "expect.js";

describe("Git", function () {

  let filesApi;
  beforeEach(async () => {
    filesApi = new MemFilesApi();
    await filesApi.remove("/");
  });
  // afterEach(async () => {
  //   await filesApi.remove("/");
  // });

  async function writeFileContent(api, path, content) {
    await api.write(path, async function* () {
      const textEncoder = new TextEncoder();
      yield textEncoder.encode(content);
    });
  }

  async function readFileContent(api, path) {
    const decoder = new TextDecoder();
    let str = "";
    for await (let chunk of api.read(path)) {
      str += decoder.decode(chunk);
    }
    return str;
  }

  it(`should...`, async () => {
    await writeFileContent(filesApi, "/a.txt", "Hello!");
    const content = await readFileContent(filesApi, "/a.txt");
    expect(content).to.eql("Hello!");
  });
});
