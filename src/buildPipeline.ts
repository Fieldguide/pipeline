import { merge } from "lodash";
import { PipelineError } from "./error/PipelineError";
import type {
  Pipeline,
  PipelineInitializer,
  PipelineMetadata,
  PipelineMiddleware,
  PipelineResultValidator,
  PipelineStage,
} from "./types";

interface BuildPipelineInput<
  A extends object,
  C extends object,
  R extends object,
> {
  name: string;
  initializer: PipelineInitializer<C, A>;
  stages: PipelineStage<A, C, R>[];
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

    try {
      const stageNames = stages.map((s) => s.name);

      const context = await initializer(args);
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

      for (const stage of stages) {
        // initialize next() with the stage itself
        let next = () => stage(context, metadata) as Promise<Partial<R>>;

        // wrap stage with middleware such that the first middleware is the outermost function
        for (const middleware of reversedMiddleware) {
          next = wrapMiddleware(middleware, stage.name, next);
        }

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
      throw new PipelineError(
        String(cause),
        maybeContext,
        results,
        metadata,
        cause,
      );
    }
  };
}
