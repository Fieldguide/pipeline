/**
 * A pipeline is an executable that takes in arguments and produces results
 */
export type Pipeline<A extends object, R extends object> = (
  args: A,
) => Promise<R>;

/**
 * A pipeline stage takes in the context, does processing, and optionally returns a partial result that gets merged with results from other stages
 */
export type PipelineStage<
  A extends object,
  C extends object,
  R extends object,
> = (context: C, metadata: PipelineMetadata<A>) => PipelineStageResult<R>;

/**
 * A pipeline stage that has the ability to rollback changes made with the `execute` function
 */
export interface PipelineStageWithRollback<
  A extends object,
  C extends object,
  R extends object,
> {
  execute: PipelineStage<A, C, R>;
  rollback: (context: C, metadata: PipelineMetadata<A>) => Promise<void> | void;
}

/**
 * Optional partial result that gets merged with results from other stages
 */
export type PipelineStageResult<R extends object> =
  | Promise<Partial<R> | void>
  | Partial<R>
  | void;

/**
 * A method that initializes the pipeline by creating the context object that gets passed to each stage. Note that because the context extends PipelineContext, this method must also include the pipeline name and arguments when constructing the context object.
 *
 * Note that the A type (Arguments) is optional if the arguments are not needed to initialize the context.
 */
export type PipelineInitializer<C extends object, A extends object = object> = (
  args: A,
) => Promise<C> | C;

/**
 * Validates that results at the conclusion of the pipeline's execution are complete
 */
export type PipelineResultValidator<R extends object> = (
  results: Readonly<Partial<R>>,
) => results is R;

/**
 * Basic metadata about a pipeline execution
 */
export interface PipelineMetadata<A extends object> {
  arguments: Readonly<A>;
  name: Readonly<string>;
}

/**
 * Middleware function that can run code before and/or after each stage
 */
export type PipelineMiddleware<
  A extends object = object,
  C extends object = object,
  R extends object = object,
> = (payload: PipelineMiddlewarePayload<A, C, R>) => Promise<Partial<R>>;

/**
 * The payload that gets passed to each `PipelineMiddleware`
 */
export interface PipelineMiddlewarePayload<
  A extends object,
  C extends object,
  R extends object,
> {
  context: C;
  metadata: PipelineMetadata<A>;
  results: Readonly<Partial<R>>;
  stageNames: string[];
  currentStage: string;
  next: () => Promise<Partial<R>>;
}
