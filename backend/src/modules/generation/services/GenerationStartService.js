const workflowEngine = require('../../workflow');
const { findWorkflowConflict } = require('../../../nosyntask/workflowConflict');
const { validateRequestSchema } = require('../utils/schemaValidator');
const { HttpError, WorkflowConflictError } = require('../utils/httpErrors');
const { getOperationContract, getOperationContractByWorkflowType } = require('../contracts');

class GenerationStartService {
  resolveContract({ operationKey, workflowType }) {
    if (operationKey) {
      return getOperationContract(operationKey);
    }

    if (workflowType) {
      return getOperationContractByWorkflowType(workflowType);
    }

    return null;
  }

  async start({ operationKey = null, workflowType = null, rawInput = {}, actor }) {
    if (!actor?.userId) {
      throw new HttpError(401, '缺少用户身份');
    }

    const contract = this.resolveContract({ operationKey, workflowType });
    if (!contract) {
      return this.startLegacyWorkflow({ workflowType, rawInput, actor });
    }

    const input = validateRequestSchema(contract.requestSchema, rawInput);
    const { scope, resources = {} } = await contract.scopeResolver({
      actor,
      input
    });
    const resolved = await contract.defaultsResolver({
      actor,
      input,
      scope,
      resources
    });
    const jobParams = contract.toJobParams({
      contract,
      actor,
      input,
      scope,
      resources,
      resolved
    });

    const conflictKey = contract.conflictKeyResolver?.({
      actor,
      input,
      scope,
      resources,
      resolved,
      jobParams
    });

    if (conflictKey?.key && conflictKey?.value !== undefined && conflictKey?.value !== null && conflictKey?.value !== '') {
      const conflict = await findWorkflowConflict({
        userId: actor.userId,
        workflowType: contract.workflowType,
        params: {
          [conflictKey.key]: conflictKey.value
        }
      });
      if (conflict) {
        throw new WorkflowConflictError(conflict);
      }
    }

    const result = await workflowEngine.startWorkflow(contract.workflowType, {
      userId: actor.userId,
      projectId: scope.projectId ?? null,
      jobParams
    });
    const response = contract.responseMapper
      ? contract.responseMapper({
          result,
          command: jobParams,
          actor,
          input,
          scope,
          resources,
          resolved
        })
      : null;

    return {
      ...result,
      workflowType: contract.workflowType,
      operationKey: contract.operationKey,
      status: 'pending',
      command: jobParams,
      response
    };
  }

  async startLegacyWorkflow({ workflowType, rawInput, actor }) {
    if (!workflowType) {
      throw new HttpError(400, '缺少 workflowType');
    }

    const projectId = rawInput.projectId;
    if (projectId === undefined || projectId === null || Number.isNaN(Number(projectId))) {
      throw new HttpError(400, 'projectId 必须为数字');
    }

    const conflict = await findWorkflowConflict({
      userId: actor.userId,
      workflowType,
      params: rawInput
    });
    if (conflict) {
      throw new WorkflowConflictError(conflict);
    }

    const result = await workflowEngine.startWorkflow(workflowType, {
      userId: actor.userId,
      projectId: Number(projectId),
      jobParams: rawInput
    });

    return {
      ...result,
      workflowType,
      operationKey: workflowType,
      status: 'pending',
      command: rawInput
    };
  }
}

module.exports = GenerationStartService;
