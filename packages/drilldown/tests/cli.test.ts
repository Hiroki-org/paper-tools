import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { runAction } from '../src/cli.js';

describe('runAction', () => {
    let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
    let processExitSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        processExitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as any);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should catch Error and log its message', async () => {
        const error = new Error('Test error message');
        const fn = vi.fn().mockRejectedValue(error);

        await runAction(fn);

        expect(consoleErrorSpy).toHaveBeenCalledWith('Error:', 'Test error message');
        expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('should catch non-Error and log it directly', async () => {
        const error = 'String error';
        const fn = vi.fn().mockRejectedValue(error);

        await runAction(fn);

        expect(consoleErrorSpy).toHaveBeenCalledWith('Error:', 'String error');
        expect(processExitSpy).toHaveBeenCalledWith(1);
    });
});
