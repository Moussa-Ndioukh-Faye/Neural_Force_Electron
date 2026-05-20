import { spawn } from 'child_process';
import path from 'path';

interface ModelConfig {
  name: string;
  base: string;
  temperature: number;
  contextWindow: number;
}

const MODELS: Record<string, ModelConfig> = {
  'qwen2.5-coder': {
    name: 'qwen2.5-coder',
    base: 'qwen/qwen2.5-coder-7b-instruct',
    temperature: 0.7,
    contextWindow: 128000,
  },
  'codellama': {
    name: 'codellama',
    base: 'codellama/CodeLlama-7b-Instruct',
    temperature: 0.7,
    contextWindow: 16384,
  },
  'deepseek-coder': {
    name: 'deepseek-coder',
    base: 'deepseek-ai/deepseek-coder-6.7b-instruct',
    temperature: 0.7,
    contextWindow: 16384,
  },
  'neuralforge-custom': {
    name: 'neuralforge-custom',
    base: 'qwen2.5-coder',
    temperature: 0.5,
    contextWindow: 128000,
  },
};

async function checkOllama(): Promise<boolean> {
  return new Promise((resolve) => {
    const proc = spawn('ollama', ['--version']);
    proc.on('close', (code) => resolve(code === 0));
    proc.on('error', () => resolve(false));
  });
}

async function listModels(): Promise<string[]> {
  return new Promise((resolve) => {
    const proc = spawn('ollama', ['list']);
    let output = '';
    proc.stdout.on('data', (data) => output += data.toString());
    proc.on('close', () => {
      const models = output
        .split('\n')
        .slice(1)
        .filter(Boolean)
        .map(line => line.split(/\s+/)[0])
        .filter(Boolean);
      resolve(models);
    });
  });
}

async function pullModel(modelName: string): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log(`Pulling model: ${modelName}...`);
    const proc = spawn('ollama', ['pull', modelName]);
    proc.stdout.on('data', (data) => console.log(data.toString()));
    proc.stderr.on('data', (data) => console.log(data.toString()));
    proc.on('close', (code) => code === 0 ? resolve() : reject(new Error(`Failed to pull ${modelName}`)));
  });
}

async function chat(modelName: string, messages: { role: string; content: string }[]): Promise<string> {
  const prompt = messages.map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n');
  
  return new Promise((resolve, reject) => {
    const proc = spawn('ollama', ['run', modelName, prompt]);
    let output = '';
    proc.stdout.on('data', (data) => output += data.toString());
    proc.on('close', (code) => code === 0 ? resolve(output) : reject(new Error('Model failed')));
  });
}

async function createCustomModel(name: string, base: string): Promise<void> {
  const configPath = path.join(process.cwd(), 'models', `${name}.modelfile`);
  const config = `
FROM ${base}

PARAMETER temperature 0.5
PARAMETER top_p 0.9
PARAMETER top_k 40

SYSTEM You are NeuralForge, an AI coding assistant. You help users write, debug, and understand code.
`;
  
  console.log(`Creating custom model: ${name}`);
  console.log(config);
  
  return new Promise((resolve, reject) => {
    const proc = spawn('ollama', ['create', name, '-f', configPath]);
    proc.on('close', (code) => code === 0 ? resolve() : reject(new Error('Failed to create model')));
  });
}

export const modelManager = {
  MODELS,
  checkOllama,
  listModels,
  pullModel,
  chat,
  createCustomModel,
};

export type { ModelConfig };