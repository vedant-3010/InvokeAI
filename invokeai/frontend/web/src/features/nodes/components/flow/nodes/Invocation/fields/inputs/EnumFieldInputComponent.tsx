import { Select } from '@chakra-ui/react';
import { useAppDispatch } from 'app/store/storeHooks';
import { fieldEnumModelValueChanged } from 'features/nodes/store/nodesSlice';
import {
  EnumFieldInputInstance,
  EnumFieldInputTemplate,
} from 'features/nodes/types/field';
import { FieldComponentProps } from './types';
import { ChangeEvent, memo, useCallback } from 'react';

const EnumFieldInputComponent = (
  props: FieldComponentProps<EnumFieldInputInstance, EnumFieldInputTemplate>
) => {
  const { nodeId, field, fieldTemplate } = props;

  const dispatch = useAppDispatch();

  const handleValueChanged = useCallback(
    (e: ChangeEvent<HTMLSelectElement>) => {
      dispatch(
        fieldEnumModelValueChanged({
          nodeId,
          fieldName: field.name,
          value: e.target.value,
        })
      );
    },
    [dispatch, field.name, nodeId]
  );

  return (
    <Select
      className="nowheel nodrag"
      onChange={handleValueChanged}
      value={field.value}
    >
      {fieldTemplate.options.map((option) => (
        <option key={option} value={option}>
          {fieldTemplate.ui_choice_labels
            ? fieldTemplate.ui_choice_labels[option]
            : option}
        </option>
      ))}
    </Select>
  );
};

export default memo(EnumFieldInputComponent);
