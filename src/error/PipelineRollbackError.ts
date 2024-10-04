import { PipelineMetadata } from "../types";
import { PipelineError } from "./PipelineError";

/**
 * An error when executing a pipeline.
 */
export class PipelineRollbackError<
  A extends object,
  C extends object,
  R extends object,
> extends PipelineError<A, C, R> {
  constructor(
    message: string,
    protected override pipelineContext: C | undefined,
    protected override pipelineResults: Partial<R>,
    protected override pipelineMetadata: PipelineMetadata<A>,
    /** The PipelineError that prompted the rollback */
    public originalPipelineError: PipelineError<A, C, R>,
    /** A throwable that caused this exception */
    public override readonly cause?: unknown,
  ) {
    super(message, pipelineContext, pipelineResults, pipelineMetadata, cause);
  }
}
