export interface ClaudeConfig {
  settings: Record<string, unknown>;
  hooks: HookConfig[];
  skills: SkillConfig[];
  stopHookScript: string | null;
}

export interface HookConfig {
  event: string;
  matcher: string;
  command: string;
}

export interface SkillConfig {
  name: string;
  description: string;
  content: string;
}
