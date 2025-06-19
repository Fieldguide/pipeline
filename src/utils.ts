import { PipelineStage, PipelineStageConfiguration } from "./types";

export function isPipelineStageConfiguration<
  A extends object,
  C extends object,
  R extends object,
>(
  stage: PipelineStage<A, C, R> | PipelineStageConfiguration<A, C, R>,
): stage is PipelineStageConfiguration<A, C, R> {
  return (stage as PipelineStageConfiguration<A, C, R>).execute !== undefined;
}
