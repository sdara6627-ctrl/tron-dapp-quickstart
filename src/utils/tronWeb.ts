import { TronWeb, BigNumber } from 'tronweb';

export { BigNumber } from 'tronweb';

export const tronWeb = new TronWeb({
    fullHost: import.meta.env.TDQ_NILE_TEST_NET,
});

export const getTRC20ContractDecimals = async (contractAddress: string, from: string) => {
    // TRC20 contract should implement decimals function.
    const abi = [
        {
            constant: true,
            inputs: [],
            name: 'decimals',
            outputs: [
                {
                    name: '',
                    type: 'uint8',
                },
            ],
            payable: false,
            stateMutability: 'view',
            type: 'function',
        },
    ] as const;
    const contract = tronWeb.contract(abi, contractAddress);
    return contract.decimals().call({ from });
};

export const getTokenPrecision = async (tokenId: string) => {
    const token = await tronWeb.trx.getTokenByID(tokenId);
    return token.precision;
};

/** 按地址查询 TRX 余额（sun），再除以 1e6 得到 TRX */
export const getTRXBalance = async (address: string): Promise<number> => {
    const balance = await tronWeb.trx.getBalance(address);
    return balance;
};

/** 按地址查询 TRC20 余额（最小单位），需配合 decimals 转为可读数量 */
export const getTRC20Balance = async (contractAddress: string, holderAddress: string): Promise<string> => {
    const abi = [
        {
            constant: true,
            inputs: [{ name: 'who', type: 'address' }],
            name: 'balanceOf',
            outputs: [{ name: '', type: 'uint256' }],
            type: 'function',
        },
    ] as const;
    const contract = tronWeb.contract(abi, contractAddress);
    const balance = await contract.balanceOf(holderAddress).call();
    return balance.toString();
};

/** 查询用户对某 spender 的 TRC20 授权额度（最小单位） */
export const getTRC20Allowance = async (
    contractAddress: string,
    ownerAddress: string,
    spenderAddress: string
): Promise<string> => {
    const abi = [
        {
            constant: true,
            inputs: [
                { name: 'owner', type: 'address' },
                { name: 'spender', type: 'address' },
            ],
            name: 'allowance',
            outputs: [{ name: '', type: 'uint256' }],
            type: 'function',
        },
    ] as const;
    const contract = tronWeb.contract(abi, contractAddress);
    const allowance = await contract.allowance(ownerAddress, spenderAddress).call();
    return allowance.toString();
};

/** 当前是否为 Nile 测试网 */
const isNile = () =>
    (import.meta.env.TDQ_NILE_TEST_NET || '').toLowerCase().includes('nile');

/** TronScan 主网：按地址获取账户持有的 TRC20 列表（仅余额 > 0） */
const TRONSCAN_ACCOUNT_TOKENS = 'https://apilist.tronscanapi.com/api/account/tokens';

async function fetchTRC20FromTronScan(accountAddress: string): Promise<AccountTRC20Token[]> {
    const params = new URLSearchParams({
        address: accountAddress,
        start: '0',
        limit: '200',
        show: '1', // 1 = TRC20 only
        hidden: '0',
        sortType: '0',
        sortBy: '0',
    });
    const res = await fetch(`${TRONSCAN_ACCOUNT_TOKENS}?${params.toString()}`);
    if (!res.ok) return [];
    const json = (await res.json()) as { data?: Array<{ tokenId?: string; tokenType?: string; tokenAbbr?: string; tokenDecimal?: number; balance?: string; quantity?: number }> };
    const data = json.data ?? [];
    const result: AccountTRC20Token[] = [];
    for (const item of data) {
        if (item.tokenType !== 'trc20' || !item.tokenId) continue;
        const balanceRaw = item.balance ?? '0';
        const bn = BigNumber(balanceRaw);
        if (bn.isZero()) continue;
        const decimals = item.tokenDecimal ?? 6;
        const balanceDisplay = bn.dividedBy(BigNumber(10).pow(decimals)).toFixed(4);
        result.push({
            contractAddress: item.tokenId,
            symbol: item.tokenAbbr ?? 'TRC20',
            balanceDisplay: `${balanceDisplay} ${item.tokenAbbr ?? 'TRC20'}`,
        });
    }
    return result;
}

