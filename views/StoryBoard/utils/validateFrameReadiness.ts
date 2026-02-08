/**
 * 前端首尾帧生成预检校验
 * 
 * 与后端 frameGeneration.js 的 collectReferenceImages 保持一致：
 * - 角色数量 ≤ 1（多角色阻止）
 * - 角色字段完整性：name, description, appearance, personality, image_url
 * - 场景必须存在且字段完整：name, description, environment, lighting, mood, image_url
 */

import { getAuthToken } from '../../../services/auth';

export interface ValidationIssue {
  type: string;
  message: string;
  blocking: boolean; // true = 阻止生成，false = 警告但可继续
}

export interface ValidationResult {
  ready: boolean;
  issues: ValidationIssue[];
  blockingIssues: ValidationIssue[];
  warningIssues: ValidationIssue[];
}

interface CharacterRecord {
  id: number;
  name: string;
  description?: string;
  appearance?: string;
  personality?: string;
  image_url?: string;
}

interface SceneRecord {
  id: number;
  name: string;
  description?: string;
  environment?: string;
  lighting?: string;
  mood?: string;
  image_url?: string;
}

/**
 * 检查字符串字段是否为非空
 */
function isEmptyField(value: unknown): boolean {
  return typeof value !== 'string' || value.trim() === '';
}

/**
 * 校验角色字段完整性
 */
function validateCharacterFields(character: CharacterRecord): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const requiredFields: { key: keyof CharacterRecord; label: string }[] = [
    { key: 'name', label: '名称' },
    { key: 'description', label: '描述' },
    { key: 'appearance', label: '外貌' },
    { key: 'personality', label: '性格' },
    { key: 'image_url', label: '图片' },
  ];

  for (const { key, label } of requiredFields) {
    if (isEmptyField(character[key])) {
      issues.push({
        type: 'character_field_missing',
        message: `角色「${character.name || '未知'}」缺少${label}`,
        blocking: true,
      });
    }
  }

  return issues;
}

/**
 * 校验场景字段完整性
 */
function validateSceneFields(scene: SceneRecord, locationName: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const requiredFields: { key: keyof SceneRecord; label: string }[] = [
    { key: 'name', label: '名称' },
    { key: 'description', label: '描述' },
    { key: 'environment', label: '环境' },
    { key: 'lighting', label: '光照' },
    { key: 'mood', label: '氛围' },
    { key: 'image_url', label: '图片' },
  ];

  for (const { key, label } of requiredFields) {
    if (isEmptyField(scene[key])) {
      issues.push({
        type: 'scene_field_missing',
        message: `场景「${locationName}」缺少${label}`,
        blocking: true,
      });
    }
  }

  return issues;
}

/**
 * 从后端获取指定项目的角色列表
 */
