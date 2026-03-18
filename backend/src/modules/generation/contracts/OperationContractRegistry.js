class OperationContractRegistry {
  constructor(contracts = []) {
    this.byOperationKey = new Map();
    this.byWorkflowType = new Map();
    contracts.forEach(contract => this.registerOperationContract(contract));
  }

  registerOperationContract(contract) {
    if (!contract?.operationKey || !contract?.workflowType) {
      throw new Error('operation contract 缺少 operationKey 或 workflowType');
    }

    this.byOperationKey.set(contract.operationKey, contract);
    this.byWorkflowType.set(contract.workflowType, contract);
    return contract;
  }

  getOperationContract(operationKey) {
    return this.byOperationKey.get(operationKey) || null;
  }

  getOperationContractByWorkflowType(workflowType) {
    return this.byWorkflowType.get(workflowType) || null;
  }
}

module.exports = OperationContractRegistry;
