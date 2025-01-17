import { Checkbox, Flex, FormControl, FormLabel } from '@chakra-ui/react';
import { useAppDispatch } from 'app/store/storeHooks';
import { useUseCache } from 'features/nodes/hooks/useUseCache';
import { nodeUseCacheChanged } from 'features/nodes/store/nodesSlice';
import { ChangeEvent, memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

const UseCacheCheckbox = ({ nodeId }: { nodeId: string }) => {
  const dispatch = useAppDispatch();
  const useCache = useUseCache(nodeId);
  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      dispatch(
        nodeUseCacheChanged({
          nodeId,
          useCache: e.target.checked,
        })
      );
    },
    [dispatch, nodeId]
  );
  const { t } = useTranslation();
  return (
    <FormControl as={Flex} sx={{ alignItems: 'center', gap: 2, w: 'auto' }}>
      <FormLabel sx={{ fontSize: 'xs', mb: '1px' }}>
        {t('invocationCache.useCache')}
      </FormLabel>
      <Checkbox
        className="nopan"
        size="sm"
        onChange={handleChange}
        isChecked={useCache}
      />
    </FormControl>
  );
};

export default memo(UseCacheCheckbox);
