import { useCallback, useRef, useState, useTransition } from 'react';
import { App, Card, Alert } from 'antd';
import { useWallet } from '@tronweb3/tronwallet-adapter-react-hooks';
import Input from '../FormItem/Input';
import { useLocale } from '../../hooks/useLocale';
import {
    tronWeb,
    BigNumber,
    getTRC20ContractDecimals,
    getTRC20Balance,
    getTRC20Allowance,
} from '../../utils/tronWeb';
import styles from './MerchantCharge.module.scss';

/**
 * 商户代扣演示：完整的授权和代扣流程
 * 1. 用户授权（approve）给商户合约
 * 2. 查询授权额度和余额
 * 3. 商户调用 charge 函数划转用户已授权的资金
 * 
 * 注意：实际场景中 charge 应该由商户后端调用，这里用用户钱包演示
 */
export default function MerchantCharge() {
    const { t } = useLocale();
    const { message, notification } = App.useApp();
    const [isApproving, startApproving] = useTransition();
    const [isCharging, startCharging] = useTransition();
    const [isQuerying, setIsQuerying] = useState(false);
    
    const tokenAddress = useRef<string>('');
    const pullContractAddress = useRef<string>('');
    const approveAmount = useRef<string>('');
    const chargeAmount = useRef<string>('');
    
    const [allowance, setAllowance] = useState<string>('');
    const [balance, setBalance] = useState<string>('');
    const [decimals, setDecimals] = useState<number>(6);
    
    const { address: walletAddress, signTransaction } = useWallet();

    const onChangeToken = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        tokenAddress.current = e.target.value;
        setAllowance('');
        setBalance('');
    }, []);
    
    const onChangeContract = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        pullContractAddress.current = e.target.value;
        setAllowance('');
    }, []);
    
    const onChangeApproveAmount = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        approveAmount.current = e.target.value;
    }, []);
    
    const onChangeChargeAmount = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        chargeAmount.current = e.target.value;
    }, []);

    // 查询授权额度和余额
    const onQuery = useCallback(async () => {
        if (!tronWeb.isAddress(tokenAddress.current) || !tronWeb.isAddress(pullContractAddress.current)) {
            message.error(t('sentence_peavcara'));
            return;
        }
        if (!walletAddress) {
            message.error(t('sentence_pcywf'));
            return;
        }
        
        setIsQuerying(true);
        try {
            const tokenDecimals = await getTRC20ContractDecimals(tokenAddress.current, walletAddress);
            setDecimals(Number(tokenDecimals));
            
            const [allowanceRaw, balanceRaw] = await Promise.all([
                getTRC20Allowance(tokenAddress.current, walletAddress, pullContractAddress.current),
                getTRC20Balance(tokenAddress.current, walletAddress),
            ]);
            
            setAllowance(allowanceRaw);
            setBalance(balanceRaw);
            
            const allowanceFormatted = BigNumber(allowanceRaw).dividedBy(BigNumber(10).pow(tokenDecimals.toString())).toString();
            const balanceFormatted = BigNumber(balanceRaw).dividedBy(BigNumber(10).pow(tokenDecimals.toString())).toString();
            
            notification.success({
                message: t('sentence_query_success'),
                description: `${t('label_allowance')}: ${allowanceFormatted}, ${t('label_balance')}: ${balanceFormatted}`,
            });
        } catch (error) {
            notification.error({
                message: t('sentence_query_failed'),
                description: error instanceof Error ? error.message : String(error),
            });
        } finally {
            setIsQuerying(false);
        }
    }, [walletAddress, message, notification, t]);

    // 授权
    const onApprove = useCallback(async () => {
        if (
            !tronWeb.isAddress(tokenAddress.current) ||
            !tronWeb.isAddress(pullContractAddress.current) ||
            !/^[0-9.]+$/.test(approveAmount.current)
        ) {
            message.error(t('sentence_peavcara'));
            return;
        }
        if (!walletAddress) {
            message.error(t('sentence_pcywf'));
            return;
        }
        
        startApproving(async () => {
            try {
                // 先验证合约是否存在
                try {
                    const tokenContract = await tronWeb.trx.getContract(tokenAddress.current);
                    if (!tokenContract || !tokenContract.contract_address) {
                        notification.error({
                            message: t('sentence_contract_not_exist'),
                            description: t('sentence_check_token_address'),
                        });
                        return;
                    }
                } catch (e) {
                    notification.error({
                        message: t('sentence_contract_not_exist'),
                        description: t('sentence_check_token_address'),
                    });
                    return;
                }
                
                try {
                    const pullContract = await tronWeb.trx.getContract(pullContractAddress.current);
                    if (!pullContract || !pullContract.contract_address) {
                        notification.error({
                            message: t('sentence_contract_not_exist'),
                            description: t('sentence_check_pull_contract'),
                        });
                        return;
                    }
                } catch (e) {
                    notification.error({
                        message: t('sentence_contract_not_exist'),
                        description: t('sentence_check_pull_contract'),
                    });
                    return;
                }
                
                const tokenDecimals = await getTRC20ContractDecimals(tokenAddress.current, walletAddress);
                const rawAmount = BigNumber(approveAmount.current)
                    .multipliedBy(BigNumber(10).pow(tokenDecimals.toString()))
                    .integerValue()
                    .toString(10);
                
                console.log('准备授权:', {
                    token: tokenAddress.current,
                    spender: pullContractAddress.current,
                    amount: approveAmount.current,
                    rawAmount: rawAmount,
                    decimals: tokenDecimals,
                });
                    
                const tx = await tronWeb.transactionBuilder.triggerSmartContract(
                    tokenAddress.current,
                    'approve(address,uint256)',
                    { txLocal: true },
                    [
                        { type: 'address', value: pullContractAddress.current },
                        { type: 'uint256', value: BigInt(rawAmount) },
                    ],
                    walletAddress
                );
                
                console.log('交易构建成功:', tx);
                
                const signedTx = await signTransaction(tx.transaction);
                const receipt = await tronWeb.trx.sendRawTransaction(signedTx);
                
                if (receipt.result) {
                    notification.success({ message: t('sentence_ts') });
                    // 授权后自动查询一次
                    setTimeout(() => {
                        onQuery();
                    }, 2000);
                } else {
                    const errorMsg = receipt.message ? tronWeb.toUtf8(receipt.message) : 'Unknown error';
                    notification.error({
                        message: t('sentence_tf'),
                        description: `错误详情: ${errorMsg}`,
                    });
                    console.error('Approve transaction failed:', receipt);
                }
            } catch (error) {
                const errorMsg = error instanceof Error ? error.message : String(error);
                notification.error({
                    message: t('sentence_tf'),
                    description: `授权失败: ${errorMsg}`,
                });
                console.error('Approve error:', error);
            }
        });
    }, [walletAddress, signTransaction, message, notification, t, onQuery]);

    // 商户代扣（charge）
    const onCharge = useCallback(async () => {
        if (
            !tronWeb.isAddress(tokenAddress.current) ||
            !tronWeb.isAddress(pullContractAddress.current) ||
            !/^[0-9.]+$/.test(chargeAmount.current)
        ) {
            message.error(t('sentence_peavcara'));
            return;
        }
        if (!walletAddress) {
            message.error(t('sentence_pcywf'));
            return;
        }
        
        startCharging(async () => {
            try {
                const tokenDecimals = await getTRC20ContractDecimals(tokenAddress.current, walletAddress);
                const rawAmount = BigNumber(chargeAmount.current)
                    .multipliedBy(BigNumber(10).pow(tokenDecimals.toString()))
                    .integerValue()
                    .toString(10);
                
                // 调用商户代扣合约的 charge 函数
                // 注意：实际场景中这应该由商户后端用 owner 私钥调用
                // 这里用 MerchantPullDemo 合约演示，允许用户自己调用（仅用于演示）
                // 生产环境请使用 MerchantPull.sol，仅 owner 可调用
                const tx = await tronWeb.transactionBuilder.triggerSmartContract(
                    pullContractAddress.current,
                    'charge(address,address,uint256)',
                    { txLocal: true },
                    [
                        { type: 'address', value: tokenAddress.current },
                        { type: 'address', value: walletAddress },
                        { type: 'uint256', value: BigInt(rawAmount) },
                    ],
                    walletAddress
                );
                
                const signedTx = await signTransaction(tx.transaction);
                const receipt = await tronWeb.trx.sendRawTransaction(signedTx);
                
                if (receipt.result) {
                    notification.success({ 
                        message: t('sentence_charge_success'),
                        description: t('sentence_charge_desc'),
                    });
                    // 代扣后自动查询一次
                    setTimeout(() => {
                        onQuery();
                    }, 2000);
                } else {
                    notification.error({
                        message: t('sentence_tf'),
                        description: tronWeb.toUtf8(receipt.message),
                    });
                }
            } catch (error) {
                notification.error({
                    message: t('sentence_tf'),
                    description: error instanceof Error ? error.message : String(error),
                });
            }
        });
    }, [walletAddress, signTransaction, message, notification, t, onQuery]);

    const allowanceFormatted = allowance ? BigNumber(allowance).dividedBy(BigNumber(10).pow(decimals.toString())).toString() : '-';
    const balanceFormatted = balance ? BigNumber(balance).dividedBy(BigNumber(10).pow(decimals.toString())).toString() : '-';

    return (
        <div className={styles.container}>
            <Alert
                message={t('alert_merchant_charge_title')}
                description={t('alert_merchant_charge_desc')}
                type="info"
                showIcon
                style={{ marginBottom: 24 }}
            />
            <Alert
                message={t('alert_network_info_title')}
                description={t('alert_network_info_desc')}
                type="warning"
                showIcon
                style={{ marginBottom: 24 }}
            />
            
            {/* 第一步：授权 */}
            <Card title={t('card_title_approve')} style={{ marginBottom: 24 }}>
                <Input
                    className={styles.input}
                    placeholder={t('placeholder_eca')}
                    onChange={onChangeToken}
                    name={t('inputLabel_token')}
                />
                <Input
                    className={styles.input}
                    placeholder={t('placeholder_spender')}
                    onChange={onChangeContract}
                    name={t('inputLabel_spender')}
                />
                <Input
                    className={styles.input}
                    placeholder={t('placeholder_ea')}
                    name={t('inputLabel_a')}
                    onChange={onChangeApproveAmount}
                />
                <button className={styles.submit} disabled={isApproving} onClick={onApprove}>
                    {isApproving ? t('label_approving') : t('Approve')}
                </button>
            </Card>

            {/* 第二步：查询 */}
            <Card title={t('card_title_query')} style={{ marginBottom: 24 }}>
                <div className={styles.queryResult}>
                    <div className={styles.queryItem}>
                        <span className={styles.queryLabel}>{t('label_allowance')}:</span>
                        <span className={styles.queryValue}>{allowanceFormatted}</span>
                    </div>
                    <div className={styles.queryItem}>
                        <span className={styles.queryLabel}>{t('label_balance')}:</span>
                        <span className={styles.queryValue}>{balanceFormatted}</span>
                    </div>
                </div>
                <button className={styles.submit} disabled={isQuerying} onClick={onQuery}>
                    {isQuerying ? t('label_querying') : t('label_query')}
                </button>
            </Card>

            {/* 第三步：商户代扣 */}
            <Card title={t('card_title_charge')}>
                <Alert
                    message={t('alert_charge_note')}
                    type="warning"
                    style={{ marginBottom: 16 }}
                />
                <Input
                    className={styles.input}
                    placeholder={t('placeholder_ea')}
                    name={t('inputLabel_charge_amount')}
                    onChange={onChangeChargeAmount}
                />
                <button className={styles.submit} disabled={isCharging} onClick={onCharge}>
                    {isCharging ? t('label_charging') : t('label_charge')}
                </button>
            </Card>
        </div>
    );
}
