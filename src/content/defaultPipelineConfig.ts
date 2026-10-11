/** Clip selection policy. Generation models and controls are owned by the API primitives. */
export interface PipelineConfig {
  clipDuration: number;
}

export const DEFAULT_PIPELINE_CONFIG: PipelineConfig = {
  clipDuration: 15,
};
