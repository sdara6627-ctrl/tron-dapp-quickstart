/**
 * 检查钱包扩展是否已安装并注入
 * 用于调试钱包连接问题
 */
export function checkWalletExtensions() {
    const checks: Record<string, boolean> = {};
    
    // 检查 TronLink
    checks.TronLink = typeof window !== 'undefined' && 
        (typeof (window as any).tronLink !== 'undefined' || 
         typeof (window as any).tronWeb !== 'undefined');
    
    // 检查 TokenPocket
    checks.TokenPocket = typeof window !== 'undefined' && 
        typeof (window as any).tokenpocket !== 'undefined';
    
    // 检查 OKX Wallet
    checks.OKX = typeof window !== 'undefined' && 
        typeof (window as any).okxwallet !== 'undefined';
    
    // 检查 BitKeep
    checks.BitKeep = typeof window !== 'undefined' && 
        typeof (window as any).bitkeep !== 'undefined';
    
    return checks;
}

/**
 * 在控制台输出钱包扩展检测结果（开发环境使用）
 */
export function logWalletExtensions() {
    if (import.meta.env.DEV) {
        const checks = checkWalletExtensions();
        console.log('🔍 钱包扩展检测结果:', checks);
        console.log('💡 提示: 如果 TokenPocket 显示 false，请确保：');
        console.log('   1. TokenPocket 扩展已安装并启用');
        console.log('   2. 刷新页面让扩展注入');
        console.log('   3. 检查扩展是否被浏览器阻止');
    }
}
