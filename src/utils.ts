import { PipelineStage, PipelineStageWithRollback } from "types";

export function isPipelineStageWithRollback<
  A extends object,
  C extends object,
  R extends object,
>(
  stage: PipelineStage<A, C, R> | PipelineStageWithRollback<A, C, R>,
): stage is PipelineStageWithRollback<A, C, R> {
  return (stage as PipelineStageWithRollback<A, C, R>).rollback !== undefined;
}

export function getStageName<
  A extends object,
  C extends object,
  R extends object,
>(stage: PipelineStage<A, C, R> | PipelineStageWithRollback<A, C, R>): string {
  if (isPipelineStageWithRollback(stage)) {
    return stage.execute.name;
  }
  return stage.name;
}
