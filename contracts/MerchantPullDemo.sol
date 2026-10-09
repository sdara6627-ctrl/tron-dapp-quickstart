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
