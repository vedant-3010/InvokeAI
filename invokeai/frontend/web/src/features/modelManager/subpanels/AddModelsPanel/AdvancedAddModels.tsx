import { Flex } from '@chakra-ui/react';
import { SelectItem } from '@mantine/core';
import IAIMantineSelect from 'common/components/IAIMantineSelect';
import { useCallback, useMemo, useState } from 'react';
import AdvancedAddCheckpoint from './AdvancedAddCheckpoint';
import AdvancedAddDiffusers from './AdvancedAddDiffusers';
import { useTranslation } from 'react-i18next';

export type ManualAddMode = 'diffusers' | 'checkpoint';

export default function AdvancedAddModels() {
  const [advancedAddMode, setAdvancedAddMode] =
    useState<ManualAddMode>('diffusers');

  const { t } = useTranslation();
  const handleChange = useCallback((v: string | null) => {
    if (!v) {
      return;
    }
    setAdvancedAddMode(v as ManualAddMode);
  }, []);

  const advancedAddModeData: SelectItem[] = useMemo(
    () => [
      { label: t('modelManager.diffusersModels'), value: 'diffusers' },
      { label: t('modelManager.checkpointOrSafetensors'), value: 'checkpoint' },
    ],
    [t]
  );

  return (
    <Flex flexDirection="column" gap={4} width="100%">
      <IAIMantineSelect
        label={t('modelManager.modelType')}
        value={advancedAddMode}
        data={advancedAddModeData}
        onChange={handleChange}
      />

      <Flex
        sx={{
          p: 4,
          borderRadius: 4,
          bg: 'base.300',
          _dark: {
            bg: 'base.850',
          },
        }}
      >
        {advancedAddMode === 'diffusers' && <AdvancedAddDiffusers />}
        {advancedAddMode === 'checkpoint' && <AdvancedAddCheckpoint />}
      </Flex>
    </Flex>
  );
}
