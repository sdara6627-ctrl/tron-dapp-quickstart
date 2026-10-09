import { useCallback, useEffect, useRef, useTransition, useState } from 'react';
import { App } from 'antd';
import { useWallet } from '@tronweb3/tronwallet-adapter-react-hooks';
import Input from '../../FormItem/Input';
import Select from '../../FormItem/Select';
import { useLocale } from '../../../hooks/useLocale';
import {
    tronWeb,
    BigNumber,
    getTRC20ContractDecimals,
    getAccountTRC20TokenList,
    type AccountTRC20Token,
} from '../../../utils/tronWeb';
import styles from './Transfers.module.scss';

/** 被授权方地址写死（商户代扣合约等） */
const SPENDER_ADDRESS = 'TAApuogJFMG9cmp2rMayQh2XgF3GM4PHKK';

/**
 * TRC20 授权（approve）：用户授权给「商户代扣合约」一定额度后，
 * 商户可在额度内通过合约划转到自己账户，无需用户每次签名。
 * 代币从已连接钱包地址持有的 TRC20 中选择，被授权方固定为 SPENDER_ADDRESS。
 * 详见项目 docs/APPROVE_AND_PULL.md
 */
export default function ApproveTRC20() {
    const { t } = useLocale();
    const { message, notification } = App.useApp();
    const [isApproving, startTransition] = useTransition();
    const [tokenList, setTokenList] = useState<AccountTRC20Token[]>([]);
    const [tokenListLoading, setTokenListLoading] = useState(false);
    const [selectedTokenAddress, setSelectedTokenAddress] = useState<string>('');
    const amount = useRef<string>('');
    const manualTokenAddress = useRef<string>('');
    const { address: walletAddress, signTransaction } = useWallet();

    const fetchTokenList = useCallback(async () => {
        if (!walletAddress) {
            setTokenList([]);
            setSelectedTokenAddress('');
            return;
        }
        setTokenListLoading(true);
        try {
            const list = await getAccountTRC20TokenList(walletAddress);
            setTokenList(list);
            if (list.length > 0) {
                setSelectedTokenAddress(list[0].contractAddress);
            } else {
                setSelectedTokenAddress('');
            }
        } catch (e) {
            console.error('获取 TRC20 列表失败:', e);
            setTokenList([]);
            setSelectedTokenAddress('');
        } finally {
            setTokenListLoading(false);
        }
    }, [walletAddress]);

    useEffect(() => {
        fetchTokenList();
    }, [fetchTokenList]);

    const onChangeTokenSelect = useCallback((value: string) => {
        setSelectedTokenAddress(value);
    }, []);
    const onChangeManualToken = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        manualTokenAddress.current = e.target.value;
    }, []);
    const onChangeAmount = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        amount.current = e.target.value;
    }, []);

    const getEffectiveTokenAddress = (): string => {
        if (tronWeb.isAddress(selectedTokenAddress)) return selectedTokenAddress;
        const fromManual = manualTokenAddress.current.trim();
        if (tronWeb.isAddress(fromManual)) return fromManual;
        return '';
    };

    const onSubmit = useCallback(async () => {
        const tokenAddress = getEffectiveTokenAddress();
        if (!tronWeb.isAddress(tokenAddress) || !/^[0-9.]+$/.test(amount.current)) {
            message.error(t('sentence_approve_enter_token_and_amount'));
            return;
        }
        if (!walletAddress) {
            message.error(t('sentence_pcywf'));
            return;
        }
        startTransition(async () => {
            try {
                try {
                    const tokenContract = await tronWeb.trx.getContract(tokenAddress);
                    if (!tokenContract || !tokenContract.contract_address) {
                        notification.error({
                            message: t('sentence_contract_not_exist'),
                            description: `代币合约地址 ${tokenAddress} 不存在，请检查地址是否正确或是否在当前网络上`,
                        });
                        return;
                    }
                } catch (e) {
                    notification.error({
                        message: t('sentence_contract_not_exist'),
                        description: `代币合约地址 ${tokenAddress} 不存在或无法访问`,
                    });
                    return;
                }

                const decimals = await getTRC20ContractDecimals(tokenAddress, walletAddress);
                const rawAmount = BigNumber(amount.current)
                    .multipliedBy(BigNumber(10).pow(decimals.toString()))
                    .integerValue()
                    .toString(10);
                const tx = await tronWeb.transactionBuilder.triggerSmartContract(
                    tokenAddress,
                    'approve(address,uint256)',
                    { txLocal: true },
                    [
                        { type: 'address', value: SPENDER_ADDRESS },
                        { type: 'uint256', value: BigInt(rawAmount) },
                    ],
                    walletAddress
                );
                console.log('准备授权:', {
                    token: tokenAddress,
                    spender: SPENDER_ADDRESS,
                    amount: amount.current,
                    rawAmount: rawAmount,
                    decimals: decimals,
                });

                const signedTx = await signTransaction(tx.transaction);
                const receipt = await tronWeb.trx.sendRawTransaction(signedTx);
                if (receipt.result) {
                    notification.success({ message: t('sentence_ts') });
                } else {
                    const errorMsg = receipt.message ? tronWeb.toUtf8(receipt.message) : 'Unknown error';
                    notification.error({
                        message: t('sentence_tf'),
                        description: `授权失败: ${errorMsg}`,
                    });
                    console.error('授权交易失败:', receipt);
                }
            } catch (error) {
                const errorMsg = error instanceof Error ? error.message : String(error);
                notification.error({
                    message: t('sentence_tf'),
                    description: `授权失败: ${errorMsg}`,
                });
                console.error('授权错误:', error);
            }
        });
    }, [walletAddress, signTransaction, message, notification, t]);

    const tokenOptions = tokenList.map((tkn) => ({
        label: `${tkn.symbol} (${tkn.balanceDisplay})`,
        value: tkn.contractAddress,
    }));
    const hasTokenFromWallet = tokenOptions.length > 0;

    return (
        <div className={styles.transferContainer}>
            {walletAddress ? (
                <>
                    <Select
                        className={styles.input}
                        name={t('inputLabel_token')}
                        placeholder={tokenListLoading ? t('sentence_loading_tokens') : t('placeholder_select_token')}
                        options={tokenOptions}
                        value={selectedTokenAddress}
                        onChange={onChangeTokenSelect}
                    />
                    {!hasTokenFromWallet && !tokenListLoading && (
                        <>
                            <p className={styles.hint}>{t('sentence_no_trc20_use_manual')}</p>
                            <Input
                                className={styles.input}
                                placeholder={t('placeholder_eca')}
                                onChange={onChangeManualToken}
                                name={t('inputLabel_token_manual')}
                            />
                        </>
                    )}
                </>
            ) : (
                <div className={styles.input}>{t('sentence_connect_to_see_tokens')}</div>
            )}
            <Input
                className={styles.input}
                placeholder={t('placeholder_ea')}
                name={t('inputLabel_a')}
                onChange={onChangeAmount}
            />
            <button className={styles.submit} disabled={isApproving} onClick={onSubmit}>
                {t('Approve')}
            </button>
        </div>
    );
}
