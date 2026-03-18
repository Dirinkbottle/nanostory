const GenerationStartService = require('./services/GenerationStartService');
const GenerationQueryService = require('./services/GenerationQueryService');
const { sendGenerationError } = require('./utils/httpErrors');
const { getOperationContract, getOperationContractByWorkflowType, registerOperationContract } = require('./contracts');
const { toCompatWorkflowInputParams } = require('./utils/workflowParams');

const generationStartService = new GenerationStartService();
const generationQueryService = new GenerationQueryService();

module.exports = {
  generationStartService,
  generationQueryService,
  sendGenerationError,
  getOperationContract,
  getOperationContractByWorkflowType,
  registerOperationContract,
  toCompatWorkflowInputParams
};
