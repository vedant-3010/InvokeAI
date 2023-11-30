import { createSelector } from '@reduxjs/toolkit';
import { stateSelector } from 'app/store/store';
import { useAppSelector } from 'app/store/storeHooks';
import { defaultSelectorOptions } from 'app/store/util/defaultMemoizeOptions';
import { keys, map } from 'lodash-es';
import { useMemo } from 'react';
import { isInvocationNode } from 'features/nodes/types/invocation';
import { getSortedFilteredFieldNames } from 'features/nodes/util/node/getSortedFilteredFieldNames';
import { TEMPLATE_BUILDER_MAP } from 'features/nodes/util/schema/buildFieldInputTemplate';

export const useConnectionInputFieldNames = (nodeId: string) => {
  const selector = useMemo(
    () =>
      createSelector(
        stateSelector,
        ({ nodes }) => {
          const node = nodes.nodes.find((node) => node.id === nodeId);
          if (!isInvocationNode(node)) {
            return [];
          }
          const nodeTemplate = nodes.nodeTemplates[node.data.type];
          if (!nodeTemplate) {
            return [];
          }

          // get the visible fields
          const fields = map(nodeTemplate.inputs).filter(
            (field) =>
              (field.input === 'connection' &&
                !field.type.isCollectionOrScalar) ||
              !keys(TEMPLATE_BUILDER_MAP).includes(field.type.name)
          );

          return getSortedFilteredFieldNames(fields);
        },
        defaultSelectorOptions
      ),
    [nodeId]
  );

  const fieldNames = useAppSelector(selector);
  return fieldNames;
};
