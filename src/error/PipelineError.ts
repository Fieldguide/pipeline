import { PipelineMetadata } from "../types";

/**
 * An error when executing a pipeline.
 */
export class PipelineError<
  A extends object,
  C extends object,
  R extends object
> extends Error {
  /**
   * Retrieve data from the pipeline execution that caused this error. This includes the Context, Metadata, and any Results from the pipeline so far.
   */
  public getPipelineData() {
    return this.pipelineData;
  }

  private pipelineData: {
    context: C;
    results: Partial<R>;
    metadata: PipelineMetadata<A>;
  };

  constructor(
    message: string,
    protected pipelineContext: C | undefined,
    protected pipelineResults: Partial<R>,
    protected pipelineMetadata: PipelineMetadata<A>,
    /** A throwable that caused this exception */
    public readonly cause?: unknown
  ) {
    // prepend the message with the pipeline name
    super(`[${pipelineMetadata.name}] ${message}`);

    // store pipeline data so it can be caught/retrieved later
    this.pipelineData = {
      context: pipelineContext,
      metadata: pipelineMetadata,
      results: pipelineResults,
    };
  }
}
