const OperationContractRegistry = require('./OperationContractRegistry');
const { operationContracts } = require('./definitions');

const operationContractRegistry = new OperationContractRegistry(operationContracts);

module.exports = {
  operationContractRegistry,
  registerOperationContract: contract => operationContractRegistry.registerOperationContract(contract),
  getOperationContract: operationKey => operationContractRegistry.getOperationContract(operationKey),
  getOperationContractByWorkflowType: workflowType =>
    operationContractRegistry.getOperationContractByWorkflowType(workflowType)
};
