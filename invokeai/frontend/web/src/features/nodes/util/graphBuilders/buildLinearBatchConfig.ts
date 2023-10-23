import { NUMPY_RAND_MAX } from 'app/constants';
import { RootState } from 'app/store/store';
import { generateSeeds } from 'common/util/generateSeeds';
import { NonNullableGraph } from 'features/nodes/types/types';
import { range } from 'lodash-es';
import { components } from 'services/api/schema';
import { Batch, BatchConfig } from 'services/api/types';
import {
  CANVAS_COHERENCE_NOISE,
  METADATA,
  NOISE,
  POSITIVE_CONDITIONING,
} from './constants';
import { getHasMetadata, removeMetadata } from './metadata';

export const prepareLinearUIBatch = (
  state: RootState,
  graph: NonNullableGraph,
  prepend: boolean
): BatchConfig => {
  const { iterations, model, shouldRandomizeSeed, seed } = state.generation;
  const { shouldConcatSDXLStylePrompt, positiveStylePrompt } = state.sdxl;
  const { prompts, seedBehaviour } = state.dynamicPrompts;

  const data: Batch['data'] = [];

  if (prompts.length === 1) {
    const seeds = generateSeeds({
      count: iterations,
      start: shouldRandomizeSeed ? undefined : seed,
    });

    const zipped: components['schemas']['BatchDatum'][] = [];

    if (graph.nodes[NOISE]) {
      zipped.push({
        node_path: NOISE,
        field_name: 'seed',
        items: seeds,
      });
    }

    if (getHasMetadata(graph)) {
      // add to metadata
      removeMetadata(graph, 'seed');
      zipped.push({
        node_path: METADATA,
        field_name: 'seed',
        items: seeds,
      });
    }

    if (graph.nodes[CANVAS_COHERENCE_NOISE]) {
      zipped.push({
        node_path: CANVAS_COHERENCE_NOISE,
        field_name: 'seed',
        items: seeds.map((seed) => (seed + 1) % NUMPY_RAND_MAX),
      });
    }

    data.push(zipped);
  } else {
    // prompts.length > 1 aka dynamic prompts
    const firstBatchDatumList: components['schemas']['BatchDatum'][] = [];
    const secondBatchDatumList: components['schemas']['BatchDatum'][] = [];

    // add seeds first to ensure the output order groups the prompts
    if (seedBehaviour === 'PER_PROMPT') {
      const seeds = generateSeeds({
        count: prompts.length * iterations,
        start: shouldRandomizeSeed ? undefined : seed,
      });

      if (graph.nodes[NOISE]) {
        firstBatchDatumList.push({
          node_path: NOISE,
          field_name: 'seed',
          items: seeds,
        });
      }

      // add to metadata
      if (getHasMetadata(graph)) {
        removeMetadata(graph, 'seed');
        firstBatchDatumList.push({
          node_path: METADATA,
          field_name: 'seed',
          items: seeds,
        });
      }

      if (graph.nodes[CANVAS_COHERENCE_NOISE]) {
        firstBatchDatumList.push({
          node_path: CANVAS_COHERENCE_NOISE,
          field_name: 'seed',
          items: seeds.map((seed) => (seed + 1) % NUMPY_RAND_MAX),
        });
      }
    } else {
      // seedBehaviour = SeedBehaviour.PerRun
      const seeds = generateSeeds({
        count: iterations,
        start: shouldRandomizeSeed ? undefined : seed,
      });

      if (graph.nodes[NOISE]) {
        secondBatchDatumList.push({
          node_path: NOISE,
          field_name: 'seed',
          items: seeds,
        });
      }

      // add to metadata
      if (getHasMetadata(graph)) {
        removeMetadata(graph, 'seed');
        secondBatchDatumList.push({
          node_path: METADATA,
          field_name: 'seed',
          items: seeds,
        });
      }

      if (graph.nodes[CANVAS_COHERENCE_NOISE]) {
        secondBatchDatumList.push({
          node_path: CANVAS_COHERENCE_NOISE,
          field_name: 'seed',
          items: seeds.map((seed) => (seed + 1) % NUMPY_RAND_MAX),
        });
      }
      data.push(secondBatchDatumList);
    }

    const extendedPrompts =
      seedBehaviour === 'PER_PROMPT'
        ? range(iterations).flatMap(() => prompts)
        : prompts;

    // zipped batch of prompts
    if (graph.nodes[POSITIVE_CONDITIONING]) {
      firstBatchDatumList.push({
        node_path: POSITIVE_CONDITIONING,
        field_name: 'prompt',
        items: extendedPrompts,
      });
    }

    // add to metadata
    if (getHasMetadata(graph)) {
      removeMetadata(graph, 'positive_prompt');
      firstBatchDatumList.push({
        node_path: METADATA,
        field_name: 'positive_prompt',
        items: extendedPrompts,
      });
    }

    if (shouldConcatSDXLStylePrompt && model?.base_model === 'sdxl') {
      const stylePrompts = extendedPrompts.map((p) =>
        [p, positiveStylePrompt].join(' ')
      );

      if (graph.nodes[POSITIVE_CONDITIONING]) {
        firstBatchDatumList.push({
          node_path: POSITIVE_CONDITIONING,
          field_name: 'style',
          items: stylePrompts,
        });
      }

      // add to metadata
      if (getHasMetadata(graph)) {
        removeMetadata(graph, 'positive_style_prompt');
        firstBatchDatumList.push({
          node_path: METADATA,
          field_name: 'positive_style_prompt',
          items: extendedPrompts,
        });
      }
    }

    data.push(firstBatchDatumList);
  }

  const enqueueBatchArg: BatchConfig = {
    prepend,
    batch: {
      graph,
      runs: 1,
      data,
    },
  };

  return enqueueBatchArg;
};
