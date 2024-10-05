import { PipelineError, PipelineRollbackError } from "error";
import { merge } from "lodash";
import type {
  Pipeline,
  PipelineInitializer,
  PipelineMetadata,
  PipelineMiddleware,
  PipelineResultValidator,
  PipelineStage,
  PipelineStageConfiguration,
} from "types";
import { isPipelineStageConfiguration } from "utils";

interface BuildPipelineInput<
  A extends object,
  C extends object,
  R extends object,
> {
  name: string;
  initializer: PipelineInitializer<C, A>;
  stages: (PipelineStage<A, C, R> | PipelineStageConfiguration<A, C, R>)[];
  resultsValidator: PipelineResultValidator<R>;
  middleware?: PipelineMiddleware<A, C, R>[];
}

/**
 * Generic pipeline constructor that takes in configuration information and returns a method to execute the pipeline
 */
export function buildPipeline<
  A extends object,
  C extends object,
  R extends object,
>({
  name,
  initializer,
  stages,
  resultsValidator,
  middleware: middlewares = [],
}: BuildPipelineInput<A, C, R>): Pipeline<A, R> {
  return async (args) => {
    const results: Partial<R> = {};

    /** A context (or undefined) value used for catching/reporting errors */
    let maybeContext: C | undefined = undefined;

    const metadata: PipelineMetadata<A> = {
      name,
      arguments: args,
    };

    const context = await initializer(args);

    /** All stages converted to configurations */
    const stageConfigurations: PipelineStageConfiguration<A, C, R>[] =
      stages.map((stage) => {
        if (isPipelineStageConfiguration(stage)) {
          return stage;
        }

        return {
          execute: stage,
        };
      });

    const potentiallyProcessedStages = [];

    try {
      const stageNames: string[] = stageConfigurations.map(
        (s) => s.execute.name,
      );
      maybeContext = context;

      const reversedMiddleware = [...middlewares].reverse();
      const wrapMiddleware = (
        middleware: PipelineMiddleware<A, C, R>,
        currentStage: string,
        next: () => Promise<Partial<R>>,
      ) => {
        return () => {
          return middleware({
            context,
            metadata,
            results,
            stageNames,
            currentStage,
            next,
          });
        };
      };

      for (const stage of stageConfigurations) {
        // initialize next() with the stage itself
        let next = () =>
          stage.execute(context, metadata) as Promise<Partial<R>>;

        // wrap stage with middleware such that the first middleware is the outermost function
        for (const middleware of reversedMiddleware) {
          next = wrapMiddleware(middleware, stage.execute.name, next);
        }

        // Add stage to a stack that can be rolled back if necessary
        potentiallyProcessedStages.push(stage);

        // invoke middleware-wrapped stage
        const stageResults = await next();

        // if the stage returns results, merge them onto the results object
        if (stageResults) {
          merge(results, stageResults);
        }
      }

      if (!resultsValidator(results)) {
        throw new Error("Results from pipeline failed validation");
      }

      return results;
    } catch (cause) {
      const pipelineError = new PipelineError(
        String(cause),
        maybeContext,
        results,
        metadata,
        cause,
      );

      await rollback(
        potentiallyProcessedStages,
        context,
        metadata,
        results,
        pipelineError,
      );

      // Throw error after rolling back all stages
      throw pipelineError;
    }
  };
}

/**
 * Rollback changes made by stages in reverse order
 */
async function rollback<A extends object, C extends object, R extends object>(
  stages: PipelineStageConfiguration<A, C, R>[],
  context: C,
  metadata: PipelineMetadata<A>,
  results: R,
  originalPipelineError: PipelineError<A, C, R>,
) {
  let stage;
  while ((stage = stages.pop()) !== undefined) {
    try {
      if (stage.rollback) {
        await stage.rollback(context, metadata);
      }
    } catch (rollbackCause) {
      throw new PipelineRollbackError(
        String(`Rollback failed for stage: ${stage.execute.name}`),
        context,
        results,
        metadata,
        originalPipelineError,
        rollbackCause,
      );
    }
  }
}
