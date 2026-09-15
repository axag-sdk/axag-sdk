/**
 * Annotator Orchestrator — coordinates rule-based and AI-powered inference.
 */

import type { ScannedElement, InferredAnnotation } from '../types/index.js';
import type { PageContext } from '../scanner/context-analyzer.js';
import { inferAnnotation } from './rules.js';
import { aiInferAnnotations, type AIInferenceOptions } from './inference-engine.js';
import { logger } from '../utils/logger.js';

export interface AnnotatorOptions {
  domain?: string;
  ai?: {
    enabled: boolean;
  } & AIInferenceOptions;
}

/**
 * Infer AXAG annotations for all scanned elements.
 *
 * 1. Apply heuristic rules to every element.
 * 2. If AI is enabled, enhance low-confidence results with LLM inference.
 * 3. Return the complete annotation set.
 */
export async function inferAnnotations(
  elements: ScannedElement[],
  contexts: PageContext[],
  options: AnnotatorOptions = {},
): Promise<InferredAnnotation[]> {
  logger.section('Inferring AXAG Annotations');

  // Skip elements that already have annotations
  const toAnnotate = elements.filter((el) => !el.hasExistingAnnotations);
  const alreadyAnnotated = elements.filter((el) => el.hasExistingAnnotations);

  if (alreadyAnnotated.length > 0) {
    logger.info(
      `${alreadyAnnotated.length} elements already have AXAG annotations — skipping`,
    );
  }

  // Phase 1: Heuristic inference
  logger.info(`Running heuristic inference on ${toAnnotate.length} elements...`);

  let annotations: InferredAnnotation[] = toAnnotate.map((element) => {
    const context = contexts.find((c) => c.url === element.pageUrl) || {
      url: element.pageUrl,
      title: '',
      metaDescription: '',
      headings: [],
      forms: [],
      navigation: [],
      domain: '',
      inferredDomain: options.domain || 'general',
    };

    return inferAnnotation(element, context, options.domain);
  });

  // Report confidence distribution
  const highConf = annotations.filter((a) => a.confidence >= 0.7).length;
  const medConf = annotations.filter((a) => a.confidence >= 0.4 && a.confidence < 0.7).length;
  const lowConf = annotations.filter((a) => a.confidence < 0.4).length;

  logger.info(`Confidence: ${highConf} high, ${medConf} medium, ${lowConf} low`);

  // Phase 2: AI enhancement (optional)
  if (options.ai?.enabled) {
    annotations = await aiInferAnnotations(
      toAnnotate,
      contexts,
      annotations,
      options.ai,
    );
  }

  logger.success(`Inferred ${annotations.length} annotations`);
  return annotations;
}