/** 已知 TRC20 代币（按网络）：合约地址、symbol，用于 Nile 或 TronScan 失败时的回退 */
const KNOWN_TRC20 = {
    nile: [
        { contractAddress: 'TXYZopYRdj2D9XRtbG411XZZ3kM5VkAeBf', symbol: 'USDT' },
    ],
    mainnet: [
        { contractAddress: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t', symbol: 'USDT' },
        { contractAddress: 'TLa2f6VPqDgRE67v1736s7bJ8Ray5wYjU7', symbol: 'USDC' },
    ],
} as const;

export interface AccountTRC20Token {
    contractAddress: string;
    symbol: string;
    balanceDisplay: string;
}

/** 根据已连接的钱包地址，获取该地址持有的 TRC20 代币列表（余额 > 0）。先尝试 TronScan API（仅主网有数据），失败或无数据时用已知列表+链上查询（仅 TronGrid，不经过钱包）。 */
export const getAccountTRC20TokenList = async (
    accountAddress: string
): Promise<AccountTRC20Token[]> => {
    if (!accountAddress) return [];

    // 先尝试 TronScan 按地址拉取 TRC20（不依赖钱包扩展，避免 message channel 报错）
    try {
        const list = await fetchTRC20FromTronScan(accountAddress);
        if (list.length > 0) return list;
    } catch (e) {
        console.warn('TronScan TRC20 列表获取失败，回退已知列表', e);
    }

    // TronScan 无数据（例如 Nile 测试网）或失败：用已知列表 + 链上 balance 查询
    const list = isNile() ? KNOWN_TRC20.nile : KNOWN_TRC20.mainnet;
    const result: AccountTRC20Token[] = [];
    for (const item of list) {
        try {
            const [balanceRaw, decimals] = await Promise.all([
                getTRC20Balance(item.contractAddress, accountAddress),
                getTRC20ContractDecimals(item.contractAddress, accountAddress),
            ]);
            const bn = BigNumber(balanceRaw);
            if (bn.isZero()) continue;
            const balanceDisplay = bn
                .dividedBy(BigNumber(10).pow(decimals.toString()))
                .toFixed(4);
            result.push({
                contractAddress: item.contractAddress,
                symbol: item.symbol,
                balanceDisplay: `${balanceDisplay} ${item.symbol}`,
            });
        } catch {
            // 合约不存在或调用失败则跳过
        }
    }
    return result;
};

/** 检查地址在哪个网络上存在 */
export const checkAddressNetwork = async (address: string): Promise<{
    mainnet: boolean;
    testnet: boolean;
    details: {
        mainnet?: { isContract: boolean; exists: boolean };
        testnet?: { isContract: boolean; exists: boolean };
    };
}> => {
    const mainnetTronWeb = new TronWeb({ fullHost: 'https://api.trongrid.io' });
    const testnetTronWeb = new TronWeb({ fullHost: 'https://nile.trongrid.io' });
    
    const result = {
        mainnet: false,
        testnet: false,
        details: {} as {
            mainnet?: { isContract: boolean; exists: boolean };
            testnet?: { isContract: boolean; exists: boolean };
        },
    };
    
    // 检查主网
    try {
        const mainnetContract = await mainnetTronWeb.trx.getContract(address);
        if (mainnetContract && mainnetContract.contract_address) {
            result.mainnet = true;
            result.details.mainnet = { isContract: true, exists: true };
        } else {
            const mainnetAccount = await mainnetTronWeb.trx.getAccount(address);
            if (mainnetAccount && mainnetAccount.address) {
                result.mainnet = true;
                result.details.mainnet = { isContract: false, exists: true };
            }
        }
    } catch (e) {
        result.details.mainnet = { isContract: false, exists: false };
    }
    
    // 检查测试网
    try {
        const testnetContract = await testnetTronWeb.trx.getContract(address);
        if (testnetContract && testnetContract.contract_address) {
            result.testnet = true;
            result.details.testnet = { isContract: true, exists: true };
        } else {
            const testnetAccount = await testnetTronWeb.trx.getAccount(address);
            if (testnetAccount && testnetAccount.address) {
                result.testnet = true;
                result.details.testnet = { isContract: false, exists: true };
            }
        }
    } catch (e) {
        result.details.testnet = { isContract: false, exists: false };
    }
    
    return result;
};
