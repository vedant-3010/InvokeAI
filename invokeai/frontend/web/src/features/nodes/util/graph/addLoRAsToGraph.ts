import { RootState } from 'app/store/store';
import { forEach, size } from 'lodash-es';
import {
  CoreMetadataInvocation,
  LoraLoaderInvocation,
  NonNullableGraph,
} from 'services/api/types';
import {
  CANVAS_COHERENCE_DENOISE_LATENTS,
  CANVAS_INPAINT_GRAPH,
  CANVAS_OUTPAINT_GRAPH,
  CLIP_SKIP,
  LORA_LOADER,
  MAIN_MODEL_LOADER,
  NEGATIVE_CONDITIONING,
  POSITIVE_CONDITIONING,
} from './constants';
import { upsertMetadata } from './metadata';

export const addLoRAsToGraph = (
  state: RootState,
  graph: NonNullableGraph,
  baseNodeId: string,
  modelLoaderNodeId: string = MAIN_MODEL_LOADER
): void => {
  /**
   * LoRA nodes get the UNet and CLIP models from the main model loader and apply the LoRA to them.
   * They then output the UNet and CLIP models references on to either the next LoRA in the chain,
   * or to the inference/conditioning nodes.
   *
   * So we need to inject a LoRA chain into the graph.
   */

  const { loras } = state.lora;
  const loraCount = size(loras);

  if (loraCount === 0) {
    return;
  }

  // Remove modelLoaderNodeId unet connection to feed it to LoRAs
  graph.edges = graph.edges.filter(
    (e) =>
      !(
        e.source.node_id === modelLoaderNodeId &&
        ['unet'].includes(e.source.field)
      )
  );
  // Remove CLIP_SKIP connections to conditionings to feed it through LoRAs
  graph.edges = graph.edges.filter(
    (e) =>
      !(e.source.node_id === CLIP_SKIP && ['clip'].includes(e.source.field))
  );

  // we need to remember the last lora so we can chain from it
  let lastLoraNodeId = '';
  let currentLoraIndex = 0;
  const loraMetadata: CoreMetadataInvocation['loras'] = [];

  forEach(loras, (lora) => {
    const { model_name, base_model, weight } = lora;
    const currentLoraNodeId = `${LORA_LOADER}_${model_name.replace('.', '_')}`;

    const loraLoaderNode: LoraLoaderInvocation = {
      type: 'lora_loader',
      id: currentLoraNodeId,
      is_intermediate: true,
      lora: { model_name, base_model },
      weight,
    };

    loraMetadata.push({
      lora: { model_name, base_model },
      weight,
    });

    // add to graph
    graph.nodes[currentLoraNodeId] = loraLoaderNode;
    if (currentLoraIndex === 0) {
      // first lora = start the lora chain, attach directly to model loader
      graph.edges.push({
        source: {
          node_id: modelLoaderNodeId,
          field: 'unet',
        },
        destination: {
          node_id: currentLoraNodeId,
          field: 'unet',
        },
      });

      graph.edges.push({
        source: {
          node_id: CLIP_SKIP,
          field: 'clip',
        },
        destination: {
          node_id: currentLoraNodeId,
          field: 'clip',
        },
      });
    } else {
      // we are in the middle of the lora chain, instead connect to the previous lora
      graph.edges.push({
        source: {
          node_id: lastLoraNodeId,
          field: 'unet',
        },
        destination: {
          node_id: currentLoraNodeId,
          field: 'unet',
        },
      });
      graph.edges.push({
        source: {
          node_id: lastLoraNodeId,
          field: 'clip',
        },
        destination: {
          node_id: currentLoraNodeId,
          field: 'clip',
        },
      });
    }

    if (currentLoraIndex === loraCount - 1) {
      // final lora, end the lora chain - we need to connect up to inference and conditioning nodes
      graph.edges.push({
        source: {
          node_id: currentLoraNodeId,
          field: 'unet',
        },
        destination: {
          node_id: baseNodeId,
          field: 'unet',
        },
      });

      if (
        graph.id &&
        [CANVAS_INPAINT_GRAPH, CANVAS_OUTPAINT_GRAPH].includes(graph.id)
      ) {
        graph.edges.push({
          source: {
            node_id: currentLoraNodeId,
            field: 'unet',
          },
          destination: {
            node_id: CANVAS_COHERENCE_DENOISE_LATENTS,
            field: 'unet',
          },
        });
      }

      graph.edges.push({
        source: {
          node_id: currentLoraNodeId,
          field: 'clip',
        },
        destination: {
          node_id: POSITIVE_CONDITIONING,
          field: 'clip',
        },
      });

      graph.edges.push({
        source: {
          node_id: currentLoraNodeId,
          field: 'clip',
        },
        destination: {
          node_id: NEGATIVE_CONDITIONING,
          field: 'clip',
        },
      });
    }

    // increment the lora for the next one in the chain
    lastLoraNodeId = currentLoraNodeId;
    currentLoraIndex += 1;
  });

  upsertMetadata(graph, { loras: loraMetadata });
};
