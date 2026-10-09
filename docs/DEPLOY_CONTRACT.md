# 商户代扣合约部署指南

本指南将帮助你部署商户代扣合约到 TRON 网络（测试网或主网）。

---

## 一、准备工作

### 1. 选择部署工具

推荐使用以下工具之一：
- **TronIDE**（推荐，最简单）：https://www.tronide.io/
- **Remix + TronBox**：https://remix.ethereum.org/
- **TronStudio**：TRON 官方 IDE

### 2. 准备钱包

- 确保钱包中有足够的 TRX（部署合约需要消耗能量和带宽）
- 测试网：可以从水龙头获取测试 TRX
- 主网：需要真实的 TRX

---

## 二、使用 TronIDE 部署（推荐）

### 步骤 1：打开 TronIDE

访问：https://www.tronide.io/

### 步骤 2：创建新文件

1. 点击左侧 "File Explorer" 的 "+" 按钮
2. 创建新文件：`MerchantPullDemo.sol`

### 步骤 3：复制合约代码

将 `contracts/MerchantPullDemo.sol` 的内容复制到 TronIDE 编辑器中：

```solidity
// SPDX-License-Identifier: MIT
// 商户代扣合约演示版本：允许用户自己调用 charge 来演示代扣流程
// 实际生产环境请使用 MerchantPull.sol（仅 owner 可调用）

pragma solidity ^0.8.0;

interface ITRC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

contract MerchantPullDemo {
    address public owner;

    constructor() {
        owner = msg.sender;
    }

    /**
     * 从用户账户划转 TRC20 到 owner（商户）账户。
     * 演示版本：允许用户自己调用（用于前端演示）
     * 生产版本：仅 owner 可调用（见 MerchantPull.sol）
     */
    function charge(address token, address user, uint256 amount) external {
        // 演示版本：允许任何人调用（只要用户已授权）
        // 生产版本应改为：require(msg.sender == owner, "MerchantPull: only owner");
        require(ITRC20(token).transferFrom(user, owner, amount), "MerchantPullDemo: transfer failed");
    }
}
```

### 步骤 4：编译合约

1. 点击左侧 "Solidity Compiler" 图标
2. 选择编译器版本：`0.8.0` 或更高
3. 点击 "Compile MerchantPullDemo.sol"
4. 确认编译成功（没有错误）

### 步骤 5：连接钱包

1. 点击左侧 "Deploy & Run Transactions" 图标
2. 在 "Environment" 下拉菜单中选择：
   - **Nile Testnet**（测试网）
   - **Mainnet**（主网，需要真实 TRX）
3. 点击 "Connect to TronLink" 或 "Connect Wallet"
4. 在钱包中确认连接

### 步骤 6：部署合约

1. 在 "Contract" 下拉菜单中选择 `MerchantPullDemo`
2. 点击 "Deploy" 按钮
3. 在钱包中确认交易
4. 等待交易确认（通常几秒到几分钟）

### 步骤 7：获取合约地址

部署成功后：
1. 在 TronIDE 的 "Deployed Contracts" 区域找到你的合约
2. 复制合约地址（以 `T` 开头的地址）
3. **保存这个地址**，这是你的商户代扣合约地址

---

## 三、使用 Remix 部署

### 步骤 1：打开 Remix

访问：https://remix.ethereum.org/

### 步骤 2：安装 TronBox 插件

1. 点击左侧 "Plugin Manager"
2. 搜索 "TronBox"
3. 安装并激活

### 步骤 3：创建合约文件

1. 在 `contracts` 文件夹中创建 `MerchantPullDemo.sol`
2. 复制合约代码

### 步骤 4：编译和部署

1. 编译合约
2. 切换到 "Deploy & Run Transactions"
3. 选择 "TronBox" 环境
4. 选择网络（测试网/主网）
5. 连接钱包并部署

---

## 四、验证部署

部署成功后，你可以：

1. **在区块链浏览器查看**：
   - 测试网：https://nileex.io/
   - 主网：https://tronscan.org/
   - 输入合约地址查看详情

2. **验证合约功能**：
   - 检查 `owner` 地址是否正确（应该是你的钱包地址）
   - 确认合约代码已正确部署

---

## 五、使用部署的合约

部署成功后，在前端页面中：

1. **代幣 (TRC20) 合約地址**：输入你要授权的代币地址（如 USDT）
2. **被授权方（商户合约）**：输入你刚部署的合约地址
3. **授权金额**：输入要授权的金额

---

## 六、注意事项

### 测试网 vs 主网

- **测试网（Nile）**：
  - 免费获取测试 TRX
  - 用于开发和测试
  - 合约地址只在测试网有效

- **主网（Mainnet）**：
  - 需要真实 TRX
  - 用于生产环境
  - 合约地址在主网有效

### 合约选择

- **MerchantPullDemo.sol**：演示版本，允许任何人调用 `charge`（仅用于测试）
- **MerchantPull.sol**：生产版本，仅 owner 可调用（更安全）

### 安全提醒

- 生产环境请使用 `MerchantPull.sol`（仅 owner 可调用）
- 妥善保管 owner 私钥
- 不要在前端暴露 owner 私钥

---

## 七、常见问题

**Q: 部署失败怎么办？**
A: 检查：
- 钱包中是否有足够的 TRX
- 网络连接是否正常
- 编译器版本是否正确

**Q: 如何查看合约 owner？**
A: 在区块链浏览器输入合约地址，查看合约的 `owner` 变量

**Q: 可以修改合约吗？**
A: 合约部署后不可修改。如需修改，需要重新部署新合约。

---

## 八、下一步

部署成功后：
1. 复制合约地址
2. 在前端页面使用该地址作为"被授权方"
3. 开始测试授权和代扣流程
