export function generateRoomCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export function isValidRoomCode(code: string): boolean {
  return /^[A-Z0-9]{6}$/.test(code.toUpperCase());
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function generateFileId(): string {
  return `${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

export function getChunkSize(iteration: number): number {
  if (iteration < 5) return 16 * 1024;
  if (iteration < 15) return 32 * 1024;
  return 64 * 1024;
}
