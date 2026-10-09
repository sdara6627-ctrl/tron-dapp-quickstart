# TRC20 授权与商户代扣说明

本模板支持「用户授权一次，商户在额度内划转到自己账户」的能力，仅针对 **TRC20**（如 USDT），且需配合**商户代扣合约**使用。

---

## 一、流程概览

1. **你部署合约**：部署 `contracts/MerchantPull.sol`，得到合约地址，合约的 `owner` 设为你的收款地址。
2. **用户授权**：用户在前端「Approve TRC20」里，对 **Token 合约**授权给 **MerchantPull 合约地址**，授权额度（如 1000 USDT 或「无限」）。
3. **查询**：用户连接钱包后，你可通过其地址用 `getTRXBalance` / `getTRC20Balance` 查询余额；用 `getTRC20Allowance` 查询当前对你的代扣合约的授权额度。
4. **划转**：当需要扣款时（如订单支付、会员扣费），由**你的后端**用 **owner 私钥**调用合约的 `charge(token, userAddress, amount)`，即可将用户的 TRC20 划转到你的 owner 账户，**无需用户再次签名**。

---

## 二、前端已提供能力

| 能力 | 说明 |
|------|------|
| **查询 TRX 余额** | `import { getTRXBalance } from '@/utils/tronWeb'`，传入用户地址即可。 |
| **查询 TRC20 余额** | `getTRC20Balance(tokenContractAddress, userAddress)`。 |
| **查询授权额度** | `getTRC20Allowance(tokenAddress, userAddress, yourPullContractAddress)`。 |
| **用户授权** | Transfer 页签「Approve TRC20」：用户输入代币合约、被授权方（你的 MerchantPull 合约地址）、额度，签名一次即可。 |

---

## 三、商户代扣合约

### 生产环境合约（MerchantPull.sol）

- 合约代码：`contracts/MerchantPull.sol`。
- **仅 owner 可调用** `charge` 函数，确保安全。
- 部署后请将合约地址配置到前端（如环境变量），用户授权时「被授权方」填该地址。
- **划转操作**由你的**服务端**完成：使用 owner 私钥通过 TronWeb 调用 `charge(token, userAddress, amount)`，将用户已授权的 TRC20 转到 owner 地址。私钥仅保存在后端，不要暴露给前端。

### 演示环境合约（MerchantPullDemo.sol）

- 合约代码：`contracts/MerchantPullDemo.sol`。
- **允许任何人调用** `charge` 函数（仅用于前端演示）。
- 用于在「商户代扣」页面演示完整流程，用户可以自己调用 charge 来体验代扣效果。
- **不要在生产环境使用此合约**，它没有 owner 限制，不安全。

---

## 四、注意事项

- **TRX** 没有 approve 机制，无法做「授权一次、后台代扣」，每笔 TRX 转账都需用户签名。
- 用户授权的是**额度**和**被授权方（你的合约）**，你只能在额度内、且仅能通过该合约的 `charge` 划转，不能随意动用户其他资产或未授权代币。
- 建议在 UI 上明确说明授权用途与额度，并遵守当地法规。
