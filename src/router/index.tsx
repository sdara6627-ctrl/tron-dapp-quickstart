import { lazy, Suspense } from 'react';
import { createBrowserRouter, redirect, RouterProvider } from 'react-router-dom';
import { ErrorBoundary } from '../components/ErrorBoundary/ErrorBoundary';

import type { RouteObject } from 'react-router-dom';

const Index = lazy(() => import('../pages/Index/Index'));
const Delegate = lazy(() => import('../pages/Delegate/Delegate'));
const MerchantChargePage = lazy(() => import('../pages/MerchantCharge/MerchantCharge'));

// 加载中的占位组件
const LoadingFallback = () => (
    <div style={{ padding: '20px', textAlign: 'center' }}>加载中...</div>
);

const routes: RouteObject[] = [
  {
    path: '/',
    loader: () => redirect('/transfer'),
  },
  {
    path: '/transfer',
    element: (
      <Suspense fallback={<LoadingFallback />}>
        <Index />
      </Suspense>
    ),
  },
  {
    path: '/delegate',
    element: (
      <Suspense fallback={<LoadingFallback />}>
        <Delegate />
      </Suspense>
    ),
  },
  {
    path: '/merchant-charge',
    errorElement: <div style={{ padding: '20px', color: 'red' }}>路由加载错误，请检查控制台</div>,
    element: (
      <ErrorBoundary>
        <Suspense fallback={<LoadingFallback />}>
          <MerchantChargePage />
        </Suspense>
      </ErrorBoundary>
    ),
  },
  {
    path: '*',
    element: <div style={{ padding: '20px' }}>404 - 页面未找到</div>,
  },
];

// 调试：输出路由配置
try {
  console.log('🔍 Routes configured:', routes.map(r => r.path));
  console.log('🔍 Merchant-charge route exists:', routes.some(r => r.path === '/merchant-charge'));
  console.log('🔍 Routes count:', routes.length);
} catch (e) {
  console.error('❌ Error logging routes:', e);
}

let router;
try {
  router = createBrowserRouter(routes);
  console.log('✅ Router created successfully');
} catch (e) {
  console.error('❌ Error creating router:', e);
  throw e;
}

const Routes = () => {
  return <RouterProvider router={router} />;
};

export default Routes;
