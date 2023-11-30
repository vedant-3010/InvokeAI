import { Middleware } from '@reduxjs/toolkit';
import { $socketOptions } from 'app/hooks/useSocketIO';
import { $authToken } from 'app/store/nanostores/authToken';
import { $baseUrl } from 'app/store/nanostores/baseUrl';
import { $customStarUI, CustomStarUi } from 'app/store/nanostores/customStarUI';
import { $headerComponent } from 'app/store/nanostores/headerComponent';
import { $isDebugging } from 'app/store/nanostores/isDebugging';
import { $projectId } from 'app/store/nanostores/projectId';
import { $queueId, DEFAULT_QUEUE_ID } from 'app/store/nanostores/queueId';
import { store } from 'app/store/store';
import { PartialAppConfig } from 'app/types/invokeai';
import React, {
  PropsWithChildren,
  ReactNode,
  lazy,
  memo,
  useEffect,
} from 'react';
import { Provider } from 'react-redux';
import { addMiddleware, resetMiddlewares } from 'redux-dynamic-middlewares';
import { ManagerOptions, SocketOptions } from 'socket.io-client';
import Loading from 'common/components/Loading/Loading';
import AppDndContext from 'features/dnd/components/AppDndContext';
import 'i18n';

const App = lazy(() => import('./App'));
const ThemeLocaleProvider = lazy(() => import('./ThemeLocaleProvider'));

interface Props extends PropsWithChildren {
  apiUrl?: string;
  token?: string;
  config?: PartialAppConfig;
  headerComponent?: ReactNode;
  middleware?: Middleware[];
  projectId?: string;
  queueId?: string;
  selectedImage?: {
    imageName: string;
    action: 'sendToImg2Img' | 'sendToCanvas' | 'useAllParameters';
  };
  customStarUi?: CustomStarUi;
  socketOptions?: Partial<ManagerOptions & SocketOptions>;
  isDebugging?: boolean;
}

const InvokeAIUI = ({
  apiUrl,
  token,
  config,
  headerComponent,
  middleware,
  projectId,
  queueId,
  selectedImage,
  customStarUi,
  socketOptions,
  isDebugging = false,
}: Props) => {
  useEffect(() => {
    // configure API client token
    if (token) {
      $authToken.set(token);
    }

    // configure API client base url
    if (apiUrl) {
      $baseUrl.set(apiUrl);
    }

    // configure API client project header
    if (projectId) {
      $projectId.set(projectId);
    }

    // configure API client project header
    if (queueId) {
      $queueId.set(queueId);
    }

    // reset dynamically added middlewares
    resetMiddlewares();

    // TODO: at this point, after resetting the middleware, we really ought to clean up the socket
    // stuff by calling `dispatch(socketReset())`. but we cannot dispatch from here as we are
    // outside the provider. it's not needed until there is the possibility that we will change
    // the `apiUrl`/`token` dynamically.

    // rebuild socket middleware with token and apiUrl
    if (middleware && middleware.length > 0) {
      addMiddleware(...middleware);
    }

    return () => {
      // Reset the API client token and base url on unmount
      $baseUrl.set(undefined);
      $authToken.set(undefined);
      $projectId.set(undefined);
      $queueId.set(DEFAULT_QUEUE_ID);
    };
  }, [apiUrl, token, middleware, projectId, queueId]);

  useEffect(() => {
    if (customStarUi) {
      $customStarUI.set(customStarUi);
    }

    return () => {
      $customStarUI.set(undefined);
    };
  }, [customStarUi]);

  useEffect(() => {
    if (headerComponent) {
      $headerComponent.set(headerComponent);
    }

    return () => {
      $headerComponent.set(undefined);
    };
  }, [headerComponent]);

  useEffect(() => {
    if (socketOptions) {
      $socketOptions.set(socketOptions);
    }
    return () => {
      $socketOptions.set({});
    };
  }, [socketOptions]);

  useEffect(() => {
    if (isDebugging) {
      $isDebugging.set(isDebugging);
    }
    return () => {
      $isDebugging.set(false);
    };
  }, [isDebugging]);

  return (
    <React.StrictMode>
      <Provider store={store}>
        <React.Suspense fallback={<Loading />}>
          <ThemeLocaleProvider>
            <AppDndContext>
              <App config={config} selectedImage={selectedImage} />
            </AppDndContext>
          </ThemeLocaleProvider>
        </React.Suspense>
      </Provider>
    </React.StrictMode>
  );
};

export default memo(InvokeAIUI);
