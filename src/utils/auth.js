export function isLoggedIn() {
  return localStorage.getItem('skylove_auth') === 'true'
}
