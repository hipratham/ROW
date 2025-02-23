export const generateKey = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let key = '';
  for (let i = 0; i < 7; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return key;
};
