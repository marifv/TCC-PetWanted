export const GoogleSignin = {
  hasPlayServices: async () => false,
  signIn: async () => ({ type: 'cancelled' }),
};

export const isCancelledResponse = (response) => response.type === 'cancelled';
