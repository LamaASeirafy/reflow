import * as vm from 'vm'
import {runInSandbox} from '../../sandbox';
import {Title} from '../../'

import {
  Strategy,
  TitlePathMapping,
  StrategyConfig,
  FilePath,
} from './base'

interface ReflowSandbox extends vm.Context {
  resolvers: Title[],
  flow(title: Title, fn?: any): void,
  subflow(title: Title, fn?: any): void,
  hook(title: Title, fn?: any): void,
  describe(title: Title, fn?: any): void,
}

const reflowSandbox:ReflowSandbox = {
  resolvers: [],
  subflow(title: Title, fn: any): void {
    reflowSandbox.resolvers.push(title);
  },
  hook(title: Title, fn: any): void {
    reflowSandbox.resolvers.push(title);
  },
  flow(title: Title, fn: any): void {
    reflowSandbox.resolvers.push(title);
  },
  describe(title: Title): void {
    reflowSandbox.resolvers.push(title);
  },
}

export
interface RequireStrategyConfig extends StrategyConfig {

}

export
class RequireStrategy extends Strategy {
  constructor(config: RequireStrategyConfig) {
    const {
      glob,
    } = config;
    super({ glob })
  }
  async generateMapping() {
    const mapping: TitlePathMapping = {};
    const sandboxes = await Promise.all(
      this.filePaths.map((filePath:FilePath) => runInSandbox(filePath, reflowSandbox))
    ) as ReflowSandbox[]

    sandboxes
      .map(sandbox => sandbox.resolvers)
      .forEach((titles: Title[]) => {
        titles.forEach((title: Title, index: number) => {
          const filePath: FilePath =  this.filePaths[index];
          mapping[title] = filePath;
        })
      })

    this.mapping = mapping;
  }
}
