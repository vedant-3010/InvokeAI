import { Box, ChakraProps, Flex, Heading, Image, Text } from '@chakra-ui/react';
import { memo } from 'react';
import { TypesafeDraggableData } from '../types';

type OverlayDragImageProps = {
  dragData: TypesafeDraggableData | null;
};

const BOX_SIZE = 28;

const STYLES: ChakraProps['sx'] = {
  w: BOX_SIZE,
  h: BOX_SIZE,
  maxW: BOX_SIZE,
  maxH: BOX_SIZE,
  shadow: 'dark-lg',
  borderRadius: 'lg',
  opacity: 0.3,
  bg: 'base.800',
  color: 'base.50',
  _dark: {
    borderColor: 'base.200',
    bg: 'base.900',
    color: 'base.100',
  },
};

const DragPreview = (props: OverlayDragImageProps) => {
  const { dragData } = props;

  if (!dragData) {
    return null;
  }

  switch (dragData.payloadType) {
    case 'NODE_FIELD': {
      const { field, fieldTemplate } = dragData.payload;
      return (
        <Box
          sx={{
            position: 'relative',
            p: 2,
            px: 3,
            opacity: 0.7,
            bg: 'base.300',
            borderRadius: 'base',
            boxShadow: 'dark-lg',
            whiteSpace: 'nowrap',
            fontSize: 'sm',
          }}
        >
          <Text>{field.label || fieldTemplate.title}</Text>
        </Box>
      );
    }
    case 'IMAGE_DTO': {
      const { thumbnail_url, width, height } = dragData.payload.imageDTO;
      return (
        <Box
          sx={{
            position: 'relative',
            width: 'full',
            height: 'full',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Image
            sx={{
              ...STYLES,
            }}
            objectFit="contain"
            src={thumbnail_url}
            width={width}
            height={height}
          />
        </Box>
      );
    }
    case 'IMAGE_DTOS': {
      return (
        <Flex
          sx={{
            position: 'relative',
            alignItems: 'center',
            justifyContent: 'center',
            flexDir: 'column',
            ...STYLES,
          }}
        >
          <Heading>{dragData.payload.imageDTOs.length}</Heading>
          <Heading size="sm">Images</Heading>
        </Flex>
      );
    }
    default:
      return null;
  }
};

export default memo(DragPreview);
