import {
  AirbyteLogger,
  AirbyteStreamBase,
  StreamKey,
  SyncMode,
} from 'faros-airbyte-cdk';
import {Dictionary} from 'ts-essentials';

import {SemaphoreCI, SemaphoreCIConfig} from '../semaphoreci/semaphoreci';
import {Projects} from './projects';

type StreamSlice =
  | {
      projectId?: string;
      branchName?: string;
    }
  | undefined;

export class Pipelines extends AirbyteStreamBase {
  constructor(
    private readonly config: SemaphoreCIConfig,
    protected readonly logger: AirbyteLogger,
    protected readonly projects: Projects
  ) {
    super(logger);
  }

  getJsonSchema(): Dictionary<any, string> {
    return require('../../resources/schemas/pipelines.json');
  }
  get primaryKey(): StreamKey {
    return 'ppl_id';
  }

  async *streamSlices(): AsyncGenerator<StreamSlice> {
    const semaphore = SemaphoreCI.instance(this.config, this.logger);
    const projects = this.projects.readRecords(SyncMode.FULL_REFRESH);
    const branches = semaphore.branchNames;

    for await (const project of projects) {
      if (branches.length) {
        for (const branch of branches) {
          yield {
            projectId: project.metadata.id,
            branchName: branch,
          };
        }
      } else {
        yield {projectId: project.metadata.id};
      }
    }
  }

  async *readRecords(
    syncMode: SyncMode,
    cursorField?: string[],
    streamSlice?: StreamSlice,
    streamState?: Dictionary<any, string>
  ): AsyncGenerator<Dictionary<any, string>, any, unknown> {
    const semaphoreci = SemaphoreCI.instance(this.config, this.logger);

    yield* semaphoreci.getPipelines(
      streamSlice.projectId,
      streamSlice.branchName
    );
  }
}
