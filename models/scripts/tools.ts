import { spawn, exec } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import os from 'os';

export interface ToolResult {
  success: boolean;
  output?: string;
  error?: string;
  files?: string[];
}

export interface FileOperation {
  path: string;
  content?: string;
  operation: 'read' | 'write' | 'delete' | 'list' | 'exists';
}

class ToolExecutor {
  private workspaceDir: string;

  constructor() {
    this.workspaceDir = path.join(os.homedir(), 'NeuralForge', 'workspace');
    this.ensureWorkspace();
  }

  private ensureWorkspace() {
    if (!fs.existsSync(this.workspaceDir)) {
      fs.mkdirSync(this.workspaceDir, { recursive: true });
    }
  }

  async executeCommand(command: string, cwd?: string): Promise<ToolResult> {
    return new Promise((resolve) => {
      const shell = process.platform === 'win32' ? 'powershell.exe' : 'bash';
      const args = process.platform === 'win32' 
        ? ['-Command', command]
        : ['-c', command];

      const proc = spawn(shell, args, { 
        cwd: cwd || this.workspaceDir,
        timeout: 30000 
      });

      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (data) => stdout += data.toString());
      proc.stderr.on('data', (data) => stderr += data.toString());

      proc.on('close', (code) => {
        resolve({
          success: code === 0,
          output: stdout || undefined,
          error: stderr || undefined
        });
      });

      proc.on('error', (err) => {
        resolve({ success: false, error: err.message });
      });
    });
  }

  async fileOperation(op: FileOperation): Promise<ToolResult> {
    try {
      switch (op.operation) {
        case 'read':
          if (!fs.existsSync(op.path)) {
            return { success: false, error: 'File not found' };
          }
          return { success: true, output: fs.readFileSync(op.path, 'utf-8') };

        case 'write':
          const dir = path.dirname(op.path);
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
          }
          fs.writeFileSync(op.path, op.content || '', 'utf-8');
          return { success: true, output: `Written to ${op.path}` };

        case 'delete':
          if (fs.existsSync(op.path)) {
            fs.unlinkSync(op.path);
            return { success: true, output: `Deleted ${op.path}` };
          }
          return { success: false, error: 'File not found' };

        case 'list':
          if (!fs.existsSync(op.path)) {
            return { success: false, error: 'Directory not found' };
          }
          const files = fs.readdirSync(op.path);
          return { success: true, files };

        case 'exists':
          return { success: fs.existsSync(op.path) };

        default:
          return { success: false, error: 'Unknown operation' };
      }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
    }
  }

  async runNode(script: string): Promise<ToolResult> {
    const tempFile = path.join(this.workspaceDir, `temp_${Date.now()}.js`);
    fs.writeFileSync(tempFile, script);
    
    const result = await this.executeCommand(`node "${tempFile}"`);
    
    try { fs.unlinkSync(tempFile); } catch {}
    return result;
  }

  async runPython(script: string): Promise<ToolResult> {
    const tempFile = path.join(this.workspaceDir, `temp_${Date.now()}.py`);
    fs.writeFileSync(tempFile, script);
    
    const result = await this.executeCommand(`python "${tempFile}"`);
    
    try { fs.unlinkSync(tempFile); } catch {}
    return result;
  }

  async gitOperation(args: string[]): Promise<ToolResult> {
    return this.executeCommand(`git ${args.join(' ')}`);
  }

  getWorkspacePath(subpath?: string): string {
    return subpath ? path.join(this.workspaceDir, subpath) : this.workspaceDir;
  }
}

export const tools = new ToolExecutor();