import { Tab, TabList, TabPanel, TabPanels, Tabs } from '@chakra-ui/react';
import { ReactNode, memo, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import ImportModelsPanel from 'features/modelManager/subpanels/ImportModelsPanel';
import MergeModelsPanel from 'features/modelManager/subpanels/MergeModelsPanel';
import ModelManagerPanel from 'features/modelManager/subpanels/ModelManagerPanel';
import ModelManagerSettingsPanel from 'features/modelManager/subpanels/ModelManagerSettingsPanel';

type ModelManagerTabName =
  | 'modelManager'
  | 'importModels'
  | 'mergeModels'
  | 'settings';

type ModelManagerTabInfo = {
  id: ModelManagerTabName;
  label: string;
  content: ReactNode;
};

const ModelManagerTab = () => {
  const { t } = useTranslation();

  const tabs: ModelManagerTabInfo[] = useMemo(
    () => [
      {
        id: 'modelManager',
        label: t('modelManager.modelManager'),
        content: <ModelManagerPanel />,
      },
      {
        id: 'importModels',
        label: t('modelManager.importModels'),
        content: <ImportModelsPanel />,
      },
      {
        id: 'mergeModels',
        label: t('modelManager.mergeModels'),
        content: <MergeModelsPanel />,
      },
      {
        id: 'settings',
        label: t('modelManager.settings'),
        content: <ModelManagerSettingsPanel />,
      },
    ],
    [t]
  );
  return (
    <Tabs
      isLazy
      variant="line"
      layerStyle="first"
      sx={{ w: 'full', h: 'full', p: 4, gap: 4, borderRadius: 'base' }}
    >
      <TabList>
        {tabs.map((tab) => (
          <Tab sx={{ borderTopRadius: 'base' }} key={tab.id}>
            {tab.label}
          </Tab>
        ))}
      </TabList>
      <TabPanels sx={{ w: 'full', h: 'full' }}>
        {tabs.map((tab) => (
          <TabPanel sx={{ w: 'full', h: 'full' }} key={tab.id}>
            {tab.content}
          </TabPanel>
        ))}
      </TabPanels>
    </Tabs>
  );
};

export default memo(ModelManagerTab);
