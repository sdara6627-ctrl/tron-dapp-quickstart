// SPDX-License-Identifier: MIT
// 商户代扣合约示例：用户对本合约 approve 后，合约 owner 可调用 charge 将用户 TRC20 划转到 owner 账户。
// 部署后：用户在前端「授权 TRC20」里对「本合约地址」授权；你的后端用 owner 私钥调用 charge(user, amount) 即可划转。

pragma solidity ^0.8.0;

interface ITRC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

contract MerchantPull {
    address public owner;

    constructor() {
        owner = msg.sender;
    }

    /**
     * 从用户账户划转 TRC20 到 owner（商户）账户。
     * 调用前用户必须已对本合约 approve(token, amount)。
     * 仅 owner 可调用。
     */
    function charge(address token, address user, uint256 amount) external {
        require(msg.sender == owner, "MerchantPull: only owner");
        require(ITRC20(token).transferFrom(user, owner, amount), "MerchantPull: transfer failed");
    }
}
