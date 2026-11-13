/**
 * 子 DSH 的审批接管：本机（子）Agent 触发 `approval/request` 时，
 * 通过 dsh-cow 的远端提问通道转给直接上级（主 DSH）决定，再以审批结果返回。
 *
 * 只接管「由上级委派的任务会话」里的审批：本机自己的会话仍交给本机 answerer，
 * 避免把本地操作也发到远端。上级不可达或超时返回 unavailable（fail-closed）。
 */

const APPROVE = /^(允许|同意|approve|allow)/i;
const DENY = /^(拒绝|deny|reject|no)/i;

export function registerApprovalTakeover({ ctx, askQuestion, taskIdForSession, hasParent, timeoutSec = 300, logger = console }) {
  if (typeof ctx?.on !== 'function' || typeof askQuestion !== 'function') return () => {};
  const dispose = ctx.on('approval/request', async (req, next) => {
    try {
      if (!hasParent?.()) return await next();
      const sessionId = req?.agent?.session?.id ?? req?.agent?.session?.sessionId ?? '';
      const taskId = taskIdForSession?.(sessionId) ?? '';

      const tool = String(req?.toolName ?? 'tool');
      const reason = String(req?.reason ?? '').trim();
      const question = `子 DSH 请求审批：${tool}${reason ? `（${reason}）` : ''}`;
      const options = ['允许一次', '拒绝'];
      if (req?.signal?.aborted) return 'unavailable';
      const aborted = new Promise((resolve) => {
        if (!req?.signal) return;
        if (req.signal.aborted) resolve({ ok: false, error: 'cancelled' });
        else req.signal.addEventListener('abort', () => resolve({ ok: false, error: 'cancelled' }), { once: true });
      });
      const result = await Promise.race([
        askQuestion({ taskId, question, options, timeoutSec }),
        aborted,
      ]);
      if (!result?.ok) {
        logger.warn?.(`[dsh-cow] 审批未获上级回答：${result?.error ?? 'unknown'}`);
        return 'unavailable';
      }
      const answer = String(result.answer ?? '');
      if (APPROVE.test(answer)) return 'allowed-once';
      if (DENY.test(answer)) return 'rejected';
      logger.warn?.(`[dsh-cow] 上级审批回答无法识别：${answer.slice(0, 80)}`);
      return 'unavailable';
    } catch (error) {
      logger.warn?.(`[dsh-cow] 审批接管失败：${error?.message ?? error}`);
      return 'unavailable';
    }
  });
  return typeof dispose === 'function' ? dispose : () => {};
}
