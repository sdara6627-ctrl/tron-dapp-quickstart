import { useContext, useMemo } from 'react';
import { ConfigProvider, theme, App as AntdApp } from 'antd';
import { WalletProvider } from '@tronweb3/tronwallet-adapter-react-hooks';
import { WalletModalProvider } from '@tronweb3/tronwallet-adapter-react-ui';
import {
    BitKeepAdapter,
    GateWalletAdapter,
    LedgerAdapter,
    OkxWalletAdapter,
    TokenPocketAdapter,
    TronLinkAdapter,
    TrustAdapter,
    BybitWalletAdapter,
} from '@tronweb3/tronwallet-adapters';
import Routes from './router';
import { useDarkTheme, DarkThemeContext } from './hooks/useDarkTheme';
import { useLocale } from './hooks/useLocale';
import { logWalletExtensions } from './utils/checkWalletExtension';
import zh_TW from 'antd/es/locale/zh_TW';
import en_US from 'antd/es/locale/en_US';
import './App.css';

import type { FC, PropsWithChildren } from 'react';

export const DarkThemeProvider: FC<PropsWithChildren> = ({ children }) => {
    const { isDarkMode, setDarkMode } = useDarkTheme();

    return <DarkThemeContext value={{ isDarkMode, setDarkMode }}>{children}</DarkThemeContext>;
};

const AntdProvider: FC<PropsWithChildren> = ({ children }) => {
    const { isDarkMode } = useContext(DarkThemeContext);
    const algo = isDarkMode ? theme.darkAlgorithm : theme.defaultAlgorithm;
    const { currentLocale } = useLocale();
    const locale = currentLocale === 'zh_TW' ? zh_TW : en_US;

    return (
        <ConfigProvider
            theme={{
                algorithm: algo,
            }}
            locale={locale}
        >
            {children}
        </ConfigProvider>
    );
};

function App() {
    const adapters = useMemo(() => {
        // 开发环境下输出钱包扩展检测信息
        if (import.meta.env.DEV) {
            // 延迟一下，确保扩展有时间注入
            setTimeout(() => {
                logWalletExtensions();
            }, 1000);
        }
        
        return [
            new TronLinkAdapter(),
            // TokenPocketAdapter: 增加检测超时时间，给扩展更多加载时间
            // 如果扩展已安装但检测不到，请刷新页面
            new TokenPocketAdapter({
                checkTimeout: 5000, // 增加到 5 秒，给扩展更多加载时间
                // openUrlWhenWalletNotFound 保持默认 true，未安装时跳转到官网
            }),
            new OkxWalletAdapter(),
            new BitKeepAdapter(),
            new TrustAdapter(),
            new GateWalletAdapter(),
            new BybitWalletAdapter(),
            new LedgerAdapter(),
        ];
    }, []);
    return (
        <>
            <DarkThemeProvider>
                <AntdProvider>
                    <AntdApp>
                        <WalletProvider adapters={adapters}>
                            <WalletModalProvider>
                                <Routes></Routes>
                            </WalletModalProvider>
                        </WalletProvider>
                    </AntdApp>
                </AntdProvider>
            </DarkThemeProvider>
        </>
    );
}

export default App;
