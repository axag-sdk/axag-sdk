/**
 * Interactive Review — presents annotations to the user for approval/modification.
 */

import inquirer from 'inquirer';
import chalk from 'chalk';
import type { InferredAnnotation } from '../types/index.js';
import { logger } from '../utils/logger.js';
import { showAnnotationDiff } from './diff-viewer.js';

/**
 * Interactive review loop — walks the user through each annotation.
 *
 * Flow:
 *  1. Show the annotation with a before/after preview
 *  2. User can: Accept, Reject, Modify, Skip, Accept All Remaining
 *  3. If Modified → prompt for overrides, then re-show
 *  4. Continue until all annotations reviewed
 */
export async function interactiveReview(
  annotations: InferredAnnotation[],
): Promise<InferredAnnotation[]> {
  logger.section('Interactive Review');

  const total = annotations.length;
  logger.info(`${total} annotations to review. For each one you can:`);
  logger.bullet(`${chalk.green('Accept')}  — keep the inferred annotation as-is`);
  logger.bullet(`${chalk.red('Reject')}  — skip this element (no annotation)`);
  logger.bullet(`${chalk.yellow('Modify')} — change specific attribute values`);
  logger.bullet(`${chalk.blue('Skip')}   — leave as pending for later`);
  logger.bullet(`${chalk.cyan('Accept All')} — accept all remaining annotations`);
  logger.blank();

  let acceptAll = false;
  const reviewed: InferredAnnotation[] = [];

  for (let i = 0; i < annotations.length; i++) {
    const annotation = annotations[i];

    if (acceptAll) {
      reviewed.push({ ...annotation, status: 'accepted' });
      continue;
    }

    // Display annotation
    console.log(chalk.dim(`─── ${i + 1} / ${total} ───────────────────────────────────`));
    showAnnotationDiff(annotation);

    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: `Confidence: ${confidenceBar(annotation.confidence)} — Action?`,
        choices: [
          { name: chalk.green('✔ Accept'), value: 'accept' },
          { name: chalk.red('✖ Reject'), value: 'reject' },
          { name: chalk.yellow('✎ Modify'), value: 'modify' },
          { name: chalk.blue('⏭ Skip (leave pending)'), value: 'skip' },
          { name: chalk.cyan('✔✔ Accept all remaining'), value: 'accept-all' },
        ],
      },
    ]);

    switch (action) {
      case 'accept':
        reviewed.push({ ...annotation, status: 'accepted' });
        logger.success('Accepted');
        break;

      case 'reject':
        reviewed.push({ ...annotation, status: 'rejected' });
        logger.info('Rejected');
        break;

      case 'modify': {
        const modified = await modifyAnnotation(annotation);
        reviewed.push(modified);
        logger.success('Modified & accepted');
        break;
      }

      case 'skip':
        reviewed.push({ ...annotation, status: 'pending' });
        logger.info('Skipped');
        break;

      case 'accept-all':
        acceptAll = true;
        reviewed.push({ ...annotation, status: 'accepted' });
        logger.success(`Accepted this and all ${total - i - 1} remaining annotations`);
        break;
    }

    console.log();
  }

  // Summary
  const accepted = reviewed.filter((a) => a.status === 'accepted').length;
  const rejected = reviewed.filter((a) => a.status === 'rejected').length;
  const modified = reviewed.filter((a) => a.status === 'modified').length;
  const pending = reviewed.filter((a) => a.status === 'pending').length;

  logger.section('Review Summary');
  logger.kv('Accepted', `${accepted}`);
  logger.kv('Rejected', `${rejected}`);
  logger.kv('Modified', `${modified}`);
  logger.kv('Pending', `${pending}`);

  return reviewed;
}

/**
 * Let the user modify specific attributes of an annotation.
 */
async function modifyAnnotation(
  annotation: InferredAnnotation,
): Promise<InferredAnnotation> {
  const overrides: Record<string, string> = {};

  const { fieldsToModify } = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'fieldsToModify',
      message: 'Which fields do you want to change?',
      choices: [
        { name: `intent: ${annotation.intent}`, value: 'intent' },
        { name: `entity: ${annotation.entity}`, value: 'entity' },
        { name: `action-type: ${annotation.actionType}`, value: 'actionType' },
        { name: `description: ${annotation.description}`, value: 'description' },
        { name: `risk-level: ${annotation.riskLevel}`, value: 'riskLevel' },
        { name: `confirmation-required: ${annotation.confirmationRequired}`, value: 'confirmationRequired' },
        { name: `required-parameters: ${JSON.stringify(annotation.requiredParameters)}`, value: 'requiredParameters' },
        { name: `optional-parameters: ${JSON.stringify(annotation.optionalParameters)}`, value: 'optionalParameters' },
      ],
    },
  ]);

  for (const field of fieldsToModify as string[]) {
    switch (field) {
      case 'intent': {
        const { value } = await inquirer.prompt([{ type: 'input', name: 'value', message: 'New intent:', default: annotation.intent }]);
        overrides['axag-intent'] = value;
        break;
      }
      case 'entity': {
        const { value } = await inquirer.prompt([{ type: 'input', name: 'value', message: 'New entity:', default: annotation.entity }]);
        overrides['axag-entity'] = value;
        break;
      }
      case 'actionType': {
        const { value } = await inquirer.prompt([{ type: 'list', name: 'value', message: 'New action type:', choices: ['read', 'write', 'delete', 'execute'], default: annotation.actionType }]);
        overrides['axag-action-type'] = value;
        break;
      }
      case 'description': {
        const { value } = await inquirer.prompt([{ type: 'input', name: 'value', message: 'New description:', default: annotation.description }]);
        overrides['axag-description'] = value;
        break;
      }
      case 'riskLevel': {
        const { value } = await inquirer.prompt([{ type: 'list', name: 'value', message: 'New risk level:', choices: ['none', 'low', 'medium', 'high', 'critical'], default: annotation.riskLevel }]);
        overrides['axag-risk-level'] = value;
        break;
      }
      case 'confirmationRequired': {
        const { value } = await inquirer.prompt([{ type: 'confirm', name: 'value', message: 'Require confirmation?', default: annotation.confirmationRequired }]);
        overrides['axag-confirmation-required'] = String(value);
        break;
      }
      case 'requiredParameters': {
        const { value } = await inquirer.prompt([{ type: 'input', name: 'value', message: 'Required params (comma-separated):', default: annotation.requiredParameters.join(', ') }]);
        overrides['axag-required-parameters'] = JSON.stringify(value.split(',').map((s: string) => s.trim()).filter(Boolean));
        break;
      }
      case 'optionalParameters': {
        const { value } = await inquirer.prompt([{ type: 'input', name: 'value', message: 'Optional params (comma-separated):', default: annotation.optionalParameters.join(', ') }]);
        overrides['axag-optional-parameters'] = JSON.stringify(value.split(',').map((s: string) => s.trim()).filter(Boolean));
        break;
      }
    }
  }

  return {
    ...annotation,
    status: 'modified',
    userOverrides: overrides,
    attributes: { ...annotation.attributes, ...overrides },
  };
}

function confidenceBar(confidence: number): string {
  const filled = Math.round(confidence * 10);
  const empty = 10 - filled;
  const color = confidence >= 0.7 ? chalk.green : confidence >= 0.4 ? chalk.yellow : chalk.red;
  return color('█'.repeat(filled) + '░'.repeat(empty)) + ` ${Math.round(confidence * 100)}%`;
}
