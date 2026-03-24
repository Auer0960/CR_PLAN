/**
 * 行級 diff：只回傳有變更的行（removed / added），省略未變更行。
 * 用於修改紀錄的智慧顯示，避免「大家來找碴」。
 */
export type DiffLine = { type: 'removed' | 'added'; text: string };

/**
 * 使用 LCS 找出 before/after 的差異，只回傳 removed 和 added 行。
 * 若 before 或 after 為空，則全部視為 added 或 removed。
 */
export function computeLineDiff(before: string | undefined | null, after: string | undefined | null): DiffLine[] {
  const bLines = (before ?? '').split('\n');
  const aLines = (after ?? '').split('\n');

  if (bLines.length === 0 && aLines.length === 0) return [];
  if (bLines.length === 0) {
    return aLines.map(t => ({ type: 'added' as const, text: t }));
  }
  if (aLines.length === 0) {
    return bLines.map(t => ({ type: 'removed' as const, text: t }));
  }

  // LCS 長度表
  const m = bLines.length;
  const n = aLines.length;
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (bLines[i - 1] === aLines[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // 回溯取得 LCS 對應
  const result: DiffLine[] = [];
  let i = m, j = n;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && bLines[i - 1] === aLines[j - 1]) {
      // 相同行，跳過（不輸出）
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.unshift({ type: 'added', text: aLines[j - 1] });
      j--;
    } else {
      result.unshift({ type: 'removed', text: bLines[i - 1] });
      i--;
    }
  }

  return result;
}
