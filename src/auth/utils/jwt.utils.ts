export const getJwtFromHeader = (authorization: string | undefined) => {
  if (authorization && authorization.startsWith('Bearer')) {
    return authorization.substring(7, authorization.length);
  }
};
