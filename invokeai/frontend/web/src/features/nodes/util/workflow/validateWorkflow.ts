import { parseify } from 'common/util/serialize';
import { t } from 'i18next';
import { keyBy } from 'lodash-es';
import { JsonObject } from 'type-fest';
import { getNeedsUpdate } from 'features/nodes/util/node/nodeUpdate';
import { InvocationTemplate } from 'features/nodes/types/invocation';
import { parseAndMigrateWorkflow } from './migrations';
import {
  WorkflowV2,
  isWorkflowInvocationNode,
} from 'features/nodes/types/workflow';

type WorkflowWarning = {
  message: string;
  issues?: string[];
  data: JsonObject;
};

type ValidateWorkflowResult = {
  workflow: WorkflowV2;
  warnings: WorkflowWarning[];
};

/**
 * Parses and validates a workflow:
 * - Parses the workflow schema, and migrates it to the latest version if necessary.
 * - Validates the workflow against the node templates, warning if the template is not known.
 * - Attempts to update nodes which have a mismatched version.
 * - Removes edges which are invalid.
 * @param workflow The raw workflow object (e.g. JSON.parse(stringifiedWorklow))
 * @param invocationTemplates The node templates to validate against.
 * @throws {WorkflowVersionError} If the workflow version is not recognized.
 * @throws {z.ZodError} If there is a validation error.
 */
export const validateWorkflow = (
  workflow: unknown,
  invocationTemplates: Record<string, InvocationTemplate>
): ValidateWorkflowResult => {
  // Parse the raw workflow data & migrate it to the latest version
  const _workflow = parseAndMigrateWorkflow(workflow);

  // Now we can validate the graph
  const { nodes, edges } = _workflow;
  const warnings: WorkflowWarning[] = [];

  // We don't need to validate Note nodes or CurrentImage nodes - only Invocation nodes
  const invocationNodes = nodes.filter(isWorkflowInvocationNode);
  const keyedNodes = keyBy(invocationNodes, 'id');

  invocationNodes.forEach((node) => {
    const template = invocationTemplates[node.data.type];
    if (!template) {
      // This node's type template does not exist
      const message = t('nodes.missingTemplate', {
        node: node.id,
        type: node.data.type,
      });
      warnings.push({
        message,
        data: parseify(node),
      });
      return;
    }

    if (getNeedsUpdate(node, template)) {
      // This node needs to be updated, based on comparison of its version to the template version
      const message = t('nodes.mismatchedVersion', {
        node: node.id,
        type: node.data.type,
      });
      warnings.push({
        message,
        data: parseify({ node, nodeTemplate: template }),
      });
      return;
    }
  });
  edges.forEach((edge, i) => {
    // Validate each edge. If the edge is invalid, we must remove it to prevent runtime errors with reactflow.
    const sourceNode = keyedNodes[edge.source];
    const targetNode = keyedNodes[edge.target];
    const issues: string[] = [];

    if (!sourceNode) {
      // The edge's source/output node does not exist
      issues.push(
        t('nodes.sourceNodeDoesNotExist', {
          node: edge.source,
        })
      );
    } else if (
      edge.type === 'default' &&
      !(edge.sourceHandle in sourceNode.data.outputs)
    ) {
      // The edge's source/output node field does not exist
      issues.push(
        t('nodes.sourceNodeFieldDoesNotExist', {
          node: edge.source,
          field: edge.sourceHandle,
        })
      );
    }

    if (!targetNode) {
      // The edge's target/input node does not exist
      issues.push(
        t('nodes.targetNodeDoesNotExist', {
          node: edge.target,
        })
      );
    } else if (
      edge.type === 'default' &&
      !(edge.targetHandle in targetNode.data.inputs)
    ) {
      // The edge's target/input node field does not exist
      issues.push(
        t('nodes.targetNodeFieldDoesNotExist', {
          node: edge.target,
          field: edge.targetHandle,
        })
      );
    }

    if (!sourceNode?.data.type || !invocationTemplates[sourceNode.data.type]) {
      // The edge's source/output node template does not exist
      issues.push(
        t('nodes.missingTemplate', {
          node: edge.source,
          type: sourceNode?.data.type,
        })
      );
    }
    if (!targetNode?.data.type || !invocationTemplates[targetNode?.data.type]) {
      // The edge's target/input node template does not exist
      issues.push(
        t('nodes.missingTemplate', {
          node: edge.target,
          type: targetNode?.data.type,
        })
      );
    }

    if (issues.length) {
      // This edge has some issues. Remove it.
      delete edges[i];
      const source =
        edge.type === 'default'
          ? `${edge.source}.${edge.sourceHandle}`
          : edge.source;
      const target =
        edge.type === 'default'
          ? `${edge.source}.${edge.targetHandle}`
          : edge.target;
      warnings.push({
        message: t('nodes.deletedInvalidEdge', { source, target }),
        issues,
        data: edge,
      });
    }
  });
  return { workflow: _workflow, warnings };
};
