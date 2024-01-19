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
> = (
  context: C,
  metadata: PipelineMetadata<A>,
) => Promise<Partial<R>> | Partial<R> | Promise<void> | void;

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
  results: Partial<R>,
) => boolean;

/**
 * Basic metadata about a pipeline execution
 */
export interface PipelineMetadata<A extends object> {
  arguments: Readonly<A>;
  name: Readonly<string>;
}

interface BasePipelineMiddleware<
  A extends object = object,
  C extends object = object,
  R extends object = object,
> {
  /** Runs before a pipeline stage is executed */
  onStageStart: PipelineMiddlewareCallable<A, C, R>;
  /** Runs after a pipeline stage is executing and includes results returned by that stage */
  onStageComplete: PipelineMiddlewareCallable<A, C, R>;
}

/**
 * Event-based middleware to run around each pipeline stage
 */
export type PipelineMiddlewareFactory = (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ...args: any[]
) => Partial<BasePipelineMiddleware>;

export type PipelineMiddleware =
  | Partial<BasePipelineMiddleware>
  | PipelineMiddlewareFactory;

/**
 * The events that are supported by pipeline middleware
 */
export type PipelineMiddlewareEventType = keyof BasePipelineMiddleware;

/**
 * Functions that can be assigned to each event in the middleware
 */
export type PipelineMiddlewareCallable<
  A extends object = object,
  C extends object = object,
  R extends object = object,
> = (input: PipelineMiddlewarePayload<A, C, R>) => Promise<void> | void;

/**
 * The payload that gets passed to each `PipelineMiddlewareCallable`
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
}
