/**
 * AI-Powered Inference Engine — uses LLM to infer AXAG annotations
 * when heuristic rules produce low-confidence results.
 */

import OpenAI from 'openai';
import type { ScannedElement, InferredAnnotation } from '../types/index.js';
import type { PageContext } from '../scanner/context-analyzer.js';
import { AXAG_ATTRIBUTES } from '../utils/constants.js';
import { logger } from '../utils/logger.js';

export interface AIInferenceOptions {
  provider: 'openai' | 'anthropic';
  model: string;
  apiKey?: string;
}

const SYSTEM_PROMPT = `You are an AXAG (Agent Experience Accessibility Guidelines) annotation expert.
Given an HTML element and its page context, infer the correct axag-* attributes.

AXAG attributes:
- axag-intent: "{entity}.{action}" format (e.g., "product.search", "order.checkout")
- axag-entity: The business entity (e.g., "product", "user", "order")
- axag-action-type: "read" | "write" | "delete" | "execute"
- axag-description: Human-readable description of what this element does
- axag-required-parameters: JSON array of required parameter names
- axag-optional-parameters: JSON array of optional parameter names
- axag-risk-level: "none" | "low" | "medium" | "high" | "critical"
- axag-confirmation-required: "true" | "false"
- axag-idempotent: "true" | "false"
- axag-async: "true" | "false"

Rules:
1. Write/delete actions should have appropriate risk levels
2. High-risk or destructive actions should require confirmation
3. Search and read actions are typically idempotent with no risk
4. Parameters should be inferred from surrounding form fields or context
5. Intent should follow "{entity}.{verb}" convention

Respond with ONLY valid JSON matching this schema:
{
  "intent": string,
  "entity": string,
  "actionType": "read" | "write" | "delete" | "execute",
  "description": string,
  "requiredParameters": string[],
  "optionalParameters": string[],
  "riskLevel": "none" | "low" | "medium" | "high" | "critical",
  "confirmationRequired": boolean,
  "idempotent": boolean,
  "async": boolean,
  "confidence": number (0-1),
  "reasoning": string
}`;

/**
 * Use AI to infer annotations for elements where heuristics produced low confidence.
 */
export async function aiInferAnnotations(
  elements: ScannedElement[],
  contexts: PageContext[],
  existingAnnotations: InferredAnnotation[],
  options: AIInferenceOptions,
): Promise<InferredAnnotation[]> {
  const apiKey = options.apiKey || process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    logger.warn('No AI API key found. Set OPENAI_API_KEY or pass --ai-key. Skipping AI inference.');
    return existingAnnotations;
  }

  // Only run AI on low-confidence annotations
  const lowConfidence = existingAnnotations.filter((a) => a.confidence < 0.6);
  if (lowConfidence.length === 0) {
    logger.info('All annotations have sufficient confidence. Skipping AI inference.');
    return existingAnnotations;
  }

  logger.info(`Running AI inference on ${lowConfidence.length} low-confidence elements...`);

  const client = new OpenAI({ apiKey });
  const improved: Map<string, InferredAnnotation> = new Map();

  // Batch elements by page for context efficiency
  for (const annotation of lowConfidence) {
    const element = elements.find((e) => e.id === annotation.elementId);
    if (!element) continue;

    const context = contexts.find((c) => c.url === element.pageUrl);
    if (!context) continue;

    try {
      const userPrompt = buildPrompt(element, context);
      const response = await client.chat.completions.create({
        model: options.model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.2,
        max_tokens: 500,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) continue;

      const parsed = JSON.parse(content);
      const aiAnnotation = mergeAIResult(annotation, parsed);
      improved.set(annotation.elementId, aiAnnotation);

      logger.debug(`AI improved: ${element.textContent} → ${aiAnnotation.intent} (${aiAnnotation.confidence})`);
    } catch (err) {
      logger.debug(`AI inference failed for ${element.id}: ${(err as Error).message}`);
    }
  }

  // Merge AI results back into the full annotation list
  return existingAnnotations.map((a) => improved.get(a.elementId) || a);
}

function buildPrompt(element: ScannedElement, context: PageContext): string {
  return `Analyze this HTML element and infer AXAG annotations:

Element:
- Tag: <${element.tagName}>
- Text: "${element.textContent}"
- Role: ${element.role || 'none'}
- Attributes: ${JSON.stringify(element.attributes)}
- ARIA: ${JSON.stringify(element.ariaAttributes)}

Page Context:
- Title: "${context.title}"
- Description: "${context.metaDescription}"
- Headings: ${context.headings.slice(0, 5).join(', ')}
- Section: "${element.parentContext}"
- Inferred Domain: ${context.inferredDomain}
- Forms on page: ${context.forms.length} (fields: ${context.forms.flatMap((f) => f.fields).join(', ')})

What are the correct AXAG annotations for this element?`;
}

function mergeAIResult(
  original: InferredAnnotation,
  ai: Record<string, unknown>,
): InferredAnnotation {
  const attributes: Record<string, string> = {
    [AXAG_ATTRIBUTES.INTENT]: String(ai.intent || original.intent),
    [AXAG_ATTRIBUTES.ENTITY]: String(ai.entity || original.entity),
    [AXAG_ATTRIBUTES.ACTION_TYPE]: String(ai.actionType || original.actionType),
    [AXAG_ATTRIBUTES.DESCRIPTION]: String(ai.description || original.description),
    [AXAG_ATTRIBUTES.RISK_LEVEL]: String(ai.riskLevel || original.riskLevel),
    [AXAG_ATTRIBUTES.IDEMPOTENT]: String(ai.idempotent ?? original.idempotent),
  };

  const required = (ai.requiredParameters as string[]) || original.requiredParameters;
  const optional = (ai.optionalParameters as string[]) || original.optionalParameters;

  if (required.length > 0) {
    attributes[AXAG_ATTRIBUTES.REQUIRED_PARAMETERS] = JSON.stringify(required);
  }
  if (optional.length > 0) {
    attributes[AXAG_ATTRIBUTES.OPTIONAL_PARAMETERS] = JSON.stringify(optional);
  }
  if (ai.confirmationRequired) {
    attributes[AXAG_ATTRIBUTES.CONFIRMATION_REQUIRED] = 'true';
  }

  return {
    ...original,
    intent: String(ai.intent || original.intent),
    entity: String(ai.entity || original.entity),
    actionType: (ai.actionType as InferredAnnotation['actionType']) || original.actionType,
    description: String(ai.description || original.description),
    requiredParameters: required,
    optionalParameters: optional,
    riskLevel: (ai.riskLevel as InferredAnnotation['riskLevel']) || original.riskLevel,
    confirmationRequired: Boolean(ai.confirmationRequired ?? original.confirmationRequired),
    idempotent: Boolean(ai.idempotent ?? original.idempotent),
    async: Boolean(ai.async ?? original.async),
    confidence: Math.min(1, Number(ai.confidence || 0.85)),
    reasoning: `[AI] ${String(ai.reasoning || 'AI-inferred annotation.')}`,
    attributes,
  };
}
