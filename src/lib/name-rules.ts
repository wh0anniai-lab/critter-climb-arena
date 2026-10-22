export function checkName(name: string, warnings: number) {
  if (warnings >= 3) return { name: '익명', warnings: 3, accepted: true };
  const value = name.trim().slice(0, 10) || '익명';
  const inappropriate = /씨발|시발|ㅅㅂ|병신|ㅂㅅ|개새끼|지랄|fuck|shit|죽어|멍청이/i.test(value.replace(/\s/g, ''));
  if (!inappropriate) return { name: value, warnings, accepted: true };
  const next = warnings + 1;
  return { name: next >= 3 ? '익명' : value, warnings: next, accepted: false };
}