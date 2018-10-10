import {
  ReflowConfig,
  Title,
} from './'

import {getLocator} from './locate'
import {runInSandbox} from './sandbox';

enum ReflowType {
  Suite,
  Subflow,
  Hook,
  Fork,
}

type MatrixEntries = MatrixEntry<any>[]

interface MatrixEntry<ReflowType> {
  type: ReflowType,
  name: string,
  path: any,
  evaluated?: any,
}
// import * as util from 'util';

export
const createMatrixGenerator = async function(reflowConfig: ReflowConfig) {
  const {
    // flowPaths,
    hooks,
    suites,
    subflows,
    locateStrategy = 'require',
    strategyOptions,
  } = reflowConfig;

  // const flowLocator = await getLocator('require', { filePaths: flowPaths });
  const subflowLocator = await getLocator('require', { glob: subflows });
  const hookLocator = await getLocator('require', { glob: hooks });
  const suiteLocator = await getLocator(locateStrategy, {...strategyOptions, glob: suites });

  const createReflowContext = () => {
    const matrix:MatrixEntries = [];
    const reflowContext = {
      matrix,
      flow(title: Title, flowDetails: any) {
        reflowContext.matrix = flowDetails();
      },
      subflow(title: Title, subflowDetails: any) {
        reflowContext.matrix = subflowDetails().suites;
      },
      getSuite(title: Title): MatrixEntry<ReflowType.Suite> {
        const suitePath: string = suiteLocator.locate(title);
        return {
          name: title,
          type: ReflowType.Suite,
          path: suitePath,
          evaluated: suitePath,
        };
      },
      getSubflow(title: Title): MatrixEntry<ReflowType.Subflow> {
        const path = subflowLocator.locate(title);
        return {
          name: title,
          type: ReflowType.Subflow,
          path,
        };
      },
      getHook(title: Title): MatrixEntry<ReflowType.Hook> {
        return {
          name: title,
          type: ReflowType.Hook,
          path: hookLocator.locate(title),
        }
      },
      fork(entries: MatrixEntry<ReflowType>[]): MatrixEntry<ReflowType.Fork> {
        console.log('got forks::', entries)
        return {
          name: `fork(${entries.map(entry => entry.name).join(', ')})`,
          type: ReflowType.Fork,
          path: '',
          evaluated: entries,
        }
      },
    };
    return reflowContext
  }

  async function generateMatrix(filePath: string): Promise<MatrixEntries> {

    let finalResult: any = [];
    const reflowContext = createReflowContext()
    await runInSandbox(filePath, reflowContext)
    const evaluatedMatrix:MatrixEntries = reflowContext.matrix;

    for(let i = 0, l = evaluatedMatrix.length; i < l; i++) {
      const matrix = evaluatedMatrix[i];
      switch(matrix.type) {
        case ReflowType.Suite: {
          finalResult.push(matrix)
          break
        }
        case ReflowType.Subflow: {
          const subMatrix = await generateMatrix(matrix.path)
          finalResult = finalResult.concat(subMatrix)
          break;
        }
        case ReflowType.Fork: {
          finalResult.push(matrix.evaluated)
          break;
        }
      }
    }

    return finalResult
  }
  return generateMatrix
}