async function fetchProjectCharacters(projectId: number): Promise<CharacterRecord[]> {
  const token = getAuthToken();
  const res = await fetch(`/api/characters/project/${projectId}`, {
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.characters || [];
}

/**
 * 从后端获取指定项目的场景列表
 */
async function fetchProjectScenes(projectId: number, scriptId?: number): Promise<SceneRecord[]> {
  const token = getAuthToken();
  const url = scriptId
    ? `/api/scenes/project/${projectId}?scriptId=${scriptId}`
    : `/api/scenes/project/${projectId}`;
  const res = await fetch(url, {
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.scenes || [];
}

/**
 * 前端首尾帧生成预检
 * 
 * @param projectId  项目 ID
 * @param characters 镜头涉及的角色名数组
 * @param location   镜头涉及的场景名
 * @param scriptId   可选，剧本 ID（用于精确查询场景）
 */
export async function validateFrameReadiness(
  projectId: number,
  characters: string[],
  location: string,
  scriptId?: number
): Promise<ValidationResult> {
  const issues: ValidationIssue[] = [];

  // 1. 角色数量校验：多角色阻止
  if (characters.length > 1) {
    issues.push({
      type: 'too_many_characters',
      message: `当前仅支持单角色镜头，该镜头包含 ${characters.length} 个角色：${characters.join('、')}。请拆分镜头或手动处理。`,
      blocking: true,
    });
  }

  // 2. 场景必须存在
  if (!location || location.trim() === '') {
    issues.push({
      type: 'no_location',
      message: '该镜头未指定场景：首尾帧生成要求必须提供场景',
      blocking: true,
    });
  }

  // 如果有阻止性问题（多角色/无场景），直接返回，无需查询数据库
  const earlyBlocking = issues.filter(i => i.blocking);
  if (earlyBlocking.length > 0) {
    return {
      ready: false,
      issues,
      blockingIssues: earlyBlocking,
      warningIssues: issues.filter(i => !i.blocking),
    };
  }

  // 3. 并行查询角色和场景数据
  const [allCharacters, allScenes] = await Promise.all([
    fetchProjectCharacters(projectId),
    fetchProjectScenes(projectId, scriptId),
  ]);

  // 4. 角色校验（0 或 1 个）
  if (characters.length === 1) {
    const charName = characters[0];
    const charRecord = allCharacters.find(c => c.name === charName);
    if (!charRecord) {
      issues.push({
        type: 'character_not_found',
        message: `角色不存在：${charName}`,
        blocking: true,
      });
    } else {
      issues.push(...validateCharacterFields(charRecord));
    }
  }

  // 5. 场景校验
  if (location && location.trim() !== '') {
    const sceneRecord = allScenes.find(s => s.name === location);
    if (!sceneRecord) {
      issues.push({
        type: 'scene_not_found',
        message: `场景不存在：${location}`,
        blocking: true,
      });
    } else {
      issues.push(...validateSceneFields(sceneRecord, location));
    }
  }

  const blockingIssues = issues.filter(i => i.blocking);
  const warningIssues = issues.filter(i => !i.blocking);

  return {
    ready: blockingIssues.length === 0,
    issues,
    blockingIssues,
    warningIssues,
  };
}

/**
 * 批量帧生成预检：遍历所有分镜，汇总校验问题
 * 
 * @param projectId  项目 ID
 * @param scenes     分镜列表（需包含 characters 和 location）
 * @param scriptId   可选，剧本 ID
 * @returns 汇总的校验结果（去重后的 blocking issues）
 */
export async function validateBatchFrameReadiness(
  projectId: number,
  scenes: { characters: string[]; location: string }[],
  scriptId?: number
): Promise<ValidationResult> {
  const allIssues: ValidationIssue[] = [];

  // 收集所有涉及的角色名和场景名（去重）
  const allCharNames = new Set<string>();
  const allLocations = new Set<string>();
  for (const s of scenes) {
    (s.characters || []).forEach(c => allCharNames.add(c));
    if (s.location?.trim()) allLocations.add(s.location.trim());
  }

  // 一次性查询所有角色和场景
  const [allCharacters, allScenes] = await Promise.all([
    fetchProjectCharacters(projectId),
    fetchProjectScenes(projectId, scriptId),
  ]);

  const charMap = new Map(allCharacters.map(c => [c.name, c]));
  const sceneMap = new Map(allScenes.map(s => [s.name, s]));

  // 校验角色
  const checkedChars = new Set<string>();
  for (const name of allCharNames) {
    if (checkedChars.has(name)) continue;
    checkedChars.add(name);
    const record = charMap.get(name);
    if (!record) {
      allIssues.push({ type: 'character_not_found', message: `角色不存在：${name}`, blocking: true });
    } else {
      allIssues.push(...validateCharacterFields(record));
    }
  }

  // 校验场景
  const checkedScenes = new Set<string>();
  for (const loc of allLocations) {
    if (checkedScenes.has(loc)) continue;
    checkedScenes.add(loc);
    const record = sceneMap.get(loc);
    if (!record) {
      allIssues.push({ type: 'scene_not_found', message: `场景不存在：${loc}`, blocking: true });
    } else {
      allIssues.push(...validateSceneFields(record, loc));
    }
  }

  // 去重（同一条 message 只保留一次）
  const seen = new Set<string>();
  const uniqueIssues = allIssues.filter(i => {
    if (seen.has(i.message)) return false;
    seen.add(i.message);
    return true;
  });

  const blockingIssues = uniqueIssues.filter(i => i.blocking);
  const warningIssues = uniqueIssues.filter(i => !i.blocking);

  return {
    ready: blockingIssues.length === 0,
    issues: uniqueIssues,
    blockingIssues,
    warningIssues,
  };
}

/**
 * 将校验结果格式化为用户可读的消息
 */
export function formatValidationMessage(result: ValidationResult): string {
  if (result.ready) return '';

  const lines: string[] = [];

  if (result.blockingIssues.length > 0) {
    lines.push('❌ 以下问题必须修复后才能生成：');
    result.blockingIssues.forEach(i => lines.push(`  • ${i.message}`));
  }

  if (result.warningIssues.length > 0) {
    lines.push('⚠️ 以下问题可能影响生成效果：');
    result.warningIssues.forEach(i => lines.push(`  • ${i.message}`));
  }

  return lines.join('\n');
}
